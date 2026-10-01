import { ComponentFoodItem, EvidenceClass, NutritionSource, AtwaterDiagnostic, MassDistribution, AtwaterValidationResult } from '../types/diet';
import { USDA_REFERENCE_DATABASE, searchUsdaFoods, UsdaReferenceItem } from '../data/usdaDatabase';
import { validateAtwaterThermodynamics, autoCalibrateItemToAtwater } from '../utils/atwaterValidator';

export { validateAtwaterThermodynamics, autoCalibrateItemToAtwater };

export interface RawGeminiComponent {
  name: string;
  estimatedGrams: number;
  p10Grams?: number;
  p90Grams?: number;
  evidenceClass: 'visible' | 'context_derived' | 'unobservable_unknown' | 'user_confirmed';
  rawCalories?: number;
  rawProtein?: number;
  rawCarbs?: number;
  rawFat?: number;
  rawFiber?: number;
  rawSugar?: number;
  rawSodiumMg?: number;
  uncertaintyNote?: string;
  servingDescription?: string;
}

/**
 * Generates a stable deterministic cache key for food queries
 */
export function cacheKeyFor(prefix: string, value: string): string {
  const str = value.trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${prefix}_${Math.abs(hash).toString(16)}`;
}

/**
 * In-Memory Nutrition Cache with TTL (default 24 hours)
 */
class MemoryNutritionCache {
  private store = new Map<string, { expiresAt: number; data: ComponentFoodItem }>();
  private readonly defaultTtlMs = 24 * 60 * 60 * 1000;

  get(key: string): ComponentFoodItem | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: ComponentFoodItem, ttlMs?: number): void {
    if (this.store.size > 5000) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
      data,
    });
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}

export const nutritionCache = new MemoryNutritionCache();

/**
 * Atwater diagnostic check:
 * Canonical energy is preserved; computes 4P + 4C + 9F delta.
 */
export function computeAtwaterDiagnostic(
  canonicalCalories: number,
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
): AtwaterDiagnostic {
  const atwaterCalculated = Math.round(
    Math.max(0, proteinGrams) * 4 +
    Math.max(0, carbsGrams) * 4 +
    Math.max(0, fatGrams) * 9
  );

  const deltaCalories = canonicalCalories - atwaterCalculated;
  const deltaPercentage = canonicalCalories > 0
    ? Math.round((Math.abs(deltaCalories) / canonicalCalories) * 100 * 10) / 10
    : 0;

  let status: AtwaterDiagnostic['status'] = 'concordant';
  let diagnosticNote = 'Canonical energy aligns with Atwater thermodynamic factor expectations.';

  if (deltaPercentage > 15) {
    status = 'thermodynamic_variance';
    diagnosticNote = `Note: Canonical database value (${canonicalCalories} kcal) differs by ${deltaPercentage}% from Atwater factors (${atwaterCalculated} kcal). Canonical source energy preserved.`;
  } else if (deltaPercentage > 6) {
    status = 'minor_discrepancy';
    diagnosticNote = `Minor expected variance (${deltaPercentage}%) from natural food moisture/fiber variation. Database energy canonical.`;
  }

  return {
    canonicalCalories,
    atwaterCalculatedCalories: atwaterCalculated,
    deltaCalories,
    deltaPercentage,
    status,
    diagnosticNote,
  };
}

/**
 * Live USDA FoodData Central REST API lookup
 * Public DEMO_KEY or user-provided USDA_API_KEY
 */
export async function queryLiveUsdaApi(
  query: string,
  targetGrams = 100,
  apiKey = 'DEMO_KEY'
): Promise<ComponentFoodItem | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey)}&query=${encodeURIComponent(query)}&pageSize=1`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.foods || data.foods.length === 0) return null;

    const food = data.foods[0];
    const nutrients: Record<number, number> = {};

    for (const n of food.foodNutrients || []) {
      const id = Number(n.nutrientNumber || n.nutrientId);
      const val = Number(n.value || n.amount);
      if (!isNaN(id) && !isNaN(val)) {
        nutrients[id] = val;
      }
    }

    const cal100g = nutrients[1008] || 0; // Energy (kcal)
    const p100g = nutrients[1003] || 0;   // Protein (g)
    const f100g = nutrients[1004] || 0;   // Total lipid / fat (g)
    const c100g = nutrients[1005] || 0;   // Carbohydrate (g)
    const fib100g = nutrients[1079] || 0; // Dietary fiber (g)
    const sug100g = nutrients[2000] || 0; // Total Sugars (g)
    const sod100g = nutrients[1093] || 0; // Sodium (mg)

    const scale = targetGrams / 100;
    const calories = Math.round(cal100g * scale);
    const protein = Math.round(p100g * scale * 10) / 10;
    const carbs = Math.round(c100g * scale * 10) / 10;
    const fat = Math.round(f100g * scale * 10) / 10;
    const fiber = Math.round(fib100g * scale * 10) / 10;
    const sugar = Math.round(sug100g * scale * 10) / 10;
    const sodium_mg = Math.round(sod100g * scale);

    const validation = validateAtwaterThermodynamics(calories, protein, carbs, fat);

    return {
      id: `usda-live-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: food.description || query,
      mass: {
        p10: Math.round(targetGrams * 0.85),
        p50: targetGrams,
        p90: Math.round(targetGrams * 1.15),
        unit: 'g',
      },
      grams: targetGrams,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium_mg,
      evidenceClass: 'visible',
      nutritionSource: 'USDA',
      confidence: 0.98,
      atwaterValidation: validation,
      isUnreliable: validation.isUnreliable,
      referencePortionBenchmark: `${targetGrams}g portion (USDA FoodData Central)`,
    };
  } catch {
    return null;
  }
}

/**
 * Live Open Food Facts API query (Text Search)
 * Completely free, no API key required
 */
export async function queryLiveOpenFoodFacts(
  query: string,
  targetGrams = 100
): Promise<ComponentFoodItem | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=1`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'VibeDiet-App/1.0 (nutrition-tracker)' },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.products || data.products.length === 0) return null;

    const prod = data.products[0];
    const nutriments = prod.nutriments || {};

    // Check serving-level vs 100g
    const servingGrams = prod.serving_quantity ? parseFloat(prod.serving_quantity) : null;
    const calServing = parseFloat(nutriments['energy-kcal_serving'] || '0');
    const pServing = parseFloat(nutriments['proteins_serving'] || '0');
    const cServing = parseFloat(nutriments['carbohydrates_serving'] || '0');
    const fServing = parseFloat(nutriments['fat_serving'] || '0');

    let cal100g = parseFloat(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || '0');
    let p100g = parseFloat(nutriments['proteins_100g'] || nutriments['proteins'] || '0');
    let c100g = parseFloat(nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || '0');
    let f100g = parseFloat(nutriments['fat_100g'] || nutriments['fat'] || '0');
    let fib100g = parseFloat(nutriments['fiber_100g'] || nutriments['fiber'] || '0');
    let sug100g = parseFloat(nutriments['sugars_100g'] || nutriments['sugars'] || '0');
    let sodRaw = parseFloat(nutriments['sodium_100g'] || nutriments['sodium'] || '0');
    // Open Food Facts often stores sodium in grams
    let sodMg = sodRaw <= 2.0 && sodRaw > 0 ? sodRaw * 1000 : sodRaw;

    if (cal100g <= 0 && calServing > 0 && servingGrams && servingGrams > 0) {
      cal100g = (calServing / servingGrams) * 100;
      p100g = (pServing / servingGrams) * 100;
      c100g = (cServing / servingGrams) * 100;
      f100g = (fServing / servingGrams) * 100;
    }

    if (cal100g <= 0) return null;

    const scale = targetGrams / 100;
    const calories = Math.round(cal100g * scale);
    const protein = Math.round(p100g * scale * 10) / 10;
    const carbs = Math.round(c100g * scale * 10) / 10;
    const fat = Math.round(f100g * scale * 10) / 10;
    const fiber = Math.round(fib100g * scale * 10) / 10;
    const sugar = Math.round(sug100g * scale * 10) / 10;
    const sodium_mg = Math.round(sodMg * scale);

    const validation = validateAtwaterThermodynamics(calories, protein, carbs, fat);

    return {
      id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: prod.product_name || query,
      mass: {
        p10: Math.round(targetGrams * 0.85),
        p50: targetGrams,
        p90: Math.round(targetGrams * 1.15),
        unit: 'g',
      },
      grams: targetGrams,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      sugar,
      sodium_mg,
      evidenceClass: 'visible',
      nutritionSource: 'OPEN_FOOD_FACTS',
      confidence: 0.95,
      atwaterValidation: validation,
      isUnreliable: validation.isUnreliable,
      referencePortionBenchmark: `${targetGrams}g (Open Food Facts Database)`,
    };
  } catch {
    return null;
  }
}

/**
 * Tiered Nutrition Reconciliation:
 * Prioritizes deterministic verified databases over LLMs.
 * 
 * Pipeline:
 * Priority 0: Nutrition Cache (0ms instant lookup)
 * Priority 1: Local Curated USDA Database (offline instant match)
 * Priority 2: Live USDA FoodData Central API
 * Priority 3: Open Food Facts Database (packaged & brand items)
 * Priority 4: Gemini Multimodal Vision estimate (strictly as last-resort fallback)
 */
export async function reconcileFoodComponent(raw: RawGeminiComponent): Promise<ComponentFoodItem> {
  const p50 = Math.max(5, Math.round(raw.estimatedGrams || 100));
  const cleanName = raw.name.trim();

  // Tier 0: Check Nutrition Cache
  const cacheKey = cacheKeyFor('food', `${cleanName}_${p50}g`);
  const cached = nutritionCache.get(cacheKey);
  if (cached) {
    return {
      ...cached,
      id: `cached-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
  }

  const mass: MassDistribution = {
    p10: Math.max(2, Math.round(raw.p10Grams || p50 * 0.82)),
    p50,
    p90: Math.round(raw.p90Grams || (raw.evidenceClass === 'unobservable_unknown' ? p50 * 1.35 : p50 * 1.18)),
    unit: 'g',
  };

  const finalizeAndCache = (comp: Omit<ComponentFoodItem, 'atwaterValidation' | 'isUnreliable'>): ComponentFoodItem => {
    const atwaterValidation = validateAtwaterThermodynamics(
      comp.calories,
      comp.protein,
      comp.carbs,
      comp.fat
    );

    const result: ComponentFoodItem = {
      ...comp,
      atwaterValidation,
      isUnreliable: atwaterValidation.isUnreliable,
    };

    nutritionCache.set(cacheKey, result);
    return result;
  };

  // Tier 1: Local Curated USDA Reference Database Match (instant offline)
  const usdaMatches = searchUsdaFoods(cleanName);
  if (usdaMatches.length > 0) {
    const match = usdaMatches[0];
    const ratio = p50 / 100;
    return finalizeAndCache({
      id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: match.name,
      mass,
      grams: p50,
      calories: Math.round(match.caloriesPer100g * ratio),
      protein: Math.round(match.proteinPer100g * ratio * 10) / 10,
      carbs: Math.round(match.carbsPer100g * ratio * 10) / 10,
      fat: Math.round(match.fatPer100g * ratio * 10) / 10,
      fiber: Math.round((match.fiberPer100g || 0) * ratio * 10) / 10,
      evidenceClass: raw.evidenceClass || 'visible',
      nutritionSource: 'USDA',
      confidence: 0.98,
      uncertaintyNote: raw.uncertaintyNote,
      referencePortionBenchmark: `${p50}g portion (USDA Ground Truth)`,
    });
  }

  // Tier 2: Live USDA FoodData Central API
  const liveUsda = await queryLiveUsdaApi(cleanName, p50);
  if (liveUsda) {
    nutritionCache.set(cacheKey, liveUsda);
    return liveUsda;
  }

  // Tier 3: Open Food Facts API (for packaged/branded items)
  const offItem = await queryLiveOpenFoodFacts(cleanName, p50);
  if (offItem) {
    nutritionCache.set(cacheKey, offItem);
    return offItem;
  }

  // Tier 4: Fallback to Gemini estimate only if NO database had the food item
  const rawCal = raw.rawCalories && raw.rawCalories > 0 ? raw.rawCalories : Math.round(p50 * 1.5);
  const rawP = raw.rawProtein !== undefined ? raw.rawProtein : Math.round(p50 * 0.1 * 10) / 10;
  const rawC = raw.rawCarbs !== undefined ? raw.rawCarbs : Math.round(p50 * 0.15 * 10) / 10;
  const rawF = raw.rawFat !== undefined ? raw.rawFat : Math.round(p50 * 0.05 * 10) / 10;

  return finalizeAndCache({
    id: `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    mass,
    grams: p50,
    calories: Math.round(rawCal),
    protein: Math.round(rawP * 10) / 10,
    carbs: Math.round(rawC * 10) / 10,
    fat: Math.round(rawF * 10) / 10,
    fiber: raw.rawFiber ? Math.round(raw.rawFiber * 10) / 10 : undefined,
    sugar: raw.rawSugar ? Math.round(raw.rawSugar * 10) / 10 : undefined,
    sodium_mg: raw.rawSodiumMg ? Math.round(raw.rawSodiumMg) : undefined,
    evidenceClass: raw.evidenceClass || 'visible',
    nutritionSource: 'GEMINI_ESTIMATE',
    confidence: 0.82,
    uncertaintyNote: raw.uncertaintyNote || 'Estimated via generative vision; unverified against USDA/OFF.',
    referencePortionBenchmark: `${p50}g portion`,
  });
}
