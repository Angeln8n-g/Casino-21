import React from 'react';
import { GameProvider, useGame } from './hooks/useGame';
import { MainMenu } from './components/MainMenu';
import { GameScreen } from './components/GameScreen';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';

function AppContent() {
  const { user, loading } = useAuth();
  const { gameState } = useGame();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!gameState) {
    return <MainMenu />;
  }
  
  // Cast phase to any to safely check, as setup might not be in the GamePhase union
  if ((gameState.phase as any) === 'setup') {
    return <MainMenu />;
  }
  
  return <GameScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="relative min-h-dvh w-full overflow-x-hidden text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black">
          {/* Decorative ambient background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none mix-blend-screen"></div>
          <AppContent />
        </div>
      </GameProvider>
    </AuthProvider>
  );
}
