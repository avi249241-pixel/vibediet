import React, { useState } from 'react';
import {
  Calendar,
  Trash2,
  PlusCircle,
  Clock,
  ArrowLeft,
  ArrowRight,
  Flame,
  Activity,
  TrendingDown,
  TrendingUp,
  Scale,
  Plus,
  Check,
  EyeOff,
  Info,
  Zap,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { useDiet, getTodayDateString } from '../context/DietContext';
import { validateAtwaterThermodynamics } from '../utils/atwaterValidator';

interface DailyDiaryScreenProps {
  onAddMealClick: () => void;
  onManualEntryClick: () => void;
}

export const DailyDiaryScreen: React.FC<DailyDiaryScreenProps> = ({
  onAddMealClick,
  onManualEntryClick,
}) => {
  const {
    meals,
    userProfile,
    selectedDate,
    setSelectedDate,
    deleteMeal,
    isSyncing,
    weightEntries,
    smoothedWeights,
    metabolicState,
    addWeightEntry,
  } = useDiet();

  const [isWeighInOpen, setIsWeighInOpen] = useState<boolean>(false);
  const [expandedMealIds, setExpandedMealIds] = useState<Set<string>>(new Set());
  const [scaleWeightInput, setScaleWeightInput] = useState<string>(
    weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weightKg.toString() : '75.0'
  );

  const toggleMealExpand = (id: string) => {
    setExpandedMealIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedMeals = meals.filter((m) => {
    const d = m.date || new Date(m.timestamp).toISOString().split('T')[0];
    return d === selectedDate;
  });

  const totalCalories = selectedMeals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = Math.round(selectedMeals.reduce((sum, m) => sum + m.protein, 0) * 10) / 10;
  const totalCarbs = Math.round(selectedMeals.reduce((sum, m) => sum + m.carbs, 0) * 10) / 10;
  const totalFat = Math.round(selectedMeals.reduce((sum, m) => sum + m.fat, 0) * 10) / 10;

  const isToday = selectedDate === getTodayDateString();

  const changeDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  // Day of week for calorie shifting schedule if configured
  const dayOfWeek = new Date(selectedDate + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as keyof typeof userProfile.weeklyShiftSchedule;
  const dayTargetCalories = userProfile.weeklyShiftSchedule?.[dayOfWeek] || userProfile.targetCalories;

  const calProgress = Math.min(100, Math.round((totalCalories / dayTargetCalories) * 100));
  const isOverBudget = totalCalories > dayTargetCalories;
  const overflowCalories = Math.max(0, totalCalories - dayTargetCalories);
  const remainingCalories = Math.max(0, dayTargetCalories - totalCalories);

  // Latest weigh-in today
  const todayWeighIn = weightEntries.find((w) => w.date === selectedDate);

  const handleSaveWeighIn = async () => {
    const val = parseFloat(scaleWeightInput);
    if (!isNaN(val) && val > 30 && val < 300) {
      await addWeightEntry(val, selectedDate);
      setIsWeighInOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. DYNAMIC METABOLIC HEADER (MacroFactor Style) */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
                Dynamic Metabolic Expenditure
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                EWMA α=0.12
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-0.5 flex items-baseline gap-2">
              <span>{metabolicState.currentTdee} kcal/day</span>
              <span className="text-xs text-stone-500 font-sans font-normal">
                Trend Weight: <strong className="text-stone-800">{metabolicState.trendWeightKg} kg</strong> (
                {metabolicState.weightVelocity7dKg > 0 ? '+' : ''}
                {metabolicState.weightVelocity7dKg} kg/wk)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWeighInOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            {todayWeighIn ? `${todayWeighIn.weightKg} kg (Logged)` : 'Log Scale Weight'}
          </button>
        </div>
      </section>

      {/* Weigh-In Dialog */}
      {isWeighInOpen && (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-semibold text-emerald-900">
              Scale Weight for {selectedDate}:
            </span>
            <input
              id="daily-scale-weight-input"
              name="scaleWeight"
              aria-label="Scale weight in kilograms"
              type="number"
              step="0.1"
              value={scaleWeightInput}
              onChange={(e) => setScaleWeightInput(e.target.value)}
              className="w-20 bg-white border border-emerald-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-stone-900 focus:outline-none"
            />
            <span className="text-xs text-emerald-800">kg</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWeighInOpen(false)}
              className="px-3 py-1 rounded-lg text-xs text-stone-500 hover:text-stone-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveWeighIn}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
            >
              Save Weigh-in
            </button>
          </div>
        </div>
      )}

      {/* Date Navigator Header */}
      <section className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-600">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-stone-900 font-display flex items-center gap-2">
              <span>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {isToday && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  Today
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400">
              {isSyncing ? 'Syncing with Firestore...' : 'Daily Nutrition Diary'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayDateString())}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
          <button
            onClick={() => changeDate(1)}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
            title="Next Day"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 2. ADHERENCE-NEUTRAL CONSUMPTION DIAL & TARGETS (Zero-Shame Psychology) */}
      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Calories Card (Zero Red Alerts - Uses Neutral Slate/Blue Shift on Exceed) */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold uppercase tracking-wider">Calories</span>
            <Flame className="w-4 h-4 text-emerald-600" />
          </div>

          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-mono text-stone-900">
              {totalCalories}
            </span>
            <span className="text-xs font-mono text-stone-400">
              / {dayTargetCalories} kcal
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverBudget ? 'bg-slate-700' : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(100, calProgress)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-stone-400">
              <span>{Math.round((totalCalories / dayTargetCalories) * 100)}%</span>
              {isOverBudget ? (
                <span className="text-slate-600 font-semibold">+{overflowCalories} kcal overflow</span>
              ) : (
                <span>{remainingCalories} kcal remaining</span>
              )}
            </div>
          </div>
        </div>

        {/* Protein Card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-blue-700 font-semibold uppercase tracking-wider">
            Protein Target
          </div>

          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-stone-900">
              {totalProtein}g
            </span>
            <span className="text-xs font-mono text-stone-400">
              / {userProfile.targetProtein}g
            </span>
          </div>

          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((totalProtein / userProfile.targetProtein) * 100))}%` }}
            />
          </div>
        </div>

        {/* Carbs Card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-amber-700 font-semibold uppercase tracking-wider">
            Carbohydrates
          </div>

          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-stone-900">
              {totalCarbs}g
            </span>
            <span className="text-xs font-mono text-stone-400">
              / {userProfile.targetCarbs}g
            </span>
          </div>

          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((totalCarbs / userProfile.targetCarbs) * 100))}%` }}
            />
          </div>
        </div>

        {/* Fat Card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="text-xs text-rose-700 font-semibold uppercase tracking-wider">
            Dietary Fat
          </div>

          <div className="my-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono text-stone-900">
              {totalFat}g
            </span>
            <span className="text-xs font-mono text-stone-400">
              / {userProfile.targetFat}g
            </span>
          </div>

          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.round((totalFat / userProfile.targetFat) * 100))}%` }}
            />
          </div>
        </div>
      </section>

      {/* Logged Meals List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold font-display text-stone-900 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Timeline Stream ({selectedMeals.length})
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={onManualEntryClick}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
            >
              Manual Log
            </button>
            <button
              onClick={onAddMealClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Photo Log
            </button>
          </div>
        </div>

        {selectedMeals.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-stone-200/80 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Flame className="w-6 h-6 text-stone-400" />
            </div>
            <div className="text-sm font-bold text-stone-800">No meals logged for this day</div>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Snap a photo, dictate speech with Voice, or scan a barcode to log instantly.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={onAddMealClick}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
              >
                Photo Meal Log
              </button>
              <button
                onClick={onManualEntryClick}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
              >
                Manual Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selectedMeals.map((meal) => {
              const isExpanded = expandedMealIds.has(meal.id);
              const hasFoods = meal.foods && meal.foods.length > 0;
              const atwaterCheck = meal.atwaterValidation || validateAtwaterThermodynamics(meal.calories, meal.protein, meal.carbs, meal.fat);
              const isUnreliable = meal.isUnreliable || atwaterCheck.isUnreliable;

              return (
                <div
                  key={meal.id}
                  className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 hover:border-stone-300 shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {meal.imageUrl ? (
                        <img
                          src={meal.imageUrl}
                          alt={meal.name}
                          className="w-16 h-16 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold">
                          <Flame className="w-6 h-6" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700">
                            {meal.mealType}
                          </span>
                          <h4 className="text-sm font-bold text-stone-900 font-display">
                            {meal.name}
                          </h4>
                          {isUnreliable && (
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1"
                              title={atwaterCheck.warningMessage || `Thermodynamic variance: ${atwaterCheck.discrepancyPercentage}%`}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Unreliable ({atwaterCheck.discrepancyPercentage}%)
                            </span>
                          )}
                          {meal.hasUnobservableUnknown && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <EyeOff className="w-3 h-3" />
                              Unobservable Fats
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-stone-500 font-mono">
                          <span className={`font-bold ${isUnreliable ? 'text-amber-900' : 'text-stone-800'}`}>
                            {meal.calories} kcal
                          </span>
                          <span className="text-stone-400">
                            [{meal.minCalories || Math.round(meal.calories * 0.9)} – {meal.maxCalories || Math.round(meal.calories * 1.15)} kcal]
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-blue-600">{meal.protein}g P</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-600">{meal.carbs}g C</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-rose-600">{meal.fat}g F</span>
                        </div>

                        <div className="text-[11px] text-stone-400 flex items-center gap-2">
                          <span>{meal.foods?.length || 0} component ingredients · Source: {meal.nutritionSource}</span>
                          {hasFoods && (
                            <button
                              onClick={() => toggleMealExpand(meal.id)}
                              className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5 cursor-pointer ml-1"
                            >
                              <span>{isExpanded ? 'Hide items' : 'View breakdown'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <button
                        onClick={() => deleteMeal(meal.id)}
                        className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Delete meal record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Component Breakdown */}
                  {isExpanded && hasFoods && (
                    <div className="pt-3 border-t border-stone-100 space-y-2 animate-fade-in">
                      <div className="text-[11px] font-mono uppercase font-bold text-stone-400">
                        Component Breakdown
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {meal.foods.map((food, fIdx) => {
                          const foodAtwater = food.atwaterValidation || validateAtwaterThermodynamics(food.calories, food.protein, food.carbs, food.fat);
                          const isFoodUnreliable = food.isUnreliable || foodAtwater.isUnreliable;

                          return (
                            <div
                              key={food.id || fIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                                isFoodUnreliable
                                  ? 'bg-amber-50/50 border-amber-300'
                                  : 'bg-stone-50 border-stone-200/80'
                              }`}
                            >
                              <div className="truncate">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-stone-800 block truncate">{food.name}</span>
                                  {isFoodUnreliable && (
                                    <span
                                      className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-0.5 shrink-0"
                                      title={foodAtwater.warningMessage || `Thermodynamic variance ${foodAtwater.discrepancyPercentage}%`}
                                    >
                                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                      Unreliable
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {food.grams}g · {food.calories} kcal (P:{food.protein}g C:{food.carbs}g F:{food.fat}g)
                                </span>
                              </div>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${
                                  food.evidenceClass === 'unobservable_unknown'
                                    ? 'bg-rose-100 text-rose-800'
                                    : food.evidenceClass === 'context_derived'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {food.evidenceClass === 'unobservable_unknown'
                                  ? 'Hidden Fat'
                                  : food.evidenceClass === 'context_derived'
                                  ? 'Context'
                                  : 'Visible'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
