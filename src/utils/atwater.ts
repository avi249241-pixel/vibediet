import { ComponentFoodItem, FoodItem } from '../types/diet';

export interface AtwaterCalibrationResult {
  theoreticalCalories: number;
  reportedCalories: number;
  calibratedCalories: number;
  discrepancyPercentage: number;
  isThermodynamicallyConsistent: boolean;
  minCaloriesP10: number;
  maxCaloriesP90: number;
  hiddenFatCalories: number;
  hiddenFatGrams: number;
}

/**
 * Atwater factors:
 * Protein: 4.0 kcal/g
 * Carbohydrate: 4.0 kcal/g
 * Fat: 9.0 kcal/g
 */
export const ATWATER_PROTEIN_FACTOR = 4.0;
export const ATWATER_CARB_FACTOR = 4.0;
export const ATWATER_FAT_FACTOR = 9.0;

export function calculateAtwaterCalories(proteinGrams: number, carbGrams: number, fatGrams: number): number {
  const p = Math.max(0, proteinGrams);
  const c = Math.max(0, carbGrams);
  const f = Math.max(0, fatGrams);
  return Math.round(p * ATWATER_PROTEIN_FACTOR + c * ATWATER_CARB_FACTOR + f * ATWATER_FAT_FACTOR);
}

/**
 * Calibrates meal components and calculates volumetric portion bounds (p10 to p90)
 * taking into account epistemic uncertainty from hidden oils and preparation methods.
 */
export function calibrateMealWithAtwater(
  reportedCalories: number,
  components: ComponentFoodItem[]
): AtwaterCalibrationResult {
  const totalProtein = components.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = components.reduce((sum, item) => sum + (item.carbs || 0), 0);
  const totalFat = components.reduce((sum, item) => sum + (item.fat || 0), 0);

  const theoreticalCalories = calculateAtwaterCalories(totalProtein, totalCarbs, totalFat);
  
  // Reported vs theoretical difference
  const effectiveReported = reportedCalories > 0 ? reportedCalories : theoreticalCalories;
  const diff = Math.abs(effectiveReported - theoreticalCalories);
  const discrepancyPercentage = effectiveReported > 0 
    ? Math.round((diff / effectiveReported) * 100 * 10) / 10 
    : 0;

  // If discrepancy is > 8%, we enforce thermodynamic calibration to prevent hallucination
  const isThermodynamicallyConsistent = discrepancyPercentage <= 8.0;
  const calibratedCalories = isThermodynamicallyConsistent 
    ? Math.round(effectiveReported) 
    : theoreticalCalories;

  // Analyze unobservable/hidden oils
  const unobservableItems = components.filter(c => c.evidenceClass === 'unobservable_unknown');
  const hiddenFatGrams = unobservableItems.reduce((sum, i) => sum + (i.fat || 0), 0);
  const hiddenFatCalories = Math.round(hiddenFatGrams * ATWATER_FAT_FACTOR);

  // Compute epistemic volumetric bounds (p10 - p90)
  // Base volumetric variance is +/- 10%
  // Hidden fats increase upper uncertainty bound
  let lowerBoundFactor = 0.88;
  let upperBoundFactor = 1.14;

  const hasHighUncertainty = unobservableItems.length > 0 || components.some(c => c.evidenceClass === 'context_derived');
  if (hasHighUncertainty) {
    lowerBoundFactor = 0.84;
    upperBoundFactor = 1.22; // higher ceiling for unseen oils and dressings
  }

  const minCaloriesP10 = Math.max(10, Math.round(calibratedCalories * lowerBoundFactor));
  const maxCaloriesP90 = Math.round(calibratedCalories * upperBoundFactor);

  return {
    theoreticalCalories,
    reportedCalories: effectiveReported,
    calibratedCalories,
    discrepancyPercentage,
    isThermodynamicallyConsistent,
    minCaloriesP10,
    maxCaloriesP90,
    hiddenFatCalories,
    hiddenFatGrams,
  };
}

/**
 * Calculates a meal nutritional grade (A, B, C, D) based on:
 * - Protein-to-calorie ratio
 * - Whole food density score
 * - Junk food penalty
 * - Hidden oil content
 */
export function calculateNutritionalGrade(
  calories: number,
  protein: number,
  densityScore: number,
  isJunk: boolean,
  hiddenFatCalories: number
): 'A' | 'B' | 'C' | 'D' {
  if (isJunk) return 'D';
  if (calories <= 0) return 'B';

  const proteinRatio = (protein * 4) / calories; // % calories from protein
  const hiddenFatRatio = hiddenFatCalories / calories;

  let points = densityScore * 10; // 10-100 base from density

  if (proteinRatio >= 0.25) points += 20;
  else if (proteinRatio >= 0.15) points += 10;

  if (hiddenFatRatio > 0.35) points -= 25;
  else if (hiddenFatRatio > 0.20) points -= 15;

  if (points >= 80) return 'A';
  if (points >= 65) return 'B';
  if (points >= 48) return 'C';
  return 'D';
}
