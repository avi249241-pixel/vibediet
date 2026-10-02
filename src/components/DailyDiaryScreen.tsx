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
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

  const dayOfWeek = new Date(selectedDate + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'long' })
    .toLowerCase() as keyof typeof userProfile.weeklyShiftSchedule;
  const dayTargetCalories = userProfile.weeklyShiftSchedule?.[dayOfWeek] || userProfile.targetCalories;

  const calProgress = Math.min(100, Math.round((totalCalories / dayTargetCalories) * 100));
  const isOverBudget = totalCalories > dayTargetCalories;
  const overflowCalories = Math.max(0, totalCalories - dayTargetCalories);
  const remainingCalories = Math.max(0, dayTargetCalories - totalCalories);

  const proteinProgress = Math.min(100, Math.round((totalProtein / userProfile.targetProtein) * 100));
  const carbsProgress = Math.min(100, Math.round((totalCarbs / userProfile.targetCarbs) * 100));
  const fatProgress = Math.min(100, Math.round((totalFat / userProfile.targetFat) * 100));

  const todayWeighIn = weightEntries.find((w) => w.date === selectedDate);

  const handleSaveWeighIn = async () => {
    const val = parseFloat(scaleWeightInput);
    if (!isNaN(val) && val > 30 && val < 300) {
      await addWeightEntry(val, selectedDate);
      setIsWeighInOpen(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. TOP HERO: MACRO MATRIX WITH CONCENTRIC RINGS (MacroFactor + Apple Fitness Style) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-[32px] p-6 sm:p-8"
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* Left: Interactive Concentric Rings Dial */}
          <div className="relative flex items-center justify-center shrink-0 w-64 h-64 sm:w-72 sm:h-72">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 200 200">
              {/* Background Tracks */}
              <circle cx="100" cy="100" r="82" fill="none" stroke="#f1f5f9" strokeWidth="12" />
              <circle cx="100" cy="100" r="66" fill="none" stroke="#f1f5f9" strokeWidth="10" />
              <circle cx="100" cy="100" r="52" fill="none" stroke="#f1f5f9" strokeWidth="8" />
              <circle cx="100" cy="100" r="40" fill="none" stroke="#f1f5f9" strokeWidth="6" />

              {/* Progress Ring 1: Calories (Outer Emerald) */}
              <motion.circle
                cx="100"
                cy="100"
                r="82"
                fill="none"
                stroke="url(#calorieGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 82}
                initial={{ strokeDashoffset: 2 * Math.PI * 82 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 82) * (1 - calProgress / 100) }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Progress Ring 2: Protein (Violet) */}
              <motion.circle
                cx="100"
                cy="100"
                r="66"
                fill="none"
                stroke="url(#proteinGradient)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 66}
                initial={{ strokeDashoffset: 2 * Math.PI * 66 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 66) * (1 - proteinProgress / 100) }}
                transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Progress Ring 3: Carbs (Amber) */}
              <motion.circle
                cx="100"
                cy="100"
                r="52"
                fill="none"
                stroke="url(#carbsGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 52) * (1 - carbsProgress / 100) }}
                transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Progress Ring 4: Fat (Rose) */}
              <motion.circle
                cx="100"
                cy="100"
                r="40"
                fill="none"
                stroke="url(#fatGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 40}
                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 40) * (1 - fatProgress / 100) }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Gradients */}
              <defs>
                <linearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
                <linearGradient id="proteinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                <linearGradient id="carbsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="fatGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>
            </svg>

            {/* Dial Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                Remaining
              </span>
              <motion.span
                key={remainingCalories}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl sm:text-4xl font-extrabold font-mono text-stone-900 tracking-tight"
              >
                {remainingCalories}
              </motion.span>
              <span className="text-[11px] font-mono text-stone-500 font-medium">
                kcal today
              </span>
            </div>
          </div>

          {/* Right: 4 High-End Glass Macro Cards */}
          <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-2 gap-3.5">
            {/* Calories Card */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/8 to-teal-500/5 border border-emerald-500/15 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                  Energy Target
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {calProgress}%
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-stone-900">
                  {totalCalories} <span className="text-xs font-normal text-stone-500">/ {dayTargetCalories} kcal</span>
                </div>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-calorie rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${calProgress}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>

            {/* Protein Card */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/8 to-violet-500/5 border border-indigo-500/15 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs" />
                  Protein Target
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  {proteinProgress}%
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-stone-900">
                  {totalProtein}g <span className="text-xs font-normal text-stone-500">/ {userProfile.targetProtein}g</span>
                </div>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-protein rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${proteinProgress}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>

            {/* Carbs Card */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/8 to-orange-500/5 border border-amber-500/15 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                  Carbohydrates
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {carbsProgress}%
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-stone-900">
                  {totalCarbs}g <span className="text-xs font-normal text-stone-500">/ {userProfile.targetCarbs}g</span>
                </div>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-carbs rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${carbsProgress}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>

            {/* Fat Card */}
            <motion.div
              whileHover={{ y: -3, scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/8 to-pink-500/5 border border-rose-500/15 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 tracking-tight flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs" />
                  Dietary Fat
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  {fatProgress}%
                </span>
              </div>
              <div className="my-2.5">
                <div className="text-xl sm:text-2xl font-extrabold font-mono text-stone-900">
                  {totalFat}g <span className="text-xs font-normal text-stone-500">/ {userProfile.targetFat}g</span>
                </div>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-fat rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${fatProgress}%` }}
                  transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* 2. DYNAMIC METABOLIC EXPENDITURE WIDGET (MacroFactor Flagship TDEE) */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-[28px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Dynamic Metabolic Expenditure
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-semibold">
                EWMA α=0.12
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-stone-900 mt-0.5 flex items-baseline gap-2">
              <span>{metabolicState.currentTdee} kcal/day</span>
              <span className="text-xs text-stone-500 font-sans font-normal">
                Trend: <strong className="text-stone-800">{metabolicState.trendWeightKg} kg</strong> (
                {metabolicState.weightVelocity7dKg > 0 ? '+' : ''}
                {metabolicState.weightVelocity7dKg} kg/wk)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsWeighInOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer shadow-2xs"
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            {todayWeighIn ? `${todayWeighIn.weightKg} kg (Logged)` : 'Log Scale Weight'}
          </motion.button>
        </div>
      </motion.section>

      {/* Weigh-In Dialog (Spring Entrance) */}
      <AnimatePresence>
        {isWeighInOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.97 }}
            animate={{ opacity: 1, height: 'auto', scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.97 }}
            className="p-5 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 overflow-hidden"
          >
            <div className="flex items-center gap-2.5">
              <Scale className="w-5 h-5 text-emerald-700 shrink-0" />
              <span className="text-xs font-bold text-emerald-950">
                Morning Scale Weight for {selectedDate}:
              </span>
              <input
                id="daily-scale-weight-input"
                name="scaleWeight"
                aria-label="Scale weight in kilograms"
                type="number"
                step="0.1"
                value={scaleWeightInput}
                onChange={(e) => setScaleWeightInput(e.target.value)}
                className="w-24 bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs text-emerald-800 font-bold font-mono">kg</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsWeighInOpen(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs text-stone-600 hover:text-stone-800 cursor-pointer"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSaveWeighIn}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
              >
                Save Weigh-in
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. DATE SELECTOR BAR */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-[24px] p-4 sm:p-5 flex items-center justify-between"
      >
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
            <div className="text-xs text-stone-400 font-medium">
              {isSyncing ? 'Syncing with Firestore...' : `${selectedMeals.length} meals recorded`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => changeDate(-1)}
            className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          {!isToday && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setSelectedDate(getTodayDateString())}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 transition-colors cursor-pointer"
            >
              Today
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => changeDate(1)}
            className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
            title="Next Day"
          >
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.section>

      {/* 4. TIMELINE STREAM (Lush meal cards with smooth spring accordions) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-stone-400">
            Timeline Stream ({selectedMeals.length})
          </h3>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onManualEntryClick}
              className="text-xs font-bold text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              + Manual Log
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onAddMealClick}
              className="text-xs font-bold text-white px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Photo Log
            </motion.button>
          </div>
        </div>

        {selectedMeals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 rounded-[32px] glass-card text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h4 className="text-base font-bold text-stone-900 font-display">No meals logged for this day</h4>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                Photograph your plate, dictate with voice, or scan a barcode to log instantly with 0-LLM accuracy.
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onAddMealClick}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                Photo Meal Log
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={onManualEntryClick}
                className="px-5 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold cursor-pointer"
              >
                Manual Entry
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {selectedMeals.map((meal) => {
              const isExpanded = expandedMealIds.has(meal.id);
              const atwaterCheck = validateAtwaterThermodynamics(meal.calories, meal.protein, meal.carbs, meal.fat);

              return (
                <motion.div
                  key={meal.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="glass-card rounded-[28px] overflow-hidden p-5 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Meal Thumbnail & Title */}
                    <div className="flex items-center gap-4">
                      {meal.imageUrl ? (
                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-sm border border-stone-200/80">
                          <img
                            src={meal.imageUrl}
                            alt={meal.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 font-bold shrink-0">
                          🍽️
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                            {meal.mealType || 'Meal'}
                          </span>
                          {meal.hasUnobservableUnknown && (
                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <EyeOff className="w-3 h-3 text-rose-600" />
                              Unobservable Fats
                            </span>
                          )}
                          {!atwaterCheck.isUnreliable && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-semibold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Atwater Verified
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold font-display text-stone-900 mt-1">
                          {meal.name}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-stone-500 font-mono mt-1">
                          <span>
                            <strong className="text-stone-900 text-sm">{meal.calories}</strong> kcal
                            {meal.minCalories && meal.maxCalories && (
                              <span className="text-stone-400 text-[11px] ml-1">
                                [{meal.minCalories} – {meal.maxCalories} kcal]
                              </span>
                            )}
                          </span>
                          <span>·</span>
                          <span className="text-indigo-700 font-bold">{meal.protein}g P</span>
                          <span>·</span>
                          <span className="text-amber-700 font-bold">{meal.carbs}g C</span>
                          <span>·</span>
                          <span className="text-rose-700 font-bold">{meal.fat}g F</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleMealExpand(meal.id)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide' : 'Breakdown'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => deleteMeal(meal.id)}
                        className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete meal record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>

                  {/* Expandable Ingredients Drawer */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-4 pt-4 border-t border-stone-100 space-y-2.5 overflow-hidden"
                      >
                        <div className="text-[11px] font-mono text-stone-400 uppercase font-semibold">
                          Deconstructed Components ({meal.foods?.length || 0})
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(meal.foods || []).map((food: any) => (
                            <div
                              key={food.id || food.name}
                              className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-stone-900 block">{food.name}</span>
                                <span className="text-[11px] text-stone-500 font-mono">
                                  {food.calories} kcal · P:{food.protein}g C:{food.carbs}g F:{food.fat}g
                                </span>
                              </div>
                              <span className="font-mono text-xs font-bold text-stone-700 px-2 py-1 rounded-lg bg-white border border-stone-200 shadow-2xs">
                                {food.grams}g
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
