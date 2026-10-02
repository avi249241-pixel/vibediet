import React, { useState } from 'react';
import { PenTool, Plus, Trash2, CheckCircle2, Search, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { ComponentFoodItem, EvidenceClass, FoodItem, MealType } from '../types/diet';
import { useDiet, getTodayDateString } from '../context/DietContext';
import { USDA_REFERENCE_DATABASE, searchUsdaFoods, buildComponentFromUsda } from '../data/usdaDatabase';
import { computeAtwaterDiagnostic } from '../lib/nutritionReconciliation';

interface ManualEntryScreenProps {
  onSaved: () => void;
}

export const ManualEntryScreen: React.FC<ManualEntryScreenProps> = ({ onSaved }) => {
  const { addMeal, addToStagedBasket } = useDiet();

  const [mealName, setMealName] = useState<string>('Custom Healthy Meal');
  const [mealType, setMealType] = useState<MealType>('Lunch');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCustomOpen, setIsCustomOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customGrams, setCustomGrams] = useState<number>(100);
  const [customCalories, setCustomCalories] = useState<number>(150);
  const [customProtein, setCustomProtein] = useState<number>(10);
  const [customCarbs, setCustomCarbs] = useState<number>(15);
  const [customFat, setCustomFat] = useState<number>(5);
  const [components, setComponents] = useState<ComponentFoodItem[]>([
    {
      id: 'c1',
      name: 'Grilled Chicken Breast',
      mass: { p10: 120, p50: 150, p90: 170, unit: 'g' },
      grams: 150,
      calories: 248,
      protein: 46.5,
      carbs: 0,
      fat: 5.4,
      evidenceClass: 'user_confirmed',
      nutritionSource: 'USDA',
      confidence: 1.0,
    },
    {
      id: 'c2',
      name: 'Cooked Jasmine White Rice',
      mass: { p10: 120, p50: 150, p90: 180, unit: 'g' },
      grams: 150,
      calories: 195,
      protein: 4.1,
      carbs: 42.3,
      fat: 0.5,
      evidenceClass: 'user_confirmed',
      nutritionSource: 'USDA',
      confidence: 1.0,
    },
  ]);

  // Totals
  const totalCalories = components.reduce((sum, c) => sum + c.calories, 0);
  const totalProtein = Math.round(components.reduce((sum, c) => sum + c.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(components.reduce((sum, c) => sum + c.carbs, 0) * 10) / 10;
  const totalFat = Math.round(components.reduce((sum, c) => sum + c.fat, 0) * 10) / 10;

  const atwaterDiagnostic = computeAtwaterDiagnostic(totalCalories, totalProtein, totalCarbs, totalFat);

  const handleUpdateGrams = (id: string, newGrams: number) => {
    const safeGrams = Math.max(1, newGrams);
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const ratio = safeGrams / (c.grams || 1);
        return {
          ...c,
          grams: safeGrams,
          calories: Math.round(c.calories * ratio),
          protein: Math.round(c.protein * ratio * 10) / 10,
          carbs: Math.round(c.carbs * ratio * 10) / 10,
          fat: Math.round(c.fat * ratio * 10) / 10,
          evidenceClass: 'user_confirmed',
        };
      })
    );
  };

  const handleAddFromUsda = (refId: string) => {
    const comp = buildComponentFromUsda(refId, 100, 'user_confirmed');
    if (comp) {
      setComponents((prev) => [
        ...prev,
        {
          ...comp,
          mass: { p10: 85, p50: 100, p90: 120, unit: 'g' },
          nutritionSource: 'USDA',
          confidence: 1.0,
        },
      ]);
      setSearchQuery('');
    }
  };

  const handleAddCustom = () => {
    if (!customName.trim()) return;
    const newComp: ComponentFoodItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      mass: {
        p10: Math.round(customGrams * 0.85),
        p50: customGrams,
        p90: Math.round(customGrams * 1.2),
        unit: 'g',
      },
      grams: customGrams,
      calories: customCalories,
      protein: customProtein,
      carbs: customCarbs,
      fat: customFat,
      evidenceClass: 'user_confirmed',
      nutritionSource: 'LOCAL_FALLBACK',
      confidence: 1.0,
    };
    setComponents((prev) => [...prev, newComp]);
    setIsCustomOpen(false);
    setCustomName('');
  };

  const handleSave = async () => {
    if (components.length === 0) return;

    const newFoodItem: FoodItem = {
      id: `manual-${Date.now()}`,
      name: mealName.trim() || 'Manual Meal',
      mealType,
      calories: totalCalories,
      minCalories: Math.round(totalCalories * 0.9),
      maxCalories: Math.round(totalCalories * 1.15),
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      evidenceClassCounts: {
        visible: 0,
        context_derived: 0,
        user_confirmed: components.length,
        unobservable_unknown: 0,
      },
      hasUnobservableUnknown: false,
      nutritionSource: 'USDA',
      confidence: 1.0,
      foods: components,
      atwaterDiagnostic,
      timestamp: Date.now(),
      date: getTodayDateString(),
    };

    await addMeal(newFoodItem);
    onSaved();
  };

  const searchResults = searchUsdaFoods(searchQuery);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div>
          <h2 className="text-xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <PenTool className="w-4.5 h-4.5" />
            </div>
            Manual Meal Entry
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Always available offline-ready fallback. Search verified USDA foods or enter custom ingredients.
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-stone-100">
          <div>
            <label htmlFor="manual-meal-name" className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Meal Name
            </label>
            <input
              id="manual-meal-name"
              name="mealName"
              aria-label="Meal Name"
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              className="w-full text-base font-bold text-stone-900 bg-stone-50/80 border border-stone-200/90 rounded-2xl px-4 py-2 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Meal Type
            </label>
            <div className="flex items-center gap-1 bg-stone-100/70 p-1 rounded-xl">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((t) => (
                <motion.button
                  key={t}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMealType(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mealType === t
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {t}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Ingredient Search & Custom Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="manual-usda-search" className="text-xs font-bold text-stone-800 flex items-center gap-1.5 cursor-pointer">
              <Search className="w-3.5 h-3.5 text-stone-400" />
              Add Ingredients
            </label>
            <button
              onClick={() => setIsCustomOpen(!isCustomOpen)}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer transition-colors"
            >
              {isCustomOpen ? 'Switch to USDA Search' : '+ Add Custom Ingredient'}
            </button>
          </div>

          {!isCustomOpen ? (
            <>
              <input
                id="manual-usda-search"
                name="searchQuery"
                aria-label="Search USDA database"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search USDA database (e.g. eggs, steak, sweet potato, oats, banana)..."
                className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3.5 py-2 text-xs text-stone-900 focus:outline-none focus:border-emerald-500 font-medium"
              />

              {searchQuery && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-stone-50/80 rounded-2xl border border-stone-200/80 scrollbar-thin">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-stone-200/90 text-xs hover:border-emerald-200 transition-colors"
                    >
                      <div>
                        <span className="font-bold text-stone-850">{item.name}</span>
                        <span className="text-[11px] text-stone-400 block font-mono">
                          {item.caloriesPer100g} kcal/100g · P:{item.proteinPer100g}g C:{item.carbsPer100g}g F:{item.fatPer100g}g
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddFromUsda(item.id)}
                        className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                      >
                        + Add (100g)
                      </motion.button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-stone-50/90 border border-stone-200 space-y-3"
            >
              <div className="text-xs font-bold text-stone-800">Custom Ingredient Details</div>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div className="col-span-2">
                  <label htmlFor="custom-food-name" className="text-[10px] text-stone-400 block font-semibold">Name</label>
                  <input
                    id="custom-food-name"
                    name="customFoodName"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Grandma's Meatloaf"
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="custom-food-grams" className="text-[10px] text-stone-400 block font-semibold">Grams</label>
                  <input
                    id="custom-food-grams"
                    name="customFoodGrams"
                    type="number"
                    value={customGrams}
                    onChange={(e) => setCustomGrams(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="custom-food-calories" className="text-[10px] text-stone-400 block font-semibold">Calories</label>
                  <input
                    id="custom-food-calories"
                    name="customFoodCalories"
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="custom-food-protein" className="text-[10px] text-stone-400 block font-semibold">Protein (g)</label>
                  <input
                    id="custom-food-protein"
                    name="customFoodProtein"
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="custom-food-carbs" className="text-[10px] text-stone-400 block font-semibold">Carbs (g)</label>
                  <input
                    id="custom-food-carbs"
                    name="customFoodCarbs"
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="custom-food-fat" className="text-[10px] text-stone-400 block font-semibold">Fat (g)</label>
                  <input
                    id="custom-food-fat"
                    name="customFoodFat"
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setIsCustomOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-stone-700 cursor-pointer"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddCustom}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  Add Ingredient
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Current Items */}
        <div className="space-y-2.5">
          <span className="text-xs font-bold text-stone-800 block">Current Ingredients ({components.length})</span>
          {components.map((comp) => (
            <motion.div
              key={comp.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/90 flex items-center justify-between gap-3 hover:border-stone-300 transition-colors"
            >
              <div>
                <span className="text-sm font-bold text-stone-900 block">{comp.name}</span>
                <span className="text-xs text-stone-500 font-mono">
                  {comp.calories} kcal · P: {comp.protein}g · C: {comp.carbs}g · F: {comp.fat}g
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
                  <input
                    name="ingredientGrams"
                    aria-label={`Grams for ${comp.name}`}
                    type="number"
                    value={comp.grams}
                    onChange={(e) => handleUpdateGrams(comp.id, parseInt(e.target.value) || 0)}
                    className="w-14 text-right font-mono text-xs font-bold text-stone-900 focus:outline-none"
                    min="1"
                  />
                  <span className="text-xs text-stone-400 font-mono">g</span>
                </div>

                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setComponents((prev) => prev.filter((c) => c.id !== comp.id))}
                  className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Total & Action */}
        <div className="pt-5 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono text-stone-400 uppercase font-bold block">Total Energy</span>
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-stone-900">
              {totalCalories} kcal{' '}
              <span className="text-xs font-normal text-stone-500 font-mono">
                (P: {totalProtein}g · C: {totalCarbs}g · F: {totalFat}g)
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                components.forEach((c) => addToStagedBasket(c));
                onSaved();
              }}
              disabled={components.length === 0}
              className="flex-1 sm:flex-none px-4.5 py-3 rounded-2xl font-bold text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
            >
              Stage to Basket
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSave}
              disabled={components.length === 0}
              className="flex-1 sm:flex-none px-6.5 py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              Save to Diary
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
