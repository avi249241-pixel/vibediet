import { ComponentFoodItem, FoodItem, MealType, EvidenceClass, NutritionSource } from '../types/diet';
import { calibrateMealWithAtwater, calculateNutritionalGrade } from '../utils/atwater';

export interface UsdaReferenceItem {
  id: string;
  name: string;
  category: 'protein' | 'carb' | 'fat' | 'vegetable' | 'fruit' | 'dairy' | 'prepared' | 'junk';
  servingGrams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  densityScore: number; // 1 - 10
  isJunk: boolean;
  defaultEvidence: 'visible' | 'context_derived' | 'unobservable';
  keywords: string[];
}

export const USDA_REFERENCE_DATABASE: UsdaReferenceItem[] = [
  // Lean Proteins
  {
    id: 'usda-chicken-breast',
    name: 'Grilled Chicken Breast',
    category: 'protein',
    servingGrams: 150,
    caloriesPer100g: 165,
    proteinPer100g: 31.0,
    carbsPer100g: 0.0,
    fatPer100g: 3.6,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['chicken', 'breast', 'poultry', 'meat', 'grilled chicken', 'baked chicken']
  },
  {
    id: 'usda-salmon-fillet',
    name: 'Atlantic Salmon Fillet',
    category: 'protein',
    servingGrams: 150,
    caloriesPer100g: 206,
    proteinPer100g: 22.0,
    carbsPer100g: 0.0,
    fatPer100g: 12.3,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['salmon', 'fish', 'seafood', 'fillet', 'omega3', 'pan seared salmon']
  },
  {
    id: 'usda-sirloin-steak',
    name: 'Lean Sirloin Beef Steak',
    category: 'protein',
    servingGrams: 180,
    caloriesPer100g: 214,
    proteinPer100g: 26.0,
    carbsPer100g: 0.0,
    fatPer100g: 11.8,
    fiberPer100g: 0.0,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['steak', 'beef', 'sirloin', 'red meat', 'meat', 'grilled steak', 'ribeye']
  },
  {
    id: 'usda-boiled-egg',
    name: 'Whole Large Egg',
    category: 'protein',
    servingGrams: 50,
    caloriesPer100g: 143,
    proteinPer100g: 12.6,
    carbsPer100g: 0.7,
    fatPer100g: 9.5,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['egg', 'eggs', 'poached egg', 'boiled egg', 'scrambled egg', 'fried egg']
  },
  {
    id: 'usda-egg-white',
    name: 'Egg Whites',
    category: 'protein',
    servingGrams: 100,
    caloriesPer100g: 52,
    proteinPer100g: 10.9,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['egg white', 'egg whites', 'whites']
  },
  {
    id: 'usda-greek-yogurt',
    name: 'Nonfat Plain Greek Yogurt',
    category: 'dairy',
    servingGrams: 170,
    caloriesPer100g: 59,
    proteinPer100g: 10.2,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['yogurt', 'greek yogurt', 'dairy', 'curd']
  },
  {
    id: 'usda-tofu-firm',
    name: 'Firm Tofu',
    category: 'protein',
    servingGrams: 120,
    caloriesPer100g: 83,
    proteinPer100g: 10.0,
    carbsPer100g: 2.3,
    fatPer100g: 5.3,
    fiberPer100g: 1.0,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['tofu', 'soy', 'bean curd', 'vegan protein']
  },
  {
    id: 'usda-tuna-canned',
    name: 'Yellowfin Tuna Steak',
    category: 'protein',
    servingGrams: 140,
    caloriesPer100g: 130,
    proteinPer100g: 28.0,
    carbsPer100g: 0.0,
    fatPer100g: 1.0,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['tuna', 'canned tuna', 'fish', 'seafood']
  },
  {
    id: 'usda-shrimp',
    name: 'Steamed White Shrimp',
    category: 'protein',
    servingGrams: 120,
    caloriesPer100g: 99,
    proteinPer100g: 24.0,
    carbsPer100g: 0.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['shrimp', 'prawn', 'seafood', 'grilled shrimp']
  },

  // Complex Carbs & Whole Grains
  {
    id: 'usda-brown-rice',
    name: 'Cooked Brown Rice',
    category: 'carb',
    servingGrams: 150,
    caloriesPer100g: 123,
    proteinPer100g: 2.7,
    carbsPer100g: 25.6,
    fatPer100g: 1.0,
    fiberPer100g: 1.6,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['brown rice', 'rice', 'grain', 'whole grain']
  },
  {
    id: 'usda-white-rice',
    name: 'Cooked Jasmine White Rice',
    category: 'carb',
    servingGrams: 150,
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28.2,
    fatPer100g: 0.3,
    fiberPer100g: 0.4,
    densityScore: 6,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['white rice', 'rice', 'jasmine rice', 'basmati']
  },
  {
    id: 'usda-quinoa',
    name: 'Cooked Quinoa',
    category: 'carb',
    servingGrams: 140,
    caloriesPer100g: 120,
    proteinPer100g: 4.4,
    carbsPer100g: 21.3,
    fatPer100g: 1.9,
    fiberPer100g: 2.8,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['quinoa', 'grain', 'ancient grain', 'salad base']
  },
  {
    id: 'usda-oats',
    name: 'Rolled Oats (Dry)',
    category: 'carb',
    servingGrams: 50,
    caloriesPer100g: 379,
    proteinPer100g: 13.2,
    carbsPer100g: 67.7,
    fatPer100g: 6.5,
    fiberPer100g: 10.1,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['oats', 'oatmeal', 'porridge', 'rolled oats']
  },
  {
    id: 'usda-sweet-potato',
    name: 'Roasted Sweet Potato',
    category: 'carb',
    servingGrams: 150,
    caloriesPer100g: 90,
    proteinPer100g: 2.0,
    carbsPer100g: 20.7,
    fatPer100g: 0.1,
    fiberPer100g: 3.3,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['sweet potato', 'yam', 'potato', 'roasted potato']
  },
  {
    id: 'usda-sourdough',
    name: 'Artisan Sourdough Toast',
    category: 'carb',
    servingGrams: 60,
    caloriesPer100g: 245,
    proteinPer100g: 9.0,
    carbsPer100g: 48.0,
    fatPer100g: 1.2,
    fiberPer100g: 2.4,
    densityScore: 7,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['toast', 'sourdough', 'bread', 'slice']
  },
  {
    id: 'usda-black-beans',
    name: 'Cooked Black Beans',
    category: 'carb',
    servingGrams: 130,
    caloriesPer100g: 132,
    proteinPer100g: 8.9,
    carbsPer100g: 23.7,
    fatPer100g: 0.5,
    fiberPer100g: 8.7,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['beans', 'black beans', 'legumes', 'pulses']
  },

  // Vegetables & Greens
  {
    id: 'usda-broccoli',
    name: 'Steamed Broccoli Florets',
    category: 'vegetable',
    servingGrams: 120,
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    carbsPer100g: 7.2,
    fatPer100g: 0.4,
    fiberPer100g: 2.6,
    densityScore: 10,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['broccoli', 'florets', 'greens', 'cruciferous', 'vegetable', 'steamed broccoli']
  },
  {
    id: 'usda-asparagus',
    name: 'Roasted Green Asparagus',
    category: 'vegetable',
    servingGrams: 100,
    caloriesPer100g: 22,
    proteinPer100g: 2.4,
    carbsPer100g: 4.1,
    fatPer100g: 0.2,
    fiberPer100g: 2.0,
    densityScore: 10,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['asparagus', 'spears', 'vegetable', 'greens']
  },
  {
    id: 'usda-spinach',
    name: 'Fresh Baby Spinach',
    category: 'vegetable',
    servingGrams: 80,
    caloriesPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    fiberPer100g: 2.2,
    densityScore: 10,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['spinach', 'baby spinach', 'greens', 'salad', 'leaves']
  },
  {
    id: 'usda-mixed-salad',
    name: 'Mixed Garden Salad Greens',
    category: 'vegetable',
    servingGrams: 100,
    caloriesPer100g: 17,
    proteinPer100g: 1.5,
    carbsPer100g: 3.3,
    fatPer100g: 0.2,
    fiberPer100g: 1.8,
    densityScore: 10,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['salad', 'greens', 'lettuce', 'arugula', 'mixed greens']
  },
  {
    id: 'usda-bell-peppers',
    name: 'Sliced Bell Peppers (Red/Yellow)',
    category: 'vegetable',
    servingGrams: 90,
    caloriesPer100g: 31,
    proteinPer100g: 1.0,
    carbsPer100g: 6.0,
    fatPer100g: 0.3,
    fiberPer100g: 2.1,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['bell pepper', 'peppers', 'capsicum', 'red pepper']
  },
  {
    id: 'usda-cherry-tomatoes',
    name: 'Ripe Cherry Tomatoes',
    category: 'vegetable',
    servingGrams: 100,
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    fiberPer100g: 1.2,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['tomato', 'tomatoes', 'cherry tomatoes']
  },

  // Healthy Fats & Hidden Cooking Oils
  {
    id: 'usda-avocado',
    name: 'Hass Avocado',
    category: 'fat',
    servingGrams: 80,
    caloriesPer100g: 160,
    proteinPer100g: 2.0,
    carbsPer100g: 8.5,
    fatPer100g: 14.7,
    fiberPer100g: 6.7,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['avocado', 'guacamole', 'hass avocado']
  },
  {
    id: 'usda-olive-oil',
    name: 'Extra Virgin Olive Oil (Cooking/Dressing)',
    category: 'fat',
    servingGrams: 14, // ~1 tablespoon
    caloriesPer100g: 884,
    proteinPer100g: 0.0,
    carbsPer100g: 0.0,
    fatPer100g: 100.0,
    fiberPer100g: 0.0,
    densityScore: 6,
    isJunk: false,
    defaultEvidence: 'unobservable', // Hidden cooking fat
    keywords: ['olive oil', 'oil', 'cooking oil', 'dressing', 'skillet oil']
  },
  {
    id: 'usda-butter',
    name: 'Grass-Fed Butter (Sauté fat)',
    category: 'fat',
    servingGrams: 10,
    caloriesPer100g: 717,
    proteinPer100g: 0.9,
    carbsPer100g: 0.1,
    fatPer100g: 81.1,
    fiberPer100g: 0.0,
    densityScore: 5,
    isJunk: false,
    defaultEvidence: 'unobservable',
    keywords: ['butter', 'ghee', 'dairy fat', 'cooking fat']
  },
  {
    id: 'usda-almonds',
    name: 'Raw Whole Almonds',
    category: 'fat',
    servingGrams: 30,
    caloriesPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.6,
    fatPer100g: 49.9,
    fiberPer100g: 12.5,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['almonds', 'nuts', 'raw almonds']
  },

  // Fruits
  {
    id: 'usda-blueberries',
    name: 'Fresh Wild Blueberries',
    category: 'fruit',
    servingGrams: 100,
    caloriesPer100g: 57,
    proteinPer100g: 0.7,
    carbsPer100g: 14.5,
    fatPer100g: 0.3,
    fiberPer100g: 2.4,
    densityScore: 10,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['blueberries', 'berries', 'fruit']
  },
  {
    id: 'usda-banana',
    name: 'Fresh Ripe Banana',
    category: 'fruit',
    servingGrams: 120,
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['banana', 'fruit', 'potassium']
  },
  {
    id: 'usda-apple',
    name: 'Crisp Honeycrisp Apple',
    category: 'fruit',
    servingGrams: 180,
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['apple', 'honeycrisp', 'fruit']
  },

  // Fast Foods & Cheat Items (isJunk: true)
  {
    id: 'usda-pizza-slice',
    name: 'Pepperoni Pizza Slice',
    category: 'junk',
    servingGrams: 110,
    caloriesPer100g: 275,
    proteinPer100g: 11.2,
    carbsPer100g: 28.5,
    fatPer100g: 12.8,
    fiberPer100g: 1.8,
    densityScore: 3,
    isJunk: true,
    defaultEvidence: 'context_derived',
    keywords: ['pizza', 'pepperoni', 'slice', 'cheese pizza', 'junk food']
  },
  {
    id: 'usda-french-fries',
    name: 'Crispy French Fries (Fried)',
    category: 'junk',
    servingGrams: 120,
    caloriesPer100g: 312,
    proteinPer100g: 3.4,
    carbsPer100g: 41.4,
    fatPer100g: 15.0,
    fiberPer100g: 3.8,
    densityScore: 2,
    isJunk: true,
    defaultEvidence: 'visible',
    keywords: ['fries', 'french fries', 'potato fries', 'fried']
  },
  {
    id: 'usda-cheeseburger',
    name: 'Double Cheeseburger',
    category: 'junk',
    servingGrams: 220,
    caloriesPer100g: 260,
    proteinPer100g: 14.5,
    carbsPer100g: 23.0,
    fatPer100g: 13.0,
    fiberPer100g: 1.2,
    densityScore: 3,
    isJunk: true,
    defaultEvidence: 'context_derived',
    keywords: ['burger', 'cheeseburger', 'hamburger', 'fast food']
  },
  {
    id: 'usda-glazed-donut',
    name: 'Glazed Ring Donut',
    category: 'junk',
    servingGrams: 60,
    caloriesPer100g: 421,
    proteinPer100g: 5.4,
    carbsPer100g: 49.0,
    fatPer100g: 22.8,
    fiberPer100g: 1.5,
    densityScore: 1,
    isJunk: true,
    defaultEvidence: 'visible',
    keywords: ['donut', 'doughnut', 'pastry', 'sweet', 'glazed']
  },
  {
    id: 'usda-turkey-breast',
    name: 'Roasted Turkey Breast',
    category: 'protein',
    servingGrams: 140,
    caloriesPer100g: 135,
    proteinPer100g: 30.0,
    carbsPer100g: 0.0,
    fatPer100g: 1.0,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['turkey', 'poultry', 'roasted turkey', 'lean meat']
  },
  {
    id: 'usda-whey-protein',
    name: 'Whey Protein Isolate Powder',
    category: 'protein',
    servingGrams: 30,
    caloriesPer100g: 380,
    proteinPer100g: 82.0,
    carbsPer100g: 3.5,
    fatPer100g: 1.5,
    fiberPer100g: 0.0,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['whey', 'protein powder', 'protein shake', 'isolate', 'supplement']
  },
  {
    id: 'usda-peanut-butter',
    name: 'Creamy Natural Peanut Butter',
    category: 'fat',
    servingGrams: 32,
    caloriesPer100g: 588,
    proteinPer100g: 25.0,
    carbsPer100g: 20.0,
    fatPer100g: 50.0,
    fiberPer100g: 6.0,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['peanut butter', 'nut butter', 'peanuts', 'spread']
  },
  {
    id: 'usda-almonds',
    name: 'Raw Whole Almonds',
    category: 'fat',
    servingGrams: 28,
    caloriesPer100g: 579,
    proteinPer100g: 21.2,
    carbsPer100g: 21.6,
    fatPer100g: 49.9,
    fiberPer100g: 12.5,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['almonds', 'nuts', 'raw nuts', 'snack']
  },
  {
    id: 'usda-whole-wheat-bread',
    name: 'Whole Wheat Bread Slice',
    category: 'carb',
    servingGrams: 40,
    caloriesPer100g: 247,
    proteinPer100g: 13.0,
    carbsPer100g: 41.0,
    fatPer100g: 3.4,
    fiberPer100g: 7.0,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['whole wheat', 'bread', 'slice', 'wheat bread', 'toast']
  },
  {
    id: 'usda-pasta-cooked',
    name: 'Cooked Semolina Pasta',
    category: 'carb',
    servingGrams: 140,
    caloriesPer100g: 158,
    proteinPer100g: 5.8,
    carbsPer100g: 31.0,
    fatPer100g: 0.9,
    fiberPer100g: 1.8,
    densityScore: 6,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['pasta', 'spaghetti', 'penne', 'noodles', 'macaroni']
  },
  {
    id: 'usda-cheddar-cheese',
    name: 'Sharp Cheddar Cheese',
    category: 'dairy',
    servingGrams: 30,
    caloriesPer100g: 403,
    proteinPer100g: 24.9,
    carbsPer100g: 1.3,
    fatPer100g: 33.1,
    fiberPer100g: 0.0,
    densityScore: 7,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['cheese', 'cheddar', 'dairy', 'slice cheese']
  },
  {
    id: 'usda-fresh-banana',
    name: 'Fresh Medium Banana',
    category: 'fruit',
    servingGrams: 118,
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 22.8,
    fatPer100g: 0.3,
    fiberPer100g: 2.6,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['banana', 'fruit', 'potassium']
  },
  {
    id: 'usda-fresh-apple',
    name: 'Fresh Crisp Apple (with skin)',
    category: 'fruit',
    servingGrams: 150,
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 13.8,
    fatPer100g: 0.2,
    fiberPer100g: 2.4,
    densityScore: 9,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['apple', 'honeycrisp', 'fuji', 'gala', 'fruit']
  },
  {
    id: 'usda-blueberries',
    name: 'Fresh Blueberries',
    category: 'fruit',
    servingGrams: 100,
    caloriesPer100g: 57,
    proteinPer100g: 0.7,
    carbsPer100g: 14.5,
    fatPer100g: 0.3,
    fiberPer100g: 2.4,
    densityScore: 10,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['blueberries', 'berries', 'wild blueberries', 'antioxidants']
  },
  {
    id: 'usda-black-coffee',
    name: 'Fresh Brewed Black Coffee',
    category: 'prepared',
    servingGrams: 240,
    caloriesPer100g: 1,
    proteinPer100g: 0.1,
    carbsPer100g: 0.0,
    fatPer100g: 0.0,
    fiberPer100g: 0.0,
    densityScore: 7,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['coffee', 'black coffee', 'espresso', 'americano', 'caffeine']
  },
  {
    id: 'usda-whole-milk',
    name: 'Whole Cow Milk (3.25% Fat)',
    category: 'dairy',
    servingGrams: 240,
    caloriesPer100g: 61,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatPer100g: 3.3,
    fiberPer100g: 0.0,
    densityScore: 8,
    isJunk: false,
    defaultEvidence: 'visible',
    keywords: ['milk', 'whole milk', 'cow milk', 'dairy']
  }
];

export interface PrecomposedMealTemplate {
  name: string;
  mealType: MealType;
  imageUrl: string;
  description: string;
  densityScore: number;
  isJunk: boolean;
  components: Array<{
    itemRefId: string;
    grams: number;
    evidenceClass: 'visible' | 'context_derived' | 'unobservable';
    notes?: string;
  }>;
}

export const SAMPLE_MEAL_TEMPLATES: PrecomposedMealTemplate[] = [
  {
    name: 'Grilled Salmon Quinoa Power Bowl',
    mealType: 'Lunch',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    description: 'Wild Atlantic salmon fillet atop warm fluffy quinoa, tender steamed broccoli, and 1 tbsp cold-pressed olive oil dressing.',
    densityScore: 10,
    isJunk: false,
    components: [
      { itemRefId: 'usda-salmon-fillet', grams: 160, evidenceClass: 'visible' },
      { itemRefId: 'usda-quinoa', grams: 140, evidenceClass: 'visible' },
      { itemRefId: 'usda-broccoli', grams: 110, evidenceClass: 'visible' },
      { itemRefId: 'usda-olive-oil', grams: 10, evidenceClass: 'unobservable', notes: 'Pan finishing and dressing oil' }
    ]
  },
  {
    name: 'Avocado Sourdough & Poached Eggs',
    mealType: 'Breakfast',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80',
    description: 'Toasted country sourdough with mashed ripe avocado, two farm fresh poached eggs, and pinch of sea salt.',
    densityScore: 9,
    isJunk: false,
    components: [
      { itemRefId: 'usda-sourdough', grams: 70, evidenceClass: 'visible' },
      { itemRefId: 'usda-avocado', grams: 65, evidenceClass: 'visible' },
      { itemRefId: 'usda-boiled-egg', grams: 100, evidenceClass: 'visible', notes: '2 whole eggs' },
      { itemRefId: 'usda-olive-oil', grams: 5, evidenceClass: 'unobservable', notes: 'Bread toast brush oil' }
    ]
  },
  {
    name: 'Seared Sirloin Steak & Charred Asparagus',
    mealType: 'Dinner',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
    description: 'Pan-seared lean beef sirloin with charred green asparagus spears and roasted sweet potato wedges.',
    densityScore: 9,
    isJunk: false,
    components: [
      { itemRefId: 'usda-sirloin-steak', grams: 180, evidenceClass: 'visible' },
      { itemRefId: 'usda-asparagus', grams: 120, evidenceClass: 'visible' },
      { itemRefId: 'usda-sweet-potato', grams: 140, evidenceClass: 'visible' },
      { itemRefId: 'usda-butter', grams: 8, evidenceClass: 'unobservable', notes: 'Steak basting butter' }
    ]
  },
  {
    name: 'Lean Grilled Chicken & Brown Rice Bowl',
    mealType: 'Lunch',
    imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
    description: 'Herb-seasoned grilled chicken breast with steamed whole grain brown rice and sautéed bell peppers.',
    densityScore: 9,
    isJunk: false,
    components: [
      { itemRefId: 'usda-chicken-breast', grams: 170, evidenceClass: 'visible' },
      { itemRefId: 'usda-brown-rice', grams: 150, evidenceClass: 'visible' },
      { itemRefId: 'usda-bell-peppers', grams: 90, evidenceClass: 'visible' },
      { itemRefId: 'usda-olive-oil', grams: 7, evidenceClass: 'unobservable', notes: 'Skillet sauté oil' }
    ]
  },
  {
    name: 'Pepperoni Pizza & Seasoned Fries',
    mealType: 'Dinner',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
    description: 'Two slices of pepperoni pizza paired with deep fried seasoned potato fries. High saturated fat and refined flour.',
    densityScore: 2,
    isJunk: true,
    components: [
      { itemRefId: 'usda-pizza-slice', grams: 220, evidenceClass: 'visible', notes: '2 slices' },
      { itemRefId: 'usda-french-fries', grams: 130, evidenceClass: 'visible' },
      { itemRefId: 'usda-olive-oil', grams: 12, evidenceClass: 'unobservable', notes: 'Deep frying oil residual' }
    ]
  }
];

export function buildComponentFromUsda(
  refId: string,
  grams: number,
  evidenceClass: EvidenceClass = 'visible',
  notes?: string
): ComponentFoodItem | null {
  const item = USDA_REFERENCE_DATABASE.find(i => i.id === refId);
  if (!item) return null;

  const ratio = grams / 100;
  const protein = Math.round(item.proteinPer100g * ratio * 10) / 10;
  const carbs = Math.round(item.carbsPer100g * ratio * 10) / 10;
  const fat = Math.round(item.fatPer100g * ratio * 10) / 10;
  const fiber = Math.round(item.fiberPer100g * ratio * 10) / 10;
  const calories = Math.round(item.caloriesPer100g * ratio);

  return {
    id: `${item.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: item.name,
    mass: {
      p10: Math.round(grams * 0.85),
      p50: grams,
      p90: Math.round(grams * (evidenceClass === 'unobservable_unknown' ? 1.35 : 1.18)),
      unit: 'g',
    },
    grams,
    calories,
    protein,
    carbs,
    fat,
    fiber,
    evidenceClass,
    nutritionSource: 'USDA',
    confidence: 0.98,
    uncertaintyNote: notes,
  };
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'with', 'in', 'on', 'of', 'for', 'to', 'from',
  'fresh', 'cooked', 'steamed', 'grilled', 'roasted', 'baked', 'fried', 'pan', 'seared',
  'portion', 'piece', 'serving', 'diced', 'sliced', 'chopped', 'style', 'bowl', 'plate',
  'fillet', 'strips', 'cut', 'organic', 'raw'
]);

export function searchUsdaFoods(query: string): UsdaReferenceItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return USDA_REFERENCE_DATABASE.slice(0, 15);

  // 1. Direct name or keyword match
  const exactMatches = USDA_REFERENCE_DATABASE.filter(item => {
    const itemName = item.name.toLowerCase();
    return itemName === q || item.keywords.some(k => k === q);
  });
  if (exactMatches.length > 0) return exactMatches;

  // 2. Direct substring matches
  const substringMatches = USDA_REFERENCE_DATABASE.filter(item => {
    const itemName = item.name.toLowerCase();
    return itemName.includes(q) || item.keywords.some(k => k.includes(q));
  });
  if (substringMatches.length > 0) return substringMatches;

  // 3. Multi-token weighted scoring with culinary "with" deconstruction
  const parts = q.split(/\s+with\s+/);
  const mainPart = parts[0] || q;
  const secondaryPart = parts[1] || '';

  const mainTokens = mainPart
    .split(/[\s,+/&_-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  const secondaryTokens = secondaryPart
    .split(/[\s,+/&_-]+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  const scored = USDA_REFERENCE_DATABASE.map(item => {
    let score = 0;
    const itemName = item.name.toLowerCase();
    const itemKeywords = item.keywords.map(k => k.toLowerCase());

    // Primary item tokens (double weight)
    for (const token of mainTokens) {
      if (itemName.includes(token)) score += 24;
      if (itemKeywords.some(k => k.includes(token))) score += 16;
      if (item.category.includes(token)) score += 6;
    }

    // Secondary garnish/accompaniment tokens (single weight)
    for (const token of secondaryTokens) {
      if (itemName.includes(token)) score += 8;
      if (itemKeywords.some(k => k.includes(token))) score += 4;
      if (item.category.includes(token)) score += 2;
    }

    return { item, score };
  });

  const matched = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);

  return matched.length > 0
    ? matched
    : USDA_REFERENCE_DATABASE.filter(item => item.name.toLowerCase().includes(q));
}

/**
 * Creates a calibrated FoodItem from a template or user composition
 */
export function createCalibratedFoodItem(
  name: string,
  mealType: MealType,
  components: ComponentFoodItem[],
  imageUrl?: string,
  nutritionSource: NutritionSource = 'USDA',
  confidence = 0.94
): FoodItem {
  const rawCalories = components.reduce((sum, c) => sum + (c.calories || 0), 0);
  const totalProtein = Math.round(components.reduce((sum, c) => sum + (c.protein || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(components.reduce((sum, c) => sum + (c.carbs || 0), 0) * 10) / 10;
  const totalFat = Math.round(components.reduce((sum, c) => sum + (c.fat || 0), 0) * 10) / 10;
  const totalFiber = Math.round(components.reduce((sum, c) => sum + (c.fiber || 0), 0) * 10) / 10;

  const minCalories = Math.round(rawCalories * 0.86);
  const maxCalories = Math.round(rawCalories * 1.18);

  const visibleCount = components.filter(c => c.evidenceClass === 'visible').length;
  const contextCount = components.filter(c => c.evidenceClass === 'context_derived').length;
  const userConfirmedCount = components.filter(c => c.evidenceClass === 'user_confirmed').length;
  const unobservableCount = components.filter(c => c.evidenceClass === 'unobservable_unknown').length;

  return {
    id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name,
    mealType,
    calories: rawCalories,
    minCalories,
    maxCalories,
    protein: totalProtein,
    carbs: totalCarbs,
    fat: totalFat,
    fiber: totalFiber,
    evidenceClassCounts: {
      visible: visibleCount,
      context_derived: contextCount,
      user_confirmed: userConfirmedCount,
      unobservable_unknown: unobservableCount,
    },
    hasUnobservableUnknown: unobservableCount > 0,
    nutritionSource,
    confidence,
    foods: components,
    imageUrl,
    timestamp: Date.now(),
    date: new Date().toISOString().split('T')[0],
  };
}
