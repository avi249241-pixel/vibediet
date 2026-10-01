import React from 'react';
import { Camera, BookOpen, PenTool, User, Sparkles, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDiet, getTodayDateString } from '../context/DietContext';

export type ScreenTab = 'log' | 'diary' | 'coach' | 'manual' | 'profile';

interface NavigationProps {
  activeTab: ScreenTab;
  setActiveTab: (tab: ScreenTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab }) => {
  const { user, isGuest, firestoreStatus, loginGoogle, loginGuest, logout } = useAuth();
  const { meals, userProfile } = useDiet();

  const today = getTodayDateString();
  const todayMeals = meals.filter(m => m.date === today);
  const totalCaloriesToday = todayMeals.reduce((sum, m) => sum + m.calories, 0);
  const remaining = Math.max(0, userProfile.targetCalories - totalCaloriesToday);

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-stone-200/70 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold shadow-sm">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-lg text-stone-900 tracking-tight">
                VibeDiet
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                Calm AI
              </span>
            </div>
            <div className="text-[11px] text-stone-400 hidden sm:block">
              Photo-based meal logging · Tiered nutrition reconciliation
            </div>
          </div>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center p-1 bg-stone-100/80 rounded-2xl border border-stone-200/60">
          <button
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'log'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            Photo Log
          </button>

          <button
            onClick={() => setActiveTab('diary')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'diary'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            Daily Diary
            {todayMeals.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 ml-0.5">
                {todayMeals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'coach'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Metabolism & TDEE
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5 text-stone-500" />
            Manual Entry
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-stone-500" />
            Account & Targets
          </button>
        </nav>

        {/* Right Status Glance & Auth Pill */}
        <div className="flex items-center gap-2.5">
          {/* Caloric Budget Glance */}
          <div className="hidden sm:flex flex-col text-right leading-tight">
            <span className="text-[10px] font-mono text-stone-400 uppercase">Today's Remaining</span>
            <span className="text-xs font-bold font-mono text-emerald-700">
              {remaining} <span className="text-[10px] font-normal text-stone-400">/ {userProfile.targetCalories} kcal</span>
            </span>
          </div>

          {/* User Sign In / Status */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-stone-50 hover:bg-stone-100 border border-stone-200 text-xs text-stone-700 transition-colors cursor-pointer"
                title={user.email || 'Logged In'}
              >
                <span className={`w-2 h-2 rounded-full ${firestoreStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span className="truncate max-w-[100px] font-medium">
                  {user.displayName || (isGuest ? 'Guest User' : 'Account')}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={loginGuest}
                className="px-2.5 py-1 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                Guest
              </button>
              <button
                onClick={loginGoogle}
                className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTab('log')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            activeTab === 'log' ? 'text-emerald-700 font-bold' : 'text-stone-400'
          }`}
        >
          <Camera className="w-5 h-5" />
          <span>Photo Log</span>
        </button>

        <button
          onClick={() => setActiveTab('diary')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors relative ${
            activeTab === 'diary' ? 'text-emerald-700 font-bold' : 'text-stone-400'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span>Diary</span>
          {todayMeals.length > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('coach')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            activeTab === 'coach' ? 'text-emerald-700 font-bold' : 'text-stone-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span>TDEE</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            activeTab === 'manual' ? 'text-emerald-700 font-bold' : 'text-stone-400'
          }`}
        >
          <PenTool className="w-5 h-5" />
          <span>Manual</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
            activeTab === 'profile' ? 'text-emerald-700 font-bold' : 'text-stone-400'
          }`}
        >
          <User className="w-5 h-5" />
          <span>Account</span>
        </button>
      </nav>
    </header>
  );
};
