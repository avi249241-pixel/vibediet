import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DietProvider } from './context/DietContext';
import { Navigation, ScreenTab } from './components/Navigation';
import { PhotoLogScreen } from './components/PhotoLogScreen';
import { DailyDiaryScreen } from './components/DailyDiaryScreen';
import { ManualEntryScreen } from './components/ManualEntryScreen';
import { MetabolismCoachScreen } from './components/MetabolismCoachScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { OmnibarDock } from './components/OmnibarDock';

function MainAppShell() {
  const [activeTab, setActiveTab] = useState<ScreenTab>('diary');

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-stone-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900 pb-20">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-16">
        {activeTab === 'log' && (
          <PhotoLogScreen onMealLogged={() => setActiveTab('diary')} />
        )}

        {activeTab === 'diary' && (
          <DailyDiaryScreen
            onAddMealClick={() => setActiveTab('log')}
            onManualEntryClick={() => setActiveTab('manual')}
          />
        )}

        {activeTab === 'coach' && <MetabolismCoachScreen />}

        {activeTab === 'manual' && (
          <ManualEntryScreen onSaved={() => setActiveTab('diary')} />
        )}

        {activeTab === 'profile' && <ProfileScreen />}
      </main>

      {/* Floating Omnibar Dock */}
      <OmnibarDock
        onOpenPhotoLog={() => setActiveTab('log')}
        onOpenSearch={() => setActiveTab('manual')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DietProvider>
        <MainAppShell />
      </DietProvider>
    </AuthProvider>
  );
}
