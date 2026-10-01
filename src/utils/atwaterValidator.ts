/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Thermodynamic Atwater Energy Validation Utility
 * Formulated around the 4-4-9 Atwater physiological fuel factors:
 *   Energy (kcal) ≈ 4 * Protein(g) + 4 * Carbohydrates(g) + 9 * Dietary Fat(g)
 * 
 * Rules:
 * 1. If discrepancy between reported energy and Atwater calculation exceeds 10%,
 *    flag the food or meal as 'unreliable' with a warning icon in the UI.
 * 2. Don't rely solely on Gemini: cross-reference against trusted USDA FoodData
 *    Central reference models to provide calibrated, thermodynamically valid data.
 */

import { AtwaterValidationResult, ComponentFoodItem } from '../types/diet';
import { USDA_REFERENCE_DATABASE, searchUsdaFoods } from '../data/usdaDatabase';

export const ATWATER_THRESHOLD_PERCENT = 10.0; // 10% maximum discrepancy threshold

/**
 * Core Thermodynamic Atwater Validation Function
 * Evaluates reported energy vs 4*P + 4*C + 9*F.
 */
export function validateAtwaterThermodynamics(
  reportedCalories: number,
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number,
  options?: { maxAllowedDiscrepancyPct?: number }
): AtwaterValidationResult {
  const safeProtein = Math.max(0, Number(proteinGrams) || 0);
  const safeCarbs = Math.max(0, Number(carbsGrams) || 0);
  const safeFat = Math.max(0, Number(fatGrams) || 0);
  const safeReported = Math.max(0, Math.round(Number(reportedCalories) || 0));

  // 4*Protein + 4*Carbs + 9*Fat
  const atwaterCalories = Math.round(safeProtein * 4 + safeCarbs * 4 + safeFat * 9);
  const deltaCalories = safeReported - atwaterCalories;
  const threshold = options?.maxAllowedDiscrepancyPct ?? ATWATER_THRESHOLD_PERCENT;

  // Zero-energy edge cases (e.g. water, black coffee, diet drinks)
  if (safeReported === 0) {
    if (atwaterCalories <= 12) {
      // Negligible trace calories (e.g. black coffee ~2-5 kcal)
      return {
        reportedCalories: safeReported,
        atwaterCalories,
        deltaCalories,
        discrepancyPercentage: 0,
        isUnreliable: false,
        status: 'reliable',
        calibratedCalories: safeReported,
      };
    } else {
      // Impossible: 0 reported calories but substantial macronutrients
      return {
        reportedCalories: safeReported,
        atwaterCalories,
        deltaCalories,
        discrepancyPercentage: 100,
        isUnreliable: true,
        status: 'unreliable',
        warningMessage: `Reported 0 kcal but macros calculate to ${atwaterCalories} kcal (4P+4C+9F).`,
        calibratedCalories: atwaterCalories,
      };
    }
  }

  // Calculate percentage variance relative to reported energy
  const discrepancyPercentage =
    Math.round((Math.abs(deltaCalories) / safeReported) * 100 * 10) / 10;

  const isUnreliable = discrepancyPercentage > threshold;
  const status: 'reliable' | 'unreliable' = isUnreliable ? 'unreliable' : 'reliable';

  let warningMessage: string | undefined;
  if (isUnreliable) {
    const direction = deltaCalories > 0 ? 'over-reported' : 'under-reported';
    warningMessage = `Thermodynamic variance (${discrepancyPercentage}%): Reported ${safeReported} kcal is ${direction} compared to 4P+4C+9F (${atwaterCalories} kcal). Discrepancy exceeds ${threshold}% limit.`;
  }

  return {
    reportedCalories: safeReported,
    atwaterCalories,
    deltaCalories,
    discrepancyPercentage,
    isUnreliable,
    status,
    warningMessage,
    calibratedCalories: atwaterCalories,
  };
}

/**
 * Validates an incoming Gemini-extracted component food item.
 */
export function validateGeminiComponent(raw: {
  calories?: number;
  rawCalories?: number;
  protein?: number;
  rawProtein?: number;
  carbs?: number;
  rawCarbs?: number;
  fat?: number;
  rawFat?: number;
  name?: string;
}): AtwaterValidationResult {
  const calories = raw.calories ?? raw.rawCalories ?? 0;
  const protein = raw.protein ?? raw.rawProtein ?? 0;
  const carbs = raw.carbs ?? raw.rawCarbs ?? 0;
  const fat = raw.fat ?? raw.rawFat ?? 0;

  return validateAtwaterThermodynamics(calories, protein, carbs, fat);
}

/**
 * Cross-references an incoming food item against trusted USDA FoodData Central models.
 * If Gemini has hallucinated or has a >10% discrepancy, this provides the trusted USDA ground truth.
 */
export function getTrustedReferenceBenchmark(foodName: string, portionGrams = 100) {
  const matches = searchUsdaFoods(foodName);
  if (matches.length === 0) return null;

  const trusted = matches[0];
  const ratio = portionGrams / 100;

  const trustedCalories = Math.round(trusted.caloriesPer100g * ratio);
  const trustedProtein = Math.round(trusted.proteinPer100g * ratio * 10) / 10;
  const trustedCarbs = Math.round(trusted.carbsPer100g * ratio * 10) / 10;
  const trustedFat = Math.round(trusted.fatPer100g * ratio * 10) / 10;

  const validation = validateAtwaterThermodynamics(
    trustedCalories,
    trustedProtein,
    trustedCarbs,
    trustedFat
  );

  return {
    referenceItem: trusted,
    portionGrams,
    calories: trustedCalories,
    protein: trustedProtein,
    carbs: trustedCarbs,
    fat: trustedFat,
    validation,
  };
}

/**
 * Calibrates any item to exact Atwater thermodynamic energy.
 */
export function autoCalibrateItemToAtwater<T extends { calories: number; protein: number; carbs: number; fat: number }>(
  item: T
): T & { atwaterValidation: AtwaterValidationResult; isUnreliable: boolean } {
  const validation = validateAtwaterThermodynamics(
    item.calories,
    item.protein,
    item.carbs,
    item.fat
  );

  if (validation.isUnreliable) {
    const calibratedValidation = validateAtwaterThermodynamics(
      validation.atwaterCalories,
      item.protein,
      item.carbs,
      item.fat
    );
    return {
      ...item,
      calories: validation.atwaterCalories,
      atwaterValidation: calibratedValidation,
      isUnreliable: false,
    };
  }

  return {
    ...item,
    atwaterValidation: validation,
    isUnreliable: false,
  };
}

/**
 * Set of trusted reference test models with published USDA benchmark nutrients
 * used for automated testing and thermodynamic ground-truth calibration.
 */
export const TRUSTED_REFERENCE_MODELS = [
  {
    name: 'Roasted Skinless Chicken Breast',
    category: 'lean_protein',
    per100g: { calories: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
    expectedAtwater: 156, // 4*31 + 4*0 + 9*3.6 = 156.4 kcal (~5.2% variance, valid)
  },
  {
    name: 'Wild Atlantic Salmon (Baked)',
    category: 'fatty_protein',
    per100g: { calories: 206, protein: 22.0, carbs: 0.0, fat: 12.3 },
    expectedAtwater: 199, // 4*22 + 9*12.3 = 198.7 kcal (~3.5% variance, valid)
  },
  {
    name: 'Cooked Jasmine White Rice',
    category: 'grain_carbs',
    per100g: { calories: 130, protein: 2.7, carbs: 28.2, fat: 0.3 },
    expectedAtwater: 126, // 4*2.7 + 4*28.2 + 9*0.3 = 126.3 kcal (~2.8% variance, valid)
  },
  {
    name: 'Steamed Broccoli Florets',
    category: 'vegetable',
    per100g: { calories: 35, protein: 2.4, carbs: 7.2, fat: 0.4 },
    expectedAtwater: 42, // 4*2.4 + 4*7.2 + 9*0.4 = 42 kcal (~16% due to non-digestible fiber, but canonical preserved)
  },
  {
    name: 'Extra Virgin Olive Oil',
    category: 'pure_fat',
    per100g: { calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0 },
    expectedAtwater: 900, // 9*100 = 900 kcal (~1.8% variance, valid)
  },
  {
    name: 'Large Whole Egg (Hard-boiled)',
    category: 'protein_fat',
    per100g: { calories: 155, protein: 12.6, carbs: 1.1, fat: 10.6 },
    expectedAtwater: 150, // 4*12.6 + 4*1.1 + 9*10.6 = 150.2 kcal (~3.1% variance, valid)
  },
  {
    name: 'Greek Yogurt (0% Non-fat)',
    category: 'dairy_protein',
    per100g: { calories: 59, protein: 10.0, carbs: 3.6, fat: 0.4 },
    expectedAtwater: 58, // 4*10 + 4*3.6 + 9*0.4 = 58 kcal (~1.7% variance, valid)
  },
];
