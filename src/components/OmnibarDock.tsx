import React, { useState } from 'react';
import {
  Mic,
  Camera,
  Search,
  Barcode,
  ShoppingBag,
  Sparkles,
  Plus,
  Trash2,
  Check,
  X,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { ComponentFoodItem, MealType } from '../types/diet';

interface OmnibarDockProps {
  onOpenPhotoLog: () => void;
  onOpenSearch: () => void;
}

export const OmnibarDock: React.FC<OmnibarDockProps> = ({ onOpenPhotoLog, onOpenSearch }) => {
  const { stagedBasket, addToStagedBasket, removeFromStagedBasket, updateStagedItemGrams, clearStagedBasket, logStagedBasketAsMeal } = useDiet();

  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [speechText, setSpeechText] = useState<string>('');
  const [isVoiceParsing, setIsVoiceParsing] = useState<boolean>(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const [isBasketOpen, setIsBasketOpen] = useState<boolean>(false);
  const [stagedMealName, setStagedMealName] = useState<string>('My Balanced Plate');
  const [stagedMealType, setStagedMealType] = useState<MealType>('Lunch');

  const [isBarcodeOpen, setIsBarcodeOpen] = useState<boolean>(false);
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [barcodeLoading, setBarcodeLoading] = useState<boolean>(false);
  const [barcodeResult, setBarcodeResult] = useState<any | null>(null);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Voice natural language parser
  const handleParseVoice = async (textToParse = speechText) => {
    if (!textToParse.trim()) return;
    setIsVoiceParsing(true);
    setVoiceError(null);

    try {
      const res = await fetch('/api/parse-voice-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speechText: textToParse }),
      });

      if (!res.ok) throw new Error('Failed to parse voice description');
      const data = await res.json();

      if (data.components && data.components.length > 0) {
        // Add to staged basket
        data.components.forEach((c: any) => {
          const comp: ComponentFoodItem = {
            id: c.id || `voice-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: c.name,
            mass: {
              p10: c.p10Grams || Math.round((c.estimatedGrams || c.grams || 100) * 0.85),
              p50: c.estimatedGrams || c.grams || 100,
              p90: c.p90Grams || Math.round((c.estimatedGrams || c.grams || 100) * 1.2),
              unit: 'g',
            },
            grams: c.estimatedGrams || c.grams || 100,
            calories: c.rawCalories ?? c.calories ?? 150,
            protein: c.rawProtein ?? c.protein ?? 10,
            carbs: c.rawCarbs ?? c.carbs ?? 10,
            fat: c.rawFat ?? c.fat ?? 5,
            fiber: c.rawFiber ?? c.fiber ?? 0,
            sugar: c.rawSugar ?? c.sugar ?? undefined,
            sodium_mg: c.rawSodiumMg ?? c.sodium_mg ?? undefined,
            evidenceClass: c.evidenceClass || 'user_confirmed',
            nutritionSource: c.nutritionSource || 'USDA',
            confidence: c.nutritionSource === 'USDA' ? 0.98 : (c.nutritionSource === 'OPEN_FOOD_FACTS' ? 0.95 : 0.88),
            atwaterValidation: c.atwaterValidation,
            isUnreliable: !!c.isUnreliable,
            referencePortionBenchmark: c.referencePortionBenchmark,
          };
          addToStagedBasket(comp);
        });

        setIsVoiceOpen(false);
        setSpeechText('');
        setIsBasketOpen(true);
      } else {
        setVoiceError('Could not isolate distinct food items. Please try speaking naturally with portions.');
      }
    } catch (err: any) {
      setVoiceError(err.message || 'Error processing speech transcription');
    } finally {
      setIsVoiceParsing(false);
    }
  };

  // Barcode lookup
  const handleBarcodeSearch = async () => {
    if (!barcodeInput.trim()) return;
    setBarcodeLoading(true);
    setBarcodeError(null);
    setBarcodeResult(null);

    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(barcodeInput.trim())}`);
      if (!res.ok) throw new Error('Product not found in Open Food Facts verified database.');
      const data = await res.json();
      setBarcodeResult(data);
    } catch (e: any) {
      setBarcodeError(e.message || 'Barcode scan failed');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const handleAddBarcodeItem = () => {
    if (!barcodeResult) return;
    const ratio = (barcodeResult.servingGrams || 100) / 100;
    const comp: ComponentFoodItem = {
      id: `bc-${Date.now()}`,
      name: `${barcodeResult.productName} ${barcodeResult.brand ? `(${barcodeResult.brand})` : ''}`,
      mass: {
        p10: Math.round(barcodeResult.servingGrams * 0.9),
        p50: barcodeResult.servingGrams,
        p90: Math.round(barcodeResult.servingGrams * 1.1),
        unit: 'g',
      },
      grams: barcodeResult.servingGrams,
      calories: Math.round(barcodeResult.calories100g * ratio),
      protein: Math.round(barcodeResult.protein100g * ratio * 10) / 10,
      carbs: Math.round(barcodeResult.carbs100g * ratio * 10) / 10,
      fat: Math.round(barcodeResult.fat100g * ratio * 10) / 10,
      fiber: Math.round((barcodeResult.fiber100g || 0) * ratio * 10) / 10,
      evidenceClass: 'user_confirmed',
      nutritionSource: 'OPEN_FOOD_FACTS',
      confidence: 0.99,
    };

    addToStagedBasket(comp);
    setIsBarcodeOpen(false);
    setBarcodeResult(null);
    setBarcodeInput('');
    setIsBasketOpen(true);
  };

  const stagedCalories = stagedBasket.reduce((sum, c) => sum + c.calories, 0);

  return (
    <>
      {/* Floating Action Omnibar Dock (Center Bottom - positioned cleanly above mobile nav bar on phones) */}
      <div className="fixed bottom-16 md:bottom-5 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-xl border border-stone-200/90 shadow-xl rounded-full p-1.5 flex items-center gap-1.5 pointer-events-auto">
          {/* Voice Dictation */}
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Voice Meal Dictation"
          >
            <Mic className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Instant Photo Snap */}
          <button
            onClick={onOpenPhotoLog}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-950/20 transition-all cursor-pointer active:scale-95"
            title="Instant Photo Capture"
          >
            <Camera className="w-4 h-4" />
            <span>Snap Photo</span>
          </button>

          {/* Barcode Scanner */}
          <button
            onClick={() => setIsBarcodeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Barcode Scanner"
          >
            <Barcode className="w-4 h-4 text-stone-600" />
            <span className="hidden sm:inline">Barcode</span>
          </button>

          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            title="Search Food Database"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Staging Basket Indicator (MacroFactor's Winning Feature) */}
          {stagedBasket.length > 0 && (
            <button
              onClick={() => setIsBasketOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all cursor-pointer animate-pulse"
              title="View Staged Plate Basket"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{stagedBasket.length} staged</span>
            </button>
          )}
        </div>
      </div>

      {/* Voice Dictation Drawer / Modal */}
      {isVoiceOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold font-display text-stone-900">
                  Voice & Natural Language Logging
                </h3>
              </div>
              <button
                onClick={() => setIsVoiceOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              Describe your meal naturally. NIPE-v1 extracts ingredients, cooking mediums, and portions automatically:
            </p>

            <textarea
              id="voice-speech-input"
              name="speechText"
              aria-label="Spoken or typed meal description"
              rows={3}
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              placeholder="e.g. 3 scrambled eggs with butter, two slices of sourdough toast, and half an avocado..."
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-500"
            />

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="text-stone-400">Try:</span>
              <button
                onClick={() => handleParseVoice('200g grilled chicken breast with 1 cup brown rice and steamed broccoli')}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                Chicken & Rice Bowl
              </button>
              <button
                onClick={() => handleParseVoice('Two fried eggs on sourdough toast with half an avocado')}
                className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                Avocado Toast & Eggs
              </button>
            </div>

            {voiceError && (
              <div className="p-3 rounded-xl bg-amber-50 text-xs text-amber-800 border border-amber-200">
                {voiceError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsVoiceOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleParseVoice()}
                disabled={isVoiceParsing || !speechText.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isVoiceParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Parse & Stage Plate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {isBarcodeOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold font-display text-stone-900">
                  Barcode Product Lookup
                </h3>
              </div>
              <button
                onClick={() => setIsBarcodeOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500">
              Enter any retail product barcode (UPC / EAN) to query Open Food Facts verified database directly:
            </p>

            <div className="flex gap-2">
              <input
                id="barcode-lookup-input"
                name="barcode"
                aria-label="Retail product barcode UPC or EAN"
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="e.g. 737628064502 (Chobani Yogurt) or 5449000000996"
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleBarcodeSearch}
                disabled={barcodeLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer"
              >
                {barcodeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lookup'}
              </button>
            </div>

            {/* Test Barcode Pills */}
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
              <span>Test Barcodes:</span>
              <button
                onClick={() => { setBarcodeInput('737628064502'); }}
                className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono"
              >
                Chobani Greek
              </button>
              <button
                onClick={() => { setBarcodeInput('0049000006346'); }}
                className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono"
              >
                Coca Cola
              </button>
            </div>

            {barcodeError && (
              <div className="p-3 rounded-xl bg-amber-50 text-xs text-amber-800 border border-amber-200">
                {barcodeError}
              </div>
            )}

            {barcodeResult && (
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="font-bold text-sm text-stone-900">{barcodeResult.productName}</div>
                <div className="text-xs text-stone-500 font-mono">
                  {barcodeResult.calories100g} kcal/100g · P:{barcodeResult.protein100g}g · C:{barcodeResult.carbs100g}g · F:{barcodeResult.fat100g}g
                </div>
                <button
                  onClick={handleAddBarcodeItem}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer mt-2"
                >
                  + Add to Staging Basket ({barcodeResult.servingGrams}g)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* "Food Plate" Staging Basket Drawer (Batch Logging) */}
      {isBasketOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-stone-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold font-display text-stone-900">
                  Food Plate Staging Basket ({stagedBasket.length} items)
                </h3>
              </div>
              <button
                onClick={() => setIsBasketOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meal Title & Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                id="staged-meal-name-input"
                name="stagedMealName"
                aria-label="Meal Plate Name"
                type="text"
                value={stagedMealName}
                onChange={(e) => setStagedMealName(e.target.value)}
                placeholder="Meal Plate Name"
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none"
              />
              <div className="flex items-center gap-1">
                {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStagedMealType(t)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                      stagedMealType === t ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Staged Items List with Single-Tap Portion Adjusters */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {stagedBasket.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">{item.name}</span>
                      <span className="text-[11px] text-stone-500 font-mono">
                        {item.calories} kcal · P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-stone-800">{item.grams}g</span>
                      <button
                        onClick={() => removeFromStagedBasket(item.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* One-Tap Portion Adjusters (+10g, +25g, x1.5) */}
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      onClick={() => updateStagedItemGrams(item.id, Math.max(5, item.grams - 25))}
                      className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      -25g
                    </button>
                    <button
                      onClick={() => updateStagedItemGrams(item.id, item.grams + 10)}
                      className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      +10g
                    </button>
                    <button
                      onClick={() => updateStagedItemGrams(item.id, item.grams + 25)}
                      className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      +25g
                    </button>
                    <button
                      onClick={() => updateStagedItemGrams(item.id, Math.round(item.grams * 1.5))}
                      className="px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer"
                    >
                      x1.5
                    </button>
                  </div>
                </div>
              ))}

              {stagedBasket.length === 0 && (
                <div className="text-center py-6 text-xs text-stone-400">
                  Staging basket is empty. Add items using Photo, Voice, or Barcode above!
                </div>
              )}
            </div>

            {/* Total and Batch Log CTA */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-stone-400 uppercase">Total Staged</span>
                <div className="text-xl font-bold font-mono text-stone-900">{stagedCalories} kcal</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={clearStagedBasket}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Clear
                </button>
                <button
                  onClick={async () => {
                    await logStagedBasketAsMeal(stagedMealName, stagedMealType);
                    setIsBasketOpen(false);
                  }}
                  disabled={stagedBasket.length === 0}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-40 cursor-pointer"
                >
                  Log All ({stagedBasket.length} items)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
