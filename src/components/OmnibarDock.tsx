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
import { motion, AnimatePresence } from 'motion/react';
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
      {/* Floating Action Omnibar Dock (Dynamic Island Style) */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
        className="fixed bottom-16 md:bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/90 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04)] rounded-full p-1.5 flex items-center gap-1.5 pointer-events-auto">
          {/* Voice Dictation */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setIsVoiceOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-100/70 transition-colors cursor-pointer"
            title="Voice Meal Dictation"
          >
            <Mic className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Voice</span>
          </motion.button>

          {/* Instant Photo Snap - Radiant Primary Hero Pill */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={onOpenPhotoLog}
            className="flex items-center gap-2 px-4.5 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            title="Instant Photo Capture"
          >
            <Camera className="w-4 h-4" />
            <span>Snap Photo</span>
          </motion.button>

          {/* Barcode Scanner */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setIsBarcodeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-100/70 transition-colors cursor-pointer"
            title="Barcode Scanner"
          >
            <Barcode className="w-4 h-4 text-stone-600" />
            <span className="hidden sm:inline">Barcode</span>
          </motion.button>

          {/* Quick Search */}
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={onOpenSearch}
            className="p-2 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100/70 transition-colors cursor-pointer"
            title="Search Food Database"
          >
            <Search className="w-4 h-4" />
          </motion.button>

          {/* Staging Basket Indicator (Interactive animated pill) */}
          {stagedBasket.length > 0 && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => setIsBasketOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 transition-all cursor-pointer"
              title="View Staged Plate Basket"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{stagedBasket.length} staged</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Voice Dictation Drawer / Modal */}
      <AnimatePresence>
        {isVoiceOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-white/80 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                    <Mic className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-base font-bold font-display text-stone-900">
                    Voice & Natural Language Logging
                  </h3>
                </div>
                <button
                  onClick={() => setIsVoiceOpen(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
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
                className="w-full bg-stone-50/80 border border-stone-200/90 rounded-2xl p-3.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
              />

              {/* Quick Suggestions */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-stone-400">Try:</span>
                <button
                  onClick={() => handleParseVoice('200g grilled chicken breast with 1 cup brown rice and steamed broccoli')}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
                >
                  Chicken & Rice Bowl
                </button>
                <button
                  onClick={() => handleParseVoice('Two fried eggs on sourdough toast with half an avocado')}
                  className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/80 text-stone-700 transition-colors cursor-pointer"
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleParseVoice()}
                  disabled={isVoiceParsing || !speechText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 cursor-pointer transition-all"
                >
                  {isVoiceParsing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  Parse & Stage Plate
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {isBarcodeOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 max-w-md w-full border border-white/80 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.18)] space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200">
                    <Barcode className="w-4 h-4 text-stone-700" />
                  </div>
                  <h3 className="text-base font-bold font-display text-stone-900">
                    Barcode Product Lookup
                  </h3>
                </div>
                <button
                  onClick={() => setIsBarcodeOpen(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
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
                  className="flex-1 bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-xs font-mono text-stone-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBarcodeSearch}
                  disabled={barcodeLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {barcodeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Lookup'}
                </motion.button>
              </div>

              {/* Test Barcode Pills */}
              <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                <span>Test Barcodes:</span>
                <button
                  onClick={() => { setBarcodeInput('737628064502'); }}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono transition-colors"
                >
                  Chobani Greek
                </button>
                <button
                  onClick={() => { setBarcodeInput('0049000006346'); }}
                  className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-mono transition-colors"
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
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-stone-50/90 border border-stone-200 space-y-2.5"
                >
                  <div className="font-bold text-sm text-stone-900">{barcodeResult.productName}</div>
                  <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-md bg-stone-200/70 text-stone-800 font-bold">{barcodeResult.calories100g} kcal/100g</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">P: {barcodeResult.protein100g}g</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-medium">C: {barcodeResult.carbs100g}g</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-medium">F: {barcodeResult.fat100g}g</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleAddBarcodeItem}
                    className="w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-md shadow-emerald-600/20 mt-1"
                  >
                    + Add to Staging Basket ({barcodeResult.servingGrams}g)
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "Food Plate" Staging Basket Drawer (Batch Logging) */}
      <AnimatePresence>
        {isBasketOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-white/95 backdrop-blur-2xl rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-white/80 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.2)] space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="text-base font-bold font-display text-stone-900">
                    Food Plate Staging Basket ({stagedBasket.length} items)
                  </h3>
                </div>
                <button
                  onClick={() => setIsBasketOpen(false)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
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
                  className="bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center gap-1 bg-stone-100/70 p-1 rounded-xl">
                  {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setStagedMealType(t)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        stagedMealType === t ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-600 hover:text-stone-900'
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
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-3.5 rounded-2xl bg-stone-50/90 border border-stone-200/90 flex flex-col gap-2 hover:border-stone-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-stone-900 block">{item.name}</span>
                        <span className="text-[11px] text-stone-500 font-mono">
                          {item.calories} kcal · P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-stone-800 bg-white px-2 py-0.5 rounded-md border border-stone-200">{item.grams}g</span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => removeFromStagedBasket(item.id)}
                          className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>

                    {/* One-Tap Portion Adjusters (+10g, +25g, x1.5) */}
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateStagedItemGrams(item.id, Math.max(5, item.grams - 25))}
                        className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        -25g
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateStagedItemGrams(item.id, item.grams + 10)}
                        className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        +10g
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateStagedItemGrams(item.id, item.grams + 25)}
                        className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        +25g
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => updateStagedItemGrams(item.id, Math.round(item.grams * 1.5))}
                        className="px-2 py-0.5 rounded-md bg-white border border-stone-200 text-stone-600 hover:bg-stone-100 cursor-pointer font-medium"
                      >
                        x1.5
                      </motion.button>
                    </div>
                  </motion.div>
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
                  <div className="text-2xl font-extrabold font-mono text-stone-900">{stagedCalories} kcal</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={clearStagedBasket}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                  >
                    Clear
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={async () => {
                      await logStagedBasketAsMeal(stagedMealName, stagedMealType);
                      setIsBasketOpen(false);
                    }}
                    disabled={stagedBasket.length === 0}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    Log All ({stagedBasket.length} items)
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
