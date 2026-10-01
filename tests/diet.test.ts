import test from 'node:test';
import assert from 'node:assert';
import { computeAtwaterDiagnostic } from '../src/lib/nutritionReconciliation.js';
import { USDA_REFERENCE_DATABASE, searchUsdaFoods } from '../src/data/usdaDatabase.js';
import { calculateSmoothedWeights, calculateDynamicExpenditure, balanceWeeklyCalorieSchedule } from '../src/lib/metabolicEngine.js';

test('Atwater diagnostic check preserves canonical energy and computes delta', () => {
  const canonicalCalories = 500;
  const protein = 40; // 40 * 4 = 160
  const carbs = 50;   // 50 * 4 = 200
  const fat = 15;     // 15 * 9 = 135
  // Total Atwater = 495

  const diagnostic = computeAtwaterDiagnostic(canonicalCalories, protein, carbs, fat);

  // Canonical energy must NEVER be overridden
  assert.strictEqual(diagnostic.canonicalCalories, 500);
  assert.strictEqual(diagnostic.atwaterCalculatedCalories, 495);
  assert.strictEqual(diagnostic.deltaCalories, 5);
  assert.strictEqual(diagnostic.status, 'concordant');
});

test('USDA reference database searches with high precision', () => {
  const salmonResults = searchUsdaFoods('salmon');
  assert.ok(salmonResults.length > 0);
  assert.ok(salmonResults[0].name.toLowerCase().includes('salmon'));
  assert.strictEqual(salmonResults[0].caloriesPer100g, 206);

  // Multi-token fuzzy match with stop words
  const complexMatch = searchUsdaFoods('Pan Seared Atlantic Salmon with Olive Oil');
  assert.ok(complexMatch.length > 0);
  assert.strictEqual(complexMatch[0].name, 'Atlantic Salmon Fillet');

  // New staple items search
  const wheyMatch = searchUsdaFoods('Whey Protein Powder');
  assert.ok(wheyMatch.length > 0);
  assert.strictEqual(wheyMatch[0].id, 'usda-whey-protein');

  const bananaMatch = searchUsdaFoods('fresh banana');
  assert.ok(bananaMatch.length > 0);
  assert.ok(bananaMatch[0].name.toLowerCase().includes('banana'));

  const coffeeMatch = searchUsdaFoods('black coffee');
  assert.ok(coffeeMatch.length > 0);
  assert.strictEqual(coffeeMatch[0].id, 'usda-black-coffee');
});

test('Personal food memory matching: repeat meal matches, different meal does not', () => {
  const memories = [
    {
      id: 'mem-salmon-bowl',
      name: 'Grilled Salmon Quinoa Bowl',
      signature: 'salmon quinoa broccoli olive oil',
      calories: 520,
      confirmedCount: 3,
    },
    {
      id: 'mem-avocado-toast',
      name: 'Avocado Toast & Eggs',
      signature: 'sourdough avocado egg',
      calories: 380,
      confirmedCount: 5,
    },
  ];

  function findMatch(inputName: string) {
    const q = inputName.toLowerCase().trim();
    if (!q || q.length < 3) return null;
    return memories.find(m => {
      const name = m.name.toLowerCase();
      return name.includes(q) || q.includes(name) || m.signature.includes(q);
    }) || null;
  }

  // Case 1: Repeat meal triggers match correctly
  const repeatMatch = findMatch('Grilled Salmon Quinoa Bowl');
  assert.ok(repeatMatch !== null);
  assert.strictEqual(repeatMatch?.id, 'mem-salmon-bowl');

  // Case 2: Partial high-confidence match
  const partialMatch = findMatch('Salmon Quinoa Bowl');
  assert.ok(partialMatch !== null);
  assert.strictEqual(partialMatch?.id, 'mem-salmon-bowl');

  // Case 3: Genuinely different meal does NOT false-positive match
  const differentMatch = findMatch('Double Cheeseburger & Fries');
  assert.strictEqual(differentMatch, null);
});

test('EWMA weight smoothing dampens fluid fluctuations', () => {
  const rawWeighIns = [
    { id: '1', date: '2026-09-01', weightKg: 80.0, timestamp: 1000 },
    { id: '2', date: '2026-09-02', weightKg: 81.5, timestamp: 2000 }, // +1.5kg water spike
    { id: '3', date: '2026-09-03', weightKg: 79.5, timestamp: 3000 }, // drop
  ];

  const smoothed = calculateSmoothedWeights(rawWeighIns);
  assert.strictEqual(smoothed.length, 3);
  // The water spike should be smoothed, not jumping to 81.5kg
  assert.ok(smoothed[1].smoothedWeightKg! < 80.5);
});

test('Dynamic energy expenditure inverts energy balance correctly', () => {
  const smoothedWeights = [
    { id: '1', date: '2026-09-01', weightKg: 80.0, smoothedWeightKg: 80.0, timestamp: 1000000 },
    { id: '2', date: '2026-09-15', weightKg: 79.0, smoothedWeightKg: 79.0, timestamp: 1000000 + 14 * 24 * 3600 * 1000 },
  ];
  // Weight lost = 1.0kg over 14 days = 7700 kcal deficit / 14 days = 550 kcal/day deficit
  // If user ate 2000 kcal/day, their TDEE is 2000 + 550 = 2550 kcal/day
  const dailyIntake = Array.from({ length: 14 }).map((_, i) => ({
    date: `2026-09-${i + 1}`,
    calories: 2000,
  }));

  const result = calculateDynamicExpenditure(smoothedWeights, dailyIntake, 2200);
  assert.strictEqual(result.currentTdee, 2550);
});

test('Weekly calorie schedule balances exact total calories across 7 days', () => {
  const avgTarget = 2000; // 14,000 total kcal/week
  const ratios = { mon: 1.0, tue: 1.0, wed: 1.0, thu: 1.0, fri: 1.2, sat: 1.2, sun: 1.0 };
  const schedule = balanceWeeklyCalorieSchedule(avgTarget, ratios);

  const total = Object.values(schedule).reduce((sum, v) => sum + v, 0);
  // Total must match within 5 kcal due to rounding
  assert.ok(Math.abs(total - 14000) <= 5);
  // Friday and Saturday should be higher than Monday
  assert.ok(schedule.friday > schedule.monday);
});
