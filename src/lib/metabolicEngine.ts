import { WeightEntry, MetabolicState, UserProfile } from '../types/diet';

const EWMA_ALPHA = 0.12; // Half-life ~5.5 days, optimal biological smoothing factor
const TISSUE_ENERGY_DENSITY_KCAL_KG = 7700; // Caloric equivalent of 1kg mixed human tissue

/**
 * Calculates exponentially smoothed weight trend series (EWMA)
 * $T_t = \alpha \cdot W_t + (1 - \alpha) \cdot T_{t-1}$
 */
export function calculateSmoothedWeights(entries: WeightEntry[]): WeightEntry[] {
  if (entries.length === 0) return [];

  // Sort ascending by timestamp/date
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);

  let currentTrend = sorted[0].weightKg;
  const result: WeightEntry[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const raw = sorted[i].weightKg;
    if (i === 0) {
      currentTrend = raw;
    } else {
      currentTrend = EWMA_ALPHA * raw + (1 - EWMA_ALPHA) * currentTrend;
    }

    result.push({
      ...sorted[i],
      smoothedWeightKg: Math.round(currentTrend * 100) / 100,
    });
  }

  return result;
}

/**
 * Dynamic Energy Expenditure Engine (TDEE State Estimation)
 * Inverts the energy balance equation:
 * $\overline{\text{TDEE}} = \text{Average Daily Intake} - (\Delta \text{TrendWeight} \cdot 7700) / n$
 */
export function calculateDynamicExpenditure(
  smoothedWeights: WeightEntry[],
  dailyIntakeCalories: { date: string; calories: number }[],
  currentBaselineTdee = 2200
): MetabolicState {
  if (smoothedWeights.length < 2 || dailyIntakeCalories.length < 2) {
    const latestWeight = smoothedWeights[smoothedWeights.length - 1]?.smoothedWeightKg ||
                         smoothedWeights[smoothedWeights.length - 1]?.weightKg || 75;
    return {
      currentTdee: currentBaselineTdee,
      trendWeightKg: latestWeight,
      weightVelocity7dKg: -0.15,
      dailyExpenditureTrend: currentBaselineTdee,
      lastRecalculated: Date.now(),
      adherenceNeutralFeedback: 'Logging baseline established. True metabolic expenditure will continuously sharpen as daily intake & weigh-ins accumulate.',
    };
  }

  // Look across active 14-day rolling window
  const recentWeights = smoothedWeights.slice(-14);
  const oldest = recentWeights[0];
  const newest = recentWeights[recentWeights.length - 1];

  const deltaTrendWeightKg = (newest.smoothedWeightKg || newest.weightKg) - (oldest.smoothedWeightKg || oldest.weightKg);
  const daysSpan = Math.max(1, Math.round((newest.timestamp - oldest.timestamp) / (1000 * 60 * 60 * 24)) || recentWeights.length);

  // Compute average daily intake
  const validIntakeDays = dailyIntakeCalories.filter(d => d.calories > 400); // exclude unlogged blank days
  const totalCaloriesLogged = validIntakeDays.reduce((sum, d) => sum + d.calories, 0);
  const avgDailyIntake = validIntakeDays.length > 0 ? totalCaloriesLogged / validIntakeDays.length : currentBaselineTdee;

  // Metabolic Energy Inversion:
  // If weight dropped by 0.5kg in 7 days, tissue deficit = 0.5 * 7700 = 3850 kcal / 7 = 550 kcal/day deficit.
  // Expenditure = Intake - (DeltaWeight * 7700 / days)
  const dailyTissueEnergyImbalance = (deltaTrendWeightKg * TISSUE_ENERGY_DENSITY_KCAL_KG) / daysSpan;
  const calculatedTdee = Math.round(avgDailyIntake - dailyTissueEnergyImbalance);

  // Bound within realistic biological constraints (1300 to 4500 kcal)
  const boundedTdee = Math.max(1300, Math.min(4500, calculatedTdee));

  // Compute 7-day velocity
  const weightVelocity7dKg = Math.round((deltaTrendWeightKg / daysSpan) * 7 * 100) / 100;

  // Objective, adherence-neutral feedback (NO shame, NO punitive warnings)
  let feedback = `Observed expenditure is ~${boundedTdee} kcal/day with trend velocity of ${weightVelocity7dKg > 0 ? '+' : ''}${weightVelocity7dKg} kg/week.`;
  if (Math.abs(weightVelocity7dKg) < 0.1) {
    feedback = `Metabolic state is near dynamic equilibrium. Scale fluctuations represent normal fluid/glycogen shifts.`;
  }

  return {
    currentTdee: boundedTdee,
    trendWeightKg: newest.smoothedWeightKg || newest.weightKg,
    weightVelocity7dKg,
    dailyExpenditureTrend: boundedTdee,
    lastRecalculated: Date.now(),
    adherenceNeutralFeedback: feedback,
  };
}

/**
 * 7-Day Calorie Shifting Planner
 * Allows user to allocate higher calories on training / weekend days
 * while maintaining strict static weekly energy balance.
 */
export function balanceWeeklyCalorieSchedule(
  weeklyAverageTarget: number,
  ratios: { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number }
) {
  const totalTargetWeekly = weeklyAverageTarget * 7;
  const sumRatios = ratios.mon + ratios.tue + ratios.wed + ratios.thu + ratios.fri + ratios.sat + ratios.sun;

  return {
    monday: Math.round((totalTargetWeekly * ratios.mon) / sumRatios),
    tuesday: Math.round((totalTargetWeekly * ratios.tue) / sumRatios),
    wednesday: Math.round((totalTargetWeekly * ratios.wed) / sumRatios),
    thursday: Math.round((totalTargetWeekly * ratios.thu) / sumRatios),
    friday: Math.round((totalTargetWeekly * ratios.fri) / sumRatios),
    saturday: Math.round((totalTargetWeekly * ratios.sat) / sumRatios),
    sunday: Math.round((totalTargetWeekly * ratios.sun) / sumRatios),
  };
}
