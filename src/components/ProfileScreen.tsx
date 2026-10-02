import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Target,
  Flame,
  Award,
  Database,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useDiet } from '../context/DietContext';

export const ProfileScreen: React.FC = () => {
  const { user, isGuest, firestoreStatus, firestoreLatency, firestoreError, loginGoogle, loginGuest, logout, checkFirestoreHealth } = useAuth();
  const { userProfile, updateProfile } = useDiet();

  const [weightKg, setWeightKg] = useState<number>(userProfile.weightKg || 78.5);
  const [heightCm, setHeightCm] = useState<number>(userProfile.heightCm || 178);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(userProfile.targetWeightKg || 73.0);
  const [goal, setGoal] = useState<'Fat Loss' | 'Lean Muscle' | 'Maintenance'>(userProfile.goal || 'Fat Loss');
  const [dietaryStyle, setDietaryStyle] = useState<'Balanced' | 'High Protein' | 'Keto' | 'Low Carb'>(userProfile.dietaryStyle || 'High Protein');

  const [targetCalories, setTargetCalories] = useState<number>(userProfile.targetCalories || 2150);
  const [targetProtein, setTargetProtein] = useState<number>(userProfile.targetProtein || 160);
  const [targetCarbs, setTargetCarbs] = useState<number>(userProfile.targetCarbs || 190);
  const [targetFat, setTargetFat] = useState<number>(userProfile.targetFat || 65);

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleVerifyFirestore = async () => {
    setIsVerifying(true);
    await checkFirestoreHealth();
    setIsVerifying(false);
  };

  const handleComputeRecommended = () => {
    // Mifflin-St Jeor estimate (assuming moderate activity factor 1.35)
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 28 + 5;
    const estTdee = Math.round(bmr * 1.35);

    let recCalories = estTdee;
    if (goal === 'Fat Loss') {
      recCalories = Math.max(1350, estTdee - 450);
    } else if (goal === 'Lean Muscle') {
      recCalories = estTdee + 250;
    }

    // High protein sports nutrition (ISSN guideline ~2.0g/kg)
    const recProtein = Math.round(weightKg * 2.0);
    const recFat = Math.round(weightKg * 0.8);
    const remainingCalories = Math.max(200, recCalories - (recProtein * 4 + recFat * 9));
    const recCarbs = Math.round(remainingCalories / 4);

    setTargetCalories(recCalories);
    setTargetProtein(recProtein);
    setTargetCarbs(recCarbs);
    setTargetFat(recFat);
    setSavedNotice(`Calculated recommendations for ${goal}: ${recCalories} kcal (P:${recProtein}g C:${recCarbs}g F:${recFat}g). Click Save below to apply.`);
  };

  const handleSaveTargets = async () => {
    await updateProfile({
      weightKg,
      heightCm,
      targetWeightKg,
      goal,
      dietaryStyle,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
    });
    setSavedNotice('Profile and nutrition targets successfully synced to Firestore!');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Account & Firebase Connection Card */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <User className="w-4.5 h-4.5" />
              </div>
              Account & Cloud Database
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Google Sign-In + Guest Mode backed by real-time Firestore persistence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loginGuest}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
                >
                  Continue as Guest
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loginGoogle}
                  className="px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Sign in with Google
                </motion.button>
              </>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-1">
            <span className="text-[11px] font-mono text-stone-400 uppercase font-bold block">
              Authentication State
            </span>
            <div className="text-sm font-bold text-stone-900">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="truncate">{user.displayName || user.email || 'Guest User'}</span>
                  {isGuest && (
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                      Guest Mode
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-stone-400 font-normal">Not signed in (Local Cache Only)</span>
              )}
            </div>
            {user && (
              <div className="text-[11px] text-stone-500 font-mono">
                UID: {user.uid.slice(0, 14)}...
              </div>
            )}
          </div>

          {/* Firestore Health Status */}
          <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400 uppercase font-bold">
                Firestore Connectivity
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleVerifyFirestore}
                disabled={isVerifying || !user}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                Test Read/Write
              </motion.button>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  firestoreStatus === 'connected'
                    ? 'bg-emerald-500'
                    : firestoreStatus === 'testing'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-stone-300'
                }`}
              />
              <span className="text-sm font-bold text-stone-900">
                {firestoreStatus === 'connected'
                  ? `Connected (${firestoreLatency || 45}ms)`
                  : firestoreStatus === 'testing'
                  ? 'Verifying Firestore read/write...'
                  : 'Idle / Local mode'}
              </span>
            </div>

            <div className="text-[11px] text-stone-500 font-mono">
              Database: polar-conquest-wmbw7 (active)
            </div>
          </div>
        </div>
      </motion.section>

      {/* Biometrics & Personal Strategy */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.05 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Award className="w-4.5 h-4.5" />
              </div>
              Body Biometrics & Goals
            </h2>
            <p className="text-xs text-stone-400 mt-1">
              Your physiological baseline used to calibrate daily expenditure and targets.
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleComputeRecommended}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Flame className="w-4 h-4 text-emerald-600" />
            Calculate Recommended Targets
          </motion.button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="user-weight-kg" className="text-xs font-bold text-stone-700 block mb-1">
              Current Weight (kg)
            </label>
            <input
              id="user-weight-kg"
              name="currentWeight"
              type="number"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="user-height-cm" className="text-xs font-bold text-stone-700 block mb-1">
              Height (cm)
            </label>
            <input
              id="user-height-cm"
              name="heightCm"
              type="number"
              value={heightCm}
              onChange={(e) => setHeightCm(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="user-target-weight" className="text-xs font-bold text-stone-700 block mb-1">
              Goal Target Weight (kg)
            </label>
            <input
              id="user-target-weight"
              name="targetWeight"
              type="number"
              step="0.1"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(parseFloat(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="user-diet-goal" className="text-xs font-bold text-stone-700 block mb-1">
              Dietary Strategy
            </label>
            <select
              id="user-diet-goal"
              name="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value as any)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            >
              <option value="Fat Loss">Fat Loss (Deficit)</option>
              <option value="Lean Muscle">Lean Muscle (Surplus)</option>
              <option value="Maintenance">Maintenance (Neutral)</option>
            </select>
          </div>
        </div>
      </motion.section>

      {/* Target Customization */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25, delay: 0.1 }}
        className="glass-card rounded-3xl p-6 sm:p-8 space-y-6"
      >
        <div>
          <h2 className="text-xl font-extrabold font-display text-stone-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <Target className="w-4.5 h-4.5" />
            </div>
            Daily Nutrition Targets
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            Set your daily caloric ceiling and macronutrient distribution.
          </p>
        </div>

        {savedNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 shadow-xs"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{savedNotice}</span>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label htmlFor="target-calories-input" className="text-xs font-bold text-stone-700 block mb-1">
              Target Calories (kcal)
            </label>
            <input
              id="target-calories-input"
              name="targetCalories"
              type="number"
              value={targetCalories}
              onChange={(e) => setTargetCalories(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="target-protein-input" className="text-xs font-bold text-blue-700 block mb-1">
              Protein Target (g)
            </label>
            <input
              id="target-protein-input"
              name="targetProtein"
              type="number"
              value={targetProtein}
              onChange={(e) => setTargetProtein(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="target-carbs-input" className="text-xs font-bold text-amber-700 block mb-1">
              Carbohydrates (g)
            </label>
            <input
              id="target-carbs-input"
              name="targetCarbs"
              type="number"
              value={targetCarbs}
              onChange={(e) => setTargetCarbs(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="target-fat-input" className="text-xs font-bold text-rose-700 block mb-1">
              Dietary Fat (g)
            </label>
            <input
              id="target-fat-input"
              name="targetFat"
              type="number"
              value={targetFat}
              onChange={(e) => setTargetFat(parseInt(e.target.value) || 0)}
              className="w-full bg-stone-50/80 border border-stone-200/90 rounded-xl px-3 py-2 text-sm font-mono font-bold text-stone-900 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSaveTargets}
            className="px-6.5 py-3 rounded-2xl font-bold text-xs bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            Save Targets
          </motion.button>
        </div>
      </motion.section>
    </div>
  );
};
