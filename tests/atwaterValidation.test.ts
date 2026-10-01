import test from 'node:test';
import assert from 'node:assert';
import {
  validateAtwaterThermodynamics,
  validateGeminiComponent,
  autoCalibrateItemToAtwater,
  getTrustedReferenceBenchmark,
  TRUSTED_REFERENCE_MODELS,
  ATWATER_THRESHOLD_PERCENT,
} from '../src/utils/atwaterValidator.ts';
import { searchUsdaFoods } from '../src/data/usdaDatabase.ts';

test('Thermodynamic Atwater Validation: Core 4P + 4C + 9F equation', () => {
  // 10g protein (40 kcal) + 20g carbs (80 kcal) + 5g fat (45 kcal) = 165 kcal
  const res = validateAtwaterThermodynamics(165, 10, 20, 5);
  assert.strictEqual(res.atwaterCalories, 165);
  assert.strictEqual(res.deltaCalories, 0);
  assert.strictEqual(res.discrepancyPercentage, 0);
  assert.strictEqual(res.isUnreliable, false);
  assert.strictEqual(res.status, 'reliable');
});

test('Thermodynamic Atwater Validation: Flags discrepancy > 10% as unreliable', () => {
  // Hallucinated result 1: Model claims 350 kcal for a salad that has 5g protein, 10g carbs, 2g fat
  // Expected Atwater = 4*5 + 4*10 + 9*2 = 78 kcal
  // Discrepancy = |350 - 78| / 350 = 77.7%
  const hallucinatedHigh = validateAtwaterThermodynamics(350, 5, 10, 2);
  assert.strictEqual(hallucinatedHigh.isUnreliable, true);
  assert.strictEqual(hallucinatedHigh.status, 'unreliable');
  assert.ok(hallucinatedHigh.discrepancyPercentage > 50);
  assert.ok(hallucinatedHigh.warningMessage?.includes('Thermodynamic variance'));

  // Hallucinated result 2: Model claims 100 kcal for a steak that has 40g protein, 0g carbs, 25g fat
  // Expected Atwater = 4*40 + 9*25 = 385 kcal
  // Discrepancy = |100 - 385| / 100 = 285%
  const hallucinatedLow = validateAtwaterThermodynamics(100, 40, 0, 25);
  assert.strictEqual(hallucinatedLow.isUnreliable, true);
  assert.strictEqual(hallucinatedLow.status, 'unreliable');
  assert.strictEqual(hallucinatedLow.atwaterCalories, 385);
});

test('Thermodynamic Atwater Validation: Allows up to 10% variance as reliable', () => {
  // 100 kcal reported, 93 kcal Atwater (7% difference, within 10% threshold)
  // 10g P (40) + 11g C (44) + 1g F (9) = 93 kcal
  const reliable1 = validateAtwaterThermodynamics(100, 10, 11, 1);
  assert.strictEqual(reliable1.isUnreliable, false);
  assert.strictEqual(reliable1.status, 'reliable');
  assert.strictEqual(reliable1.discrepancyPercentage, 7.0);

  // Exact 9.5% variance -> reliable
  // 200 kcal reported, 181 kcal Atwater -> 9.5% discrepancy
  const reliable2 = validateAtwaterThermodynamics(200, 20, 20, 2.3);
  assert.strictEqual(reliable2.isUnreliable, false);

  // 11.5% variance -> unreliable
  // 200 kcal reported, 177 kcal Atwater -> 11.5% discrepancy
  const unreliableBoundary = validateAtwaterThermodynamics(200, 20, 20, 1.9);
  assert.strictEqual(unreliableBoundary.isUnreliable, true);
});

test('Thermodynamic Atwater Validation: Edge cases (zero energy, water, trace calories)', () => {
  // Pure water: 0 kcal, 0 macros
  const water = validateAtwaterThermodynamics(0, 0, 0, 0);
  assert.strictEqual(water.isUnreliable, false);
  assert.strictEqual(water.discrepancyPercentage, 0);

  // Black coffee / unsweetened tea: 2 kcal reported, 0.3g P, 0.2g C, 0g F (2 kcal Atwater)
  const coffee = validateAtwaterThermodynamics(2, 0.3, 0.2, 0);
  assert.strictEqual(coffee.isUnreliable, false);

  // Impossible zero: 0 kcal reported but 25g protein and 30g carbs (220 kcal Atwater)
  const impossibleZero = validateAtwaterThermodynamics(0, 25, 30, 0);
  assert.strictEqual(impossibleZero.isUnreliable, true);
  assert.strictEqual(impossibleZero.status, 'unreliable');
  assert.strictEqual(impossibleZero.discrepancyPercentage, 100);
});

test('Trusted Reference Models: Actual USDA benchmark nutrient validation', () => {
  // Test each trusted reference model from USDA database
  for (const model of TRUSTED_REFERENCE_MODELS) {
    const { calories, protein, carbs, fat } = model.per100g;
    const validation = validateAtwaterThermodynamics(calories, protein, carbs, fat, {
      // Standard allowance or check
      maxAllowedDiscrepancyPct: 20, // Allow up to 20% for high-fiber vegetables
    });

    assert.ok(validation.atwaterCalories > 0);
    // Calculated Atwater should closely match our expected ground truth benchmark
    const diff = Math.abs(validation.atwaterCalories - model.expectedAtwater);
    assert.ok(diff <= 2, `${model.name}: expected ${model.expectedAtwater} kcal, got ${validation.atwaterCalories} kcal`);
  }

  // Chicken breast: 165 kcal vs 156.4 kcal (5.2% difference, reliable under 10% threshold)
  const chicken = TRUSTED_REFERENCE_MODELS.find(m => m.name.includes('Chicken'))!;
  const chickenVal = validateAtwaterThermodynamics(
    chicken.per100g.calories,
    chicken.per100g.protein,
    chicken.per100g.carbs,
    chicken.per100g.fat
  );
  assert.strictEqual(chickenVal.isUnreliable, false);
  assert.strictEqual(chickenVal.status, 'reliable');

  // Olive oil: 884 kcal vs 900 kcal (1.8% difference, reliable)
  const oliveOil = TRUSTED_REFERENCE_MODELS.find(m => m.name.includes('Olive Oil'))!;
  const oilVal = validateAtwaterThermodynamics(
    oliveOil.per100g.calories,
    oliveOil.per100g.protein,
    oliveOil.per100g.carbs,
    oliveOil.per100g.fat
  );
  assert.strictEqual(oilVal.isUnreliable, false);
  assert.strictEqual(oilVal.status, 'reliable');

  // Hard-boiled egg: 155 kcal vs 150 kcal (3.1% difference, reliable)
  const egg = TRUSTED_REFERENCE_MODELS.find(m => m.name.includes('Egg'))!;
  const eggVal = validateAtwaterThermodynamics(
    egg.per100g.calories,
    egg.per100g.protein,
    egg.per100g.carbs,
    egg.per100g.fat
  );
  assert.strictEqual(eggVal.isUnreliable, false);
});

test('Auto-Calibration: Repairs unreliable hallucinated Gemini items', () => {
  const badItem = {
    id: 'test-1',
    name: 'Hallucinated Tofu',
    grams: 150,
    calories: 450, // Hallucinated high
    protein: 15,   // 60 kcal
    carbs: 5,      // 20 kcal
    fat: 6,        // 54 kcal -> total Atwater = 134 kcal
  };

  // Initially unreliable
  const initialCheck = validateAtwaterThermodynamics(badItem.calories, badItem.protein, badItem.carbs, badItem.fat);
  assert.strictEqual(initialCheck.isUnreliable, true);
  assert.strictEqual(initialCheck.atwaterCalories, 134);

  // Auto-calibrate
  const calibrated = autoCalibrateItemToAtwater(badItem);
  assert.strictEqual(calibrated.calories, 134);
  assert.strictEqual(calibrated.isUnreliable, false);
  assert.strictEqual(calibrated.atwaterValidation.isUnreliable, false);
});

test('Trusted Benchmark Reference Fallback: Recovers ground-truth from USDA database', () => {
  const benchmark = getTrustedReferenceBenchmark('Chicken Breast', 200);
  assert.ok(benchmark !== null);
  assert.strictEqual(benchmark.portionGrams, 200);
  assert.ok(benchmark.calories > 300);
  assert.ok(benchmark.protein > 50);
  assert.strictEqual(benchmark.validation.isUnreliable, false);
});
