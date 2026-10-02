import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
    <div className="min-h-screen text-stone-900 flex flex-col font-sans selection:bg-emerald-200 selection:text-emerald-950 pb-20">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-32 md:pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'log' && (
            <motion.div
              key="log"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <PhotoLogScreen onMealLogged={() => setActiveTab('diary')} />
            </motion.div>
          )}

          {activeTab === 'diary' && (
            <motion.div
              key="diary"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <DailyDiaryScreen
                onAddMealClick={() => setActiveTab('log')}
                onManualEntryClick={() => setActiveTab('manual')}
              />
            </motion.div>
          )}

          {activeTab === 'coach' && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <MetabolismCoachScreen />
            </motion.div>
          )}

          {activeTab === 'manual' && (
            <motion.div
              key="manual"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <ManualEntryScreen onSaved={() => setActiveTab('diary')} />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProfileScreen />
            </motion.div>
          )}
        </AnimatePresence>
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
