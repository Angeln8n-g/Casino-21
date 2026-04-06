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
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-casino-gold to-casino-gold-dark animate-pulse shadow-gold" />
          <div className="absolute inset-0 w-14 h-14 rounded-2xl border-2 border-casino-gold/20 animate-ping" />
        </div>
        <p className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold animate-pulse">Cargando</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!gameState) {
    return <MainMenu />;
  }
  
  if ((gameState.phase as any) === 'setup') {
    return <MainMenu />;
  }
  
  return <GameScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="absolute inset-0 w-screen h-screen overflow-hidden text-white font-sans"
          style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 50%, #000000 100%)' }}
        >
          {/* Noise texture overlay */}
          <div className="noise-overlay" />
          <AppContent />
        </div>
      </GameProvider>
    </AuthProvider>
  );
}
