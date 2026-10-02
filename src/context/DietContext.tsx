import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import {
  FoodItem,
  UserProfile,
  PersonalFoodMemory,
  MealType,
  WeightEntry,
  MetabolicState,
  ComponentFoodItem,
  CalorieShiftSchedule,
} from '../types/diet';
import { calculateSmoothedWeights, calculateDynamicExpenditure, balanceWeeklyCalorieSchedule } from '../lib/metabolicEngine';
import { SAMPLE_MEAL_TEMPLATES, buildComponentFromUsda, createCalibratedFoodItem } from '../data/usdaDatabase';

interface DietContextType {
  meals: FoodItem[];
  userProfile: UserProfile;
  foodMemories: PersonalFoodMemory[];
  weightEntries: WeightEntry[];
  smoothedWeights: WeightEntry[];
  metabolicState: MetabolicState;
  stagedBasket: ComponentFoodItem[];
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  addMeal: (meal: FoodItem) => Promise<void>;
  updateMeal: (meal: FoodItem) => Promise<void>;
  deleteMeal: (id: string) => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addWeightEntry: (weightKg: number, date?: string) => Promise<void>;
  deleteWeightEntry: (id: string) => Promise<void>;
  addToStagedBasket: (item: ComponentFoodItem) => void;
  removeFromStagedBasket: (id: string) => void;
  updateStagedItemGrams: (id: string, grams: number) => void;
  clearStagedBasket: () => void;
  logStagedBasketAsMeal: (mealName: string, mealType: MealType, imageUrl?: string) => Promise<FoodItem>;
  findFoodMemoryMatch: (nameOrComponents: string) => PersonalFoodMemory | null;
  logMemoryMatch: (memory: PersonalFoodMemory, mealType?: MealType) => Promise<FoodItem>;
  isSyncing: boolean;
}

const DEFAULT_SCHEDULE: CalorieShiftSchedule = {
  monday: 2100,
  tuesday: 2100,
  wednesday: 2100,
  thursday: 2100,
  friday: 2300,
  saturday: 2300,
  sunday: 2100,
};

const DEFAULT_PROFILE: UserProfile = {
  id: 'default_user',
  weightKg: 78.5,
  heightCm: 178,
  targetWeightKg: 72,
  dietaryStyle: 'High Protein',
  targetCalories: 2150,
  targetProtein: 165,
  targetCarbs: 195,
  targetFat: 65,
  waterGoalGlasses: 8,
  goal: 'Fat Loss',
  programMode: 'Coached',
  currentTdee: 2420,
  weeklyShiftSchedule: DEFAULT_SCHEDULE,
};

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// Generate realistic seed weigh-ins for metabolic demonstration
function generateSeedWeights(): WeightEntry[] {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const rawValues = [78.6, 78.4, 78.9, 78.2, 78.0, 77.8, 78.1, 77.7, 77.5, 77.6, 77.3, 77.1, 77.4, 76.9];

  return rawValues.map((w, idx) => {
    const timestamp = now - (14 - idx) * DAY_MS;
    const date = new Date(timestamp).toISOString().split('T')[0];
    return {
      id: `w-${date}`,
      date,
      weightKg: w,
      timestamp,
    };
  });
}

function generateSeedMeals(): FoodItem[] {
  const today = getTodayDateString();
  const breakfastTemplate = SAMPLE_MEAL_TEMPLATES[1]; // Avocado Sourdough & Poached Eggs
  const lunchTemplate = SAMPLE_MEAL_TEMPLATES[3]; // Lean Grilled Chicken & Brown Rice Bowl

  const breakfastComponents = breakfastTemplate.components
    .map(c => buildComponentFromUsda(c.itemRefId, c.grams, c.evidenceClass, c.notes))
    .filter(Boolean) as ComponentFoodItem[];

  const lunchComponents = lunchTemplate.components
    .map(c => buildComponentFromUsda(c.itemRefId, c.grams, c.evidenceClass, c.notes))
    .filter(Boolean) as ComponentFoodItem[];

  const m1 = createCalibratedFoodItem(
    breakfastTemplate.name,
    breakfastTemplate.mealType,
    breakfastComponents,
    breakfastTemplate.imageUrl
  );
  m1.date = today;
  m1.timestamp = Date.now() - 4 * 3600 * 1000;

  const m2 = createCalibratedFoodItem(
    lunchTemplate.name,
    lunchTemplate.mealType,
    lunchComponents,
    lunchTemplate.imageUrl
  );
  m2.date = today;
  m2.timestamp = Date.now() - 1 * 3600 * 1000;

  return [m1, m2];
}

const DietContext = createContext<DietContextType | undefined>(undefined);

export const DietProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [meals, setMeals] = useState<FoodItem[]>(() => {
    try {
      const localMeals = localStorage.getItem('vibediet_meals');
      if (localMeals) {
        const parsed = JSON.parse(localMeals);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const today = getTodayDateString();
          const hasTodayMeal = parsed.some((m: FoodItem) => m.date === today);
          if (hasTodayMeal) {
            return parsed;
          } else {
            return [...generateSeedMeals(), ...parsed];
          }
        }
      }
    } catch (e) {}
    return generateSeedMeals();
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [foodMemories, setFoodMemories] = useState<PersonalFoodMemory[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>(() => {
    try {
      const saved = localStorage.getItem('vibediet_weights');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return generateSeedWeights();
  });
  const [stagedBasket, setStagedBasket] = useState<ComponentFoodItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Compute EWMA smoothed weights
  const smoothedWeights = calculateSmoothedWeights(weightEntries);

  // Compute dynamic metabolic expenditure (TDEE)
  const dailyIntakeSummary = meals.map(m => ({ date: m.date, calories: m.calories }));
  const metabolicState = calculateDynamicExpenditure(smoothedWeights, dailyIntakeSummary, userProfile.currentTdee || 2420);

  // Sync from localStorage
  useEffect(() => {
    try {
      const localProfile = localStorage.getItem('vibediet_profile');
      if (localProfile) setUserProfile(JSON.parse(localProfile));

      const localMemories = localStorage.getItem('vibediet_memories');
      if (localMemories) setFoodMemories(JSON.parse(localMemories));
    } catch (e) {
      console.error('Error reading localStorage cache:', e);
    }
  }, []);

  // Save meals locally
  useEffect(() => {
    try {
      localStorage.setItem('vibediet_meals', JSON.stringify(meals));
    } catch (e) {}
  }, [meals]);

  // Save weights locally
  useEffect(() => {
    try {
      localStorage.setItem('vibediet_weights', JSON.stringify(weightEntries));
    } catch (e) {}
  }, [weightEntries]);

  // Sync meals and weights from Firestore in real-time
  useEffect(() => {
    if (!user) return;

    setIsSyncing(true);
    const mealsQuery = query(collection(db, 'meals'), where('userId', '==', user.uid));
    const unsubMeals = onSnapshot(
      mealsQuery,
      (snapshot) => {
        const fetched: FoodItem[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as FoodItem);
        });
        fetched.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setMeals(fetched);
        setIsSyncing(false);
        try {
          localStorage.setItem('vibediet_meals', JSON.stringify(fetched));
        } catch (e) {}
      },
      (err) => {
        console.warn('Meals Firestore listener:', err.message);
        setIsSyncing(false);
      }
    );

    // Profile listener
    const userDocRef = doc(db, 'users', user.uid);
    const unsubProfile = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        setUserProfile((prev) => ({ ...prev, ...(snap.data() as UserProfile) }));
      }
    });

    return () => {
      unsubMeals();
      unsubProfile();
    };
  }, [user]);

  // Food Plate Staging Basket methods
  const addToStagedBasket = (item: ComponentFoodItem) => {
    setStagedBasket(prev => [...prev, item]);
  };

  const removeFromStagedBasket = (id: string) => {
    setStagedBasket(prev => prev.filter(item => item.id !== id));
  };

  const updateStagedItemGrams = (id: string, grams: number) => {
    const safeGrams = Math.max(1, grams);
    setStagedBasket(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const ratio = safeGrams / (item.grams || 1);
        return {
          ...item,
          grams: safeGrams,
          calories: Math.round(item.calories * ratio),
          protein: Math.round(item.protein * ratio * 10) / 10,
          carbs: Math.round(item.carbs * ratio * 10) / 10,
          fat: Math.round(item.fat * ratio * 10) / 10,
          evidenceClass: 'user_confirmed',
        };
      })
    );
  };

  const clearStagedBasket = () => {
    setStagedBasket([]);
  };

  const logStagedBasketAsMeal = async (
    mealName: string,
    mealType: MealType,
    imageUrl?: string
  ): Promise<FoodItem> => {
    const today = getTodayDateString();
    const rawCalories = stagedBasket.reduce((sum, c) => sum + c.calories, 0);
    const protein = Math.round(stagedBasket.reduce((sum, c) => sum + c.protein, 0) * 10) / 10;
    const carbs = Math.round(stagedBasket.reduce((sum, c) => sum + c.carbs, 0) * 10) / 10;
    const fat = Math.round(stagedBasket.reduce((sum, c) => sum + c.fat, 0) * 10) / 10;
    const unobsCount = stagedBasket.filter(c => c.evidenceClass === 'unobservable_unknown').length;

    const newMeal: FoodItem = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.uid || 'guest',
      name: mealName.trim() || 'Staged Meal Plate',
      mealType,
      calories: rawCalories,
      minCalories: Math.round(rawCalories * 0.88),
      maxCalories: Math.round(rawCalories * 1.15),
      protein,
      carbs,
      fat,
      evidenceClassCounts: {
        visible: stagedBasket.filter(c => c.evidenceClass === 'visible').length,
        context_derived: stagedBasket.filter(c => c.evidenceClass === 'context_derived').length,
        user_confirmed: stagedBasket.filter(c => c.evidenceClass === 'user_confirmed').length,
        unobservable_unknown: unobsCount,
      },
      hasUnobservableUnknown: unobsCount > 0,
      nutritionSource: stagedBasket[0]?.nutritionSource || 'USDA',
      confidence: 0.96,
      foods: stagedBasket,
      imageUrl,
      timestamp: Date.now(),
      date: today,
    };

    await addMeal(newMeal);
    clearStagedBasket();
    return newMeal;
  };

  // Add Weigh-in
  const addWeightEntry = async (weightKg: number, dateStr = getTodayDateString()) => {
    const newEntry: WeightEntry = {
      id: `w-${dateStr}-${Date.now()}`,
      userId: user?.uid,
      date: dateStr,
      weightKg: Math.round(weightKg * 10) / 10,
      timestamp: new Date(`${dateStr}T08:00:00`).getTime(),
    };

    setWeightEntries(prev => {
      // replace if same day or append
      const filtered = prev.filter(w => w.date !== dateStr);
      return [...filtered, newEntry];
    });

    if (user && db) {
      try {
        const ref = doc(db, 'weights', newEntry.id);
        await setDoc(ref, newEntry);
      } catch (e) {}
    }
  };

  const deleteWeightEntry = async (id: string) => {
    setWeightEntries(prev => prev.filter(w => w.id !== id));
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'weights', id));
      } catch (e) {}
    }
  };

  // Food Memory (Phase 4)
  const findFoodMemoryMatch = (nameOrComponents: string): PersonalFoodMemory | null => {
    const q = nameOrComponents.toLowerCase().trim();
    if (!q || q.length < 3) return null;

    return (
      foodMemories.find((mem) => {
        const memName = mem.name.toLowerCase();
        return (
          memName.includes(q) ||
          q.includes(memName) ||
          mem.signature.toLowerCase().includes(q)
        );
      }) || null
    );
  };

  const logMemoryMatch = async (memory: PersonalFoodMemory, mealType: MealType = 'Lunch'): Promise<FoodItem> => {
    const today = getTodayDateString();
    const newMeal: FoodItem = {
      id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.uid,
      name: memory.name,
      mealType,
      calories: memory.calories,
      minCalories: Math.round(memory.calories * 0.9),
      maxCalories: Math.round(memory.calories * 1.12),
      protein: memory.protein,
      carbs: memory.carbs,
      fat: memory.fat,
      evidenceClassCounts: {
        visible: memory.components.filter(c => c.evidenceClass === 'visible').length,
        context_derived: memory.components.filter(c => c.evidenceClass === 'context_derived').length,
        user_confirmed: memory.components.length,
        unobservable_unknown: 0,
      },
      hasUnobservableUnknown: false,
      nutritionSource: 'LOCAL_FALLBACK',
      confidence: 0.98,
      foods: memory.components.map(c => ({ ...c, evidenceClass: 'user_confirmed' })),
      timestamp: Date.now(),
      date: today,
    };

    await addMeal(newMeal);
    return newMeal;
  };

  const addMeal = async (meal: FoodItem) => {
    const mealWithUser: FoodItem = {
      ...meal,
      userId: user?.uid || 'guest',
      date: meal.date || new Date(meal.timestamp).toISOString().split('T')[0],
    };

    setMeals(prev => [mealWithUser, ...prev]);

    // Update food memories
    const newMemory: PersonalFoodMemory = {
      id: `mem-${meal.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: meal.name,
      mealType: meal.mealType,
      signature: meal.foods.map(f => f.name.toLowerCase()).join(' '),
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      components: meal.foods,
      confirmedCount: 1,
      lastConfirmedTimestamp: Date.now(),
    };

    setFoodMemories(prev => {
      const idx = prev.findIndex(m => m.name.toLowerCase() === meal.name.toLowerCase());
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          confirmedCount: updated[idx].confirmedCount + 1,
          lastConfirmedTimestamp: Date.now(),
        };
        return updated;
      }
      return [newMemory, ...prev.slice(0, 49)];
    });

    try {
      localStorage.setItem('vibediet_meals', JSON.stringify([mealWithUser, ...meals]));
    } catch (e) {}

    if (user && db) {
      try {
        const mealDocRef = doc(db, 'meals', mealWithUser.id);
        await setDoc(mealDocRef, {
          ...mealWithUser,
          createdAt: serverTimestamp(),
        });
      } catch (err: any) {
        console.error('Firestore save meal error:', err);
      }
    }
  };

  const updateMeal = async (updatedMeal: FoodItem) => {
    setMeals(prev => prev.map(m => (m.id === updatedMeal.id ? updatedMeal : m)));
    if (user && db) {
      try {
        const mealDocRef = doc(db, 'meals', updatedMeal.id);
        await setDoc(mealDocRef, updatedMeal, { merge: true });
      } catch (e) {}
    }
  };

  const deleteMeal = async (id: string) => {
    setMeals(prev => prev.filter(m => m.id !== id));
    if (user && db) {
      try {
        await deleteDoc(doc(db, 'meals', id));
      } catch (e) {}
    }
  };

  const updateProfile = async (partial: Partial<UserProfile>) => {
    const updated = { ...userProfile, ...partial };
    setUserProfile(updated);
    try {
      localStorage.setItem('vibediet_profile', JSON.stringify(updated));
    } catch (e) {}
    if (user && db) {
      try {
        await setDoc(doc(db, 'users', user.uid), updated, { merge: true });
      } catch (e) {}
    }
  };

  return (
    <DietContext.Provider
      value={{
        meals,
        userProfile,
        foodMemories,
        weightEntries,
        smoothedWeights,
        metabolicState,
        stagedBasket,
        selectedDate,
        setSelectedDate,
        addMeal,
        updateMeal,
        deleteMeal,
        updateProfile,
        addWeightEntry,
        deleteWeightEntry,
        addToStagedBasket,
        removeFromStagedBasket,
        updateStagedItemGrams,
        clearStagedBasket,
        logStagedBasketAsMeal,
        findFoodMemoryMatch,
        logMemoryMatch,
        isSyncing,
      }}
    >
      {children}
    </DietContext.Provider>
  );
};

export function useDiet(): DietContextType {
  const context = useContext(DietContext);
  if (!context) {
    throw new Error('useDiet must be used within a DietProvider');
  }
  return context;
}
