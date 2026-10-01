export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type EvidenceClass = 
  | 'visible'               // Direct line-of-sight ingredient (e.g. broccoli florets)
  | 'context_derived'      // Inferred preparation method (e.g. simmered curry base)
  | 'user_confirmed'       // Manually verified or edited by user
  | 'unobservable_unknown'; // Hidden cooking fats, seed oils, dressings, void space

export type NutritionSource = 
  | 'USDA' 
  | 'OPEN_FOOD_FACTS' 
  | 'LOCAL_FALLBACK' 
  | 'GEMINI_ESTIMATE';

export interface MassDistribution {
  p10: number; // 10th percentile lower bound in grams
  p50: number; // 50th percentile median expected mass in grams
  p90: number; // 90th percentile upper bound in grams
  unit: 'g' | 'ml';
}

export interface ClarifyingQuestionOption {
  label: string;
  massMultiplier?: number;
  fatDeltaGrams?: number;
  calorieDelta?: number;
  description?: string;
}

export interface ClarifyingQuestion {
  id: string;
  question: string;
  targetComponentId?: string;
  options: ClarifyingQuestionOption[];
  selectedOptionIndex?: number;
  impactDescription: string;
}

export interface AtwaterDiagnostic {
  canonicalCalories: number; // From verified database or estimate - ALWAYS canonical
  atwaterCalculatedCalories: number; // 4P + 4C + 9F
  deltaCalories: number;
  deltaPercentage: number;
  status: 'concordant' | 'minor_discrepancy' | 'thermodynamic_variance';
  diagnosticNote: string;
}

export interface AtwaterValidationResult {
  reportedCalories: number;
  atwaterCalories: number; // 4*protein + 4*carbs + 9*fat
  deltaCalories: number;
  discrepancyPercentage: number;
  isUnreliable: boolean; // Flagged true if discrepancy exceeds 10%
  status: 'reliable' | 'unreliable';
  warningMessage?: string;
  calibratedCalories: number; // Expected Atwater calories (4P + 4C + 9F)
}

export interface ComponentFoodItem {
  id: string;
  name: string;
  mass: MassDistribution;
  grams: number; // Active confirmed mass (defaults to p50)
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium_mg?: number;
  servingDescription?: string;
  evidenceClass: EvidenceClass;
  nutritionSource: NutritionSource;
  confidence: number; // 0.0 - 1.0
  uncertaintyNote?: string;
  referencePortionBenchmark?: string; // e.g. "Deck of cards (~150g)"
  atwaterValidation?: AtwaterValidationResult;
  isUnreliable?: boolean;
}

export interface FoodItem {
  id: string;
  userId?: string;
  name: string;
  mealType: MealType;
  calories: number;
  minCalories: number; // p10 sum
  maxCalories: number; // p90 sum
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium_mg?: number;
  evidenceClassCounts: {
    visible: number;
    context_derived: number;
    user_confirmed: number;
    unobservable_unknown: number;
  };
  hasUnobservableUnknown: boolean;
  nutritionSource: NutritionSource;
  confidence: number;
  foods: ComponentFoodItem[];
  clarifyingQuestions?: ClarifyingQuestion[];
  atwaterDiagnostic?: AtwaterDiagnostic;
  atwaterValidation?: AtwaterValidationResult;
  isUnreliable?: boolean;
  imageUrl?: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
}

export interface WeightEntry {
  id: string;
  userId?: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  smoothedWeightKg?: number;
  timestamp: number;
}

export interface MetabolicState {
  currentTdee: number;
  trendWeightKg: number;
  weightVelocity7dKg: number;
  dailyExpenditureTrend: number;
  lastRecalculated: number;
  adherenceNeutralFeedback: string;
}

export interface CalorieShiftSchedule {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;
  isAnonymous?: boolean;
  weightKg?: number;
  heightCm?: number;
  targetWeightKg?: number;
  dietaryStyle?: 'Balanced' | 'High Protein' | 'Keto' | 'Low Carb';
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  waterGoalGlasses: number;
  goal: 'Fat Loss' | 'Lean Muscle' | 'Maintenance';
  programMode: 'Coached' | 'Collaborative' | 'Manual';
  currentTdee?: number;
  weeklyShiftSchedule?: CalorieShiftSchedule;
}

export interface PersonalFoodMemory {
  id: string;
  name: string;
  mealType: MealType;
  signature: string; // Component hash / keyword string for similarity match
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  components: ComponentFoodItem[];
  confirmedCount: number;
  lastConfirmedTimestamp: number;
}
