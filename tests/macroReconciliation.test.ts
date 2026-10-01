import test from 'node:test';
import assert from 'node:assert';
import {
  cacheKeyFor,
  nutritionCache,
  reconcileFoodComponent,
  computeAtwaterDiagnostic,
  RawGeminiComponent,
} from '../src/lib/nutritionReconciliation.ts';
import { searchUsdaFoods } from '../src/data/usdaDatabase.ts';
import { validateAtwaterThermodynamics } from '../src/utils/atwaterValidator.ts';

test('Cache Key Generation: Stable, deterministic, and case-insensitive', () => {
  const key1 = cacheKeyFor('food', 'Grilled Chicken Breast_150g');
  const key2 = cacheKeyFor('food', '   grilled chicken breast_150g  ');
  const key3 = cacheKeyFor('food', 'atlantic salmon_150g');

  assert.strictEqual(key1, key2, 'Same food with different casing and whitespace must yield identical keys');
  assert.notStrictEqual(key1, key3, 'Different foods must yield different keys');
  assert.ok(key1.startsWith('food_'), 'Key must contain prefix');
});

test('Nutrition Cache: Set, get, hit/miss, and clear', () => {
  nutritionCache.clear();
  assert.strictEqual(nutritionCache.size(), 0);

  const testKey = 'test_item_100g';
  const dummyItem: any = {
    id: 'test-1',
    name: 'Test Food',
    grams: 100,
    calories: 200,
    protein: 20,
    carbs: 10,
    fat: 8,
    evidenceClass: 'visible',
    nutritionSource: 'USDA',
    confidence: 1.0,
  };

  nutritionCache.set(testKey, dummyItem, 1000); // 1 sec TTL
  assert.strictEqual(nutritionCache.size(), 1);

  const fetched = nutritionCache.get(testKey);
  assert.ok(fetched);
  assert.strictEqual(fetched?.calories, 200);

  const missing = nutritionCache.get('non_existent_key');
  assert.strictEqual(missing, null);
});

test('0-LLM Macro Resolution: High-priority USDA database overrides LLM values', async () => {
  // Simulate an LLM hallucinating crazy macro values for Chicken Breast
  const hallucinatedRaw: RawGeminiComponent = {
    name: 'Skinless Chicken Breast',
    estimatedGrams: 200, // 200g
    evidenceClass: 'visible',
    rawCalories: 800, // Hallucinated (real USDA 200g is ~330 kcal)
    rawProtein: 10,   // Hallucinated (real USDA is ~62g)
    rawCarbs: 80,     // Hallucinated (chicken has 0g carbs)
    rawFat: 40,
  };

  const resolved = await reconcileFoodComponent(hallucinatedRaw);

  // Must be resolved from USDA Ground Truth, NOT the hallucinated LLM values!
  assert.strictEqual(resolved.nutritionSource, 'USDA');
  assert.strictEqual(resolved.grams, 200);
  // USDA 100g chicken breast is ~165 kcal, 31g protein, 0g carbs, 3.6g fat
  // At 200g: ~330 kcal, ~62g protein, 0g carbs, ~7.2g fat
  assert.strictEqual(resolved.calories, 330);
  assert.strictEqual(resolved.protein, 62);
  assert.strictEqual(resolved.carbs, 0);
  assert.ok(resolved.confidence >= 0.95);
  // Thermodynamic check
  assert.strictEqual(resolved.isUnreliable, false);
});

test('0-LLM Macro Resolution: Proportional scaling for custom portion sizes', async () => {
  // Test 150g Jasmine White Rice
  // USDA 100g: 130 kcal, 2.7g protein, 28.2g carbs, 0.3g fat
  const rawRice: RawGeminiComponent = {
    name: 'Jasmine Rice',
    estimatedGrams: 150,
    evidenceClass: 'visible',
  };

  const resolved = await reconcileFoodComponent(rawRice);
  assert.strictEqual(resolved.nutritionSource, 'USDA');
  assert.strictEqual(resolved.grams, 150);
  // 150 * 1.3 = 195 kcal
  assert.strictEqual(resolved.calories, 195);
  // 2.7 * 1.5 = 4.1g protein
  assert.strictEqual(resolved.protein, 4.1);
  // 28.2 * 1.5 = 42.3g carbs
  assert.strictEqual(resolved.carbs, 42.3);
  assert.strictEqual(resolved.isUnreliable, false);
});

test('Reconciliation Pipeline: Tier 0 Cache hit provides instant 0ms recall', async () => {
  const rawSalmon: RawGeminiComponent = {
    name: 'Atlantic Salmon Fillet',
    estimatedGrams: 150,
    evidenceClass: 'visible',
  };

  // First resolution (Tier 1 USDA match, writes to cache)
  const first = await reconcileFoodComponent(rawSalmon);
  assert.strictEqual(first.nutritionSource, 'USDA');

  // Second resolution (Tier 0 Cache hit)
  const cachedKey = cacheKeyFor('food', 'Atlantic Salmon Fillet_150g');
  const cachedItem = nutritionCache.get(cachedKey);
  assert.ok(cachedItem, 'Item must be stored in memory cache');
  assert.strictEqual(cachedItem.calories, first.calories);
  assert.strictEqual(cachedItem.protein, first.protein);
});

test('Thermodynamic Discrepancy Flagging on Fallback Items', async () => {
  // Item not in local USDA database with a 50% energy violation
  const unknownUnbalancedItem: RawGeminiComponent = {
    name: 'Exotic Space Berries',
    estimatedGrams: 100,
    evidenceClass: 'visible',
    rawCalories: 400, // Massive discrepancy: 2g protein (8), 5g carbs (20), 1g fat (9) = 37 kcal vs 400 kcal
    rawProtein: 2,
    rawCarbs: 5,
    rawFat: 1,
  };

  const resolved = await reconcileFoodComponent(unknownUnbalancedItem);
  assert.strictEqual(resolved.isUnreliable, true);
  assert.ok(resolved.atwaterValidation.discrepancyPercentage > 10.0);
  assert.strictEqual(resolved.atwaterValidation.status, 'unreliable');
});
