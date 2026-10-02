import React from 'react';
import { Camera, BookOpen, PenTool, User, Sparkles, Activity } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useDiet, getTodayDateString } from '../context/DietContext';

export type ScreenTab = 'log' | 'diary' | 'coach' | 'manual' | 'profile';

interface NavigationProps {
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { user, isGuest, firestoreStatus, loginGoogle, loginGuest } = useAuth();
  const { meals, userProfile } = useDiet();

  const today = getTodayDateString();
  const todayMeals = meals.filter((m) => m.date === today);
  const totalCaloriesToday = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const remaining = Math.max(0, userProfile.targetCalories - totalCaloriesToday);

  const navItems: { id: ScreenTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'log', label: 'Photo Log', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'diary', label: 'Daily Diary', icon: <BookOpen className="w-3.5 h-3.5" />, count: todayMeals.length },
    { id: 'coach', label: 'Metabolism & TDEE', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'manual', label: 'Manual Entry', icon: <PenTool className="w-3.5 h-3.5" /> },
    { id: 'profile', label: 'Targets & Goals', icon: <User className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-2xl border-b border-stone-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-sm shadow-emerald-500/20"
          >
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center text-emerald-600">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg text-stone-900 tracking-tight">
                VibeDiet
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/80 shadow-2xs">
                PRO 2.0
              </span>
            </div>
            <div className="text-[11px] text-stone-400 hidden sm:block font-medium">
              Precision visual AI · Ground-truth nutrition
            </div>
          </div>
        </div>

        {/* Center Desktop Sliding Navigation */}
        <nav className="hidden md:flex items-center p-1.5 bg-stone-100/80 backdrop-blur-lg rounded-2xl border border-stone-200/80 shadow-inner">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive ? 'text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-stone-200/60"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span className={isActive ? 'text-emerald-600' : 'text-stone-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {item.count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Right Status Glance & Auth */}
        <div className="flex items-center gap-3">
          {/* Caloric Budget Glance Pill */}
          <div className="hidden sm:flex items-center gap-2.5 px-3 py-1 rounded-2xl bg-stone-50 border border-stone-200/70 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col text-right leading-tight">
              <span className="text-[9px] font-mono text-stone-400 uppercase font-semibold">Remaining</span>
              <span className="text-xs font-bold font-mono text-emerald-700">
                {remaining} <span className="text-[10px] font-normal text-stone-400">kcal</span>
              </span>
            </div>
          </div>

          {/* User Sign In / Profile Pill */}
          {user ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-xs text-stone-700 transition-colors cursor-pointer shadow-2xs"
            >
              <span className={`w-2 h-2 rounded-full ${firestoreStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
              <span className="truncate max-w-[90px] font-semibold text-stone-800">
                {user.displayName || (isGuest ? 'Guest' : 'Account')}
              </span>
            </motion.button>
          ) : (
            <div className="flex items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={loginGuest}
                className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Guest
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={loginGoogle}
                className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Sign In
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sliding Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200/80 px-3 py-2 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center gap-1 py-1 px-3 text-[10px] transition-colors ${
                isActive ? 'text-emerald-700 font-bold' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                {item.icon}
              </span>
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="mobileActiveDot"
                  className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-0.5"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
