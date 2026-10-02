import React, { useState } from 'react';
import {
  Activity,
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  Sliders,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useDiet } from '../context/DietContext';
import { balanceWeeklyCalorieSchedule } from '../lib/metabolicEngine';

export const MetabolismCoachScreen: React.FC = () => {
  const { userProfile, updateProfile, metabolicState, smoothedWeights, weightEntries, addWeightEntry } = useDiet();

  const [programMode, setProgramMode] = useState<'Coached' | 'Collaborative' | 'Manual'>(
    userProfile.programMode || 'Coached'
  );

  const [weightInput, setWeightInput] = useState<string>(() => {
    if (weightEntries.length > 0) {
      return weightEntries[weightEntries.length - 1].weightKg.toString();
    }
    return (metabolicState?.trendWeightKg || userProfile.targetWeightKg || 75.0).toString();
  });
  const [isWeighInOpen, setIsWeighInOpen] = useState<boolean>(false);
  const [weeklySuccessMsg, setWeeklySuccessMsg] = useState<string | null>(null);

  // Calorie shifting weekday multipliers (default 1.0, Fri/Sat 1.1)
  const [ratios, setRatios] = useState({
    mon: 1.0,
    tue: 1.0,
    wed: 1.0,
    thu: 1.0,
    fri: 1.15,
    sat: 1.15,
    sun: 1.0,
  });

  const balancedSchedule = balanceWeeklyCalorieSchedule(userProfile.targetCalories, ratios);

  const handleApplyShiftSchedule = async () => {
    await updateProfile({
      programMode,
      weeklyShiftSchedule: balancedSchedule,
    });
    setWeeklySuccessMsg('Weekly calorie distribution schedule updated!');
    setTimeout(() => setWeeklySuccessMsg(null), 3000);
  };

  const handleApplyCoachedRecalibration = async () => {
    // Dynamic adjustment based on goal and expenditure
    let newTarget = metabolicState.currentTdee;
    if (userProfile.goal === 'Fat Loss') {
      newTarget = Math.max(1300, metabolicState.currentTdee - 450);
    } else if (userProfile.goal === 'Lean Muscle') {
      newTarget = metabolicState.currentTdee + 250;
    }

    const newProtein = Math.round(newTarget * 0.30 / 4);
    const newCarbs = Math.round(newTarget * 0.45 / 4);
    const newFat = Math.round(newTarget * 0.25 / 9);

    await updateProfile({
      targetCalories: newTarget,
      targetProtein: newProtein,
      targetCarbs: newCarbs,
      targetFat: newFat,
      currentTdee: metabolicState.currentTdee,
    });

    setWeeklySuccessMsg(`Metabolic check-in complete. Target updated to ${newTarget} kcal/day based on observed EWMA weight trend.`);
    setTimeout(() => setWeeklySuccessMsg(null), 4000);
  };

  // Recent 14 weigh-ins for dual-path plot
  const recent14 = smoothedWeights.slice(-14);

  // Dynamic bounds for weight chart
  const allWeights = recent14.flatMap(e => [e.weightKg, e.smoothedWeightKg || e.weightKg]);
  const dynamicMinW = allWeights.length > 0 ? Math.floor(Math.min(...allWeights) - 0.5) : 70;
  const dynamicMaxW = allWeights.length > 0 ? Math.ceil(Math.max(...allWeights) + 0.5) : 80;
  const weightSpan = Math.max(1, dynamicMaxW - dynamicMinW);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="glass-card rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <h2 className="text-xl font-extrabold font-display text-stone-900 tracking-tight">
              Adaptive Energy Expenditure & Strategy
            </h2>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">
            Continuous closed-loop metabolic state estimation. Exponential smoothing (EWMA α=0.12) separates water noise from real tissue changes.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleApplyCoachedRecalibration}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer whitespace-nowrap"
        >
          <Sparkles className="w-4 h-4" />
          Weekly Check-in
        </motion.button>
      </motion.section>

      {weeklySuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2.5 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{weeklySuccessMsg}</span>
        </motion.div>
      )}

      {/* 2 Primary Metabolic Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Expenditure State */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="glass-card rounded-3xl p-6 sm:p-7 space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span className="font-mono uppercase font-bold text-emerald-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              True Daily Energy Expenditure (TDEE)
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold border border-stone-200/80">
              Hall Model
            </span>
          </div>

          <div className="flex items-baseline gap-2 py-1">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight bg-gradient-to-r from-emerald-600 to-teal-700 bg-clip-text text-transparent">
              {metabolicState.currentTdee}
            </span>
            <span className="text-xs font-mono text-stone-400 font-medium">kcal / day</span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed pt-2 border-t border-stone-100">
            {metabolicState.adherenceNeutralFeedback}
          </p>
        </motion.div>

        {/* Dual-Path Trend Weight */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className="glass-card rounded-3xl p-6 sm:p-7 space-y-3 relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span className="font-mono uppercase font-bold text-stone-800">
              Smoothed Trend Weight
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
              Fluid-Filtered
            </span>
          </div>

          <div className="flex items-baseline gap-2 py-1">
            <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-stone-900">
              {metabolicState.trendWeightKg} kg
            </span>
            <span className="text-xs font-mono text-stone-500 font-medium">
              ({metabolicState.weightVelocity7dKg > 0 ? '+' : ''}{metabolicState.weightVelocity7dKg} kg / wk)
            </span>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed pt-2 border-t border-stone-100">
            Daily weigh-ins contain 1-2kg of sodium/glycogen transit variance. The EWMA trend line captures genuine adipose & lean tissue velocity.
          </p>
        </motion.div>
      </div>

      {/* Dual-Path Weight Visualization & Weigh-in Log */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.1 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold font-display text-stone-900">
              Dual-Path Weight Trend (14-Day Trajectory)
            </h3>
            <span className="text-xs text-stone-400">
              Raw points = Scale readings · Solid line = Smoothed metabolic trend
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="scale-reading-input"
              name="scaleReading"
              aria-label="Scale weight reading in kg"
              type="number"
              step="0.1"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              className="w-20 bg-stone-50/90 border border-stone-200/90 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-stone-900 text-right focus:outline-none focus:border-emerald-500"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const val = parseFloat(weightInput);
                if (!isNaN(val)) addWeightEntry(val);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
            >
              + Add Weigh-In
            </motion.button>
          </div>
        </div>

        {/* Lightweight SVG Dual-Path Curve */}
        <div className="h-44 w-full bg-stone-50/70 rounded-2xl border border-stone-200/80 p-4 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
            <span>Range: {dynamicMinW} kg - {dynamicMaxW} kg</span>
            <span className="text-emerald-700 font-semibold">● Raw scale points vs ── Smoothed trend curve</span>
            <span>Today</span>
          </div>

          {/* Render 14 data bars/dots */}
          <div className="flex items-end justify-between gap-1.5 h-28 pt-2">
            {recent14.map((entry, idx) => {
              const heightPct = Math.max(10, Math.min(95, ((entry.weightKg - dynamicMinW) / weightSpan) * 100));
              const trendPct = Math.max(10, Math.min(95, (((entry.smoothedWeightKg || entry.weightKg) - dynamicMinW) / weightSpan) * 100));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative group">
                  {/* Smoothed trend marker */}
                  <motion.div
                    whileHover={{ scale: 1.6 }}
                    className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/30 absolute transition-all cursor-pointer"
                    style={{ bottom: `${trendPct}%` }}
                    title={`Trend: ${entry.smoothedWeightKg} kg`}
                  />
                  {/* Raw point marker */}
                  <motion.div
                    whileHover={{ scale: 1.6 }}
                    className="w-1.5 h-1.5 rounded-full bg-stone-400/90 absolute transition-all cursor-pointer"
                    style={{ bottom: `${heightPct}%` }}
                    title={`Raw: ${entry.weightKg} kg (${entry.date})`}
                  />
                  <span className="text-[9px] font-mono text-stone-400 mt-1">
                    {entry.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Program Mode & Calorie Shifting Planner */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.15 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <h3 className="text-base font-bold font-display text-stone-900">
              Coaching Mode & Calorie Shifting Planner
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Enforce static weekly energy balance while allocating higher calories on weekends or heavy training sessions.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1 p-1 bg-stone-100/80 rounded-2xl border border-stone-200/80 text-xs">
            {(['Coached', 'Collaborative', 'Manual'] as const).map((m) => (
              <motion.button
                key={m}
                whileTap={{ scale: 0.95 }}
                onClick={() => setProgramMode(m)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  programMode === m ? 'bg-white text-emerald-800 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {m}
              </motion.button>
            ))}
          </div>
        </div>

        {/* 7-Day Calorie Shifting Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700">7-Day Weekly Caloric Allocation:</span>
            <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Weekly Avg: {userProfile.targetCalories} kcal/day
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs">
            {Object.entries(balancedSchedule).map(([day, cals]) => (
              <motion.div
                key={day}
                whileHover={{ y: -2 }}
                className="p-3 rounded-2xl bg-stone-50/90 border border-stone-200/80 space-y-1 hover:border-emerald-300 transition-colors"
              >
                <span className="text-[10px] font-mono text-stone-400 uppercase block font-bold">
                  {day.slice(0, 3)}
                </span>
                <span className="text-sm font-extrabold font-mono text-stone-900 block">
                  {cals}
                </span>
                <span className="text-[10px] text-stone-400 font-mono">kcal</span>
              </motion.div>
            ))}
          </div>

          {/* Shift presets */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-stone-400 font-medium">Preset:</span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setRatios({ mon: 1.0, tue: 1.0, wed: 1.0, thu: 1.0, fri: 1.15, sat: 1.15, sun: 1.0 })}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold transition-colors cursor-pointer"
              >
                Weekend Boost (+15% Fri/Sat)
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setRatios({ mon: 1.0, tue: 1.0, wed: 1.0, thu: 1.0, fri: 1.0, sat: 1.0, sun: 1.0 })}
                className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-semibold transition-colors cursor-pointer"
              >
                Even Split
              </motion.button>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleApplyShiftSchedule}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Apply Schedule
            </motion.button>
          </div>
        </div>
      </motion.section>
    </div>
  );
};
