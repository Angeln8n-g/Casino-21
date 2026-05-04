import React, { useEffect, useState } from 'react';
import { GameProvider, useGame } from './hooks/useGame';
import { AudioProvider } from './hooks/useAudio';
import { MainMenu } from './components/MainMenu';
import { GameScreen } from './components/GameScreen';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { UpdatePassword } from './components/UpdatePassword';
import { triggerHaptic } from './utils/haptics';

function AppContent() {
  const { user, loading } = useAuth();
  const { gameState } = useGame();
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Detectar si venimos de un enlace de recuperación de contraseña de Supabase
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    
    // Escuchar cambios en el hash
    const handleHashChange = () => {
      if (window.location.hash.includes('type=recovery')) {
        setIsRecovery(true);
      } else {
        setIsRecovery(false);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  if (isRecovery) {
    return <UpdatePassword />;
  }

  
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
  
  const isSpectator = !!localStorage.getItem('casino21_spectatorRoomId');
  
  return <GameScreen isSpectator={isSpectator} />;
}

export default function App() {
  // Global event listener for button haptics
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // Check if the clicked element or its parent is a button
      const button = target.closest('button');
      if (button && !button.disabled) {
        triggerHaptic('light');
      }
    };

    document.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  return (
    <AuthProvider>
      <AudioProvider>
        <GameProvider>
          <div className="absolute inset-0 w-screen h-screen overflow-hidden text-white font-sans"
            style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 50%, #000000 100%)' }}
          >
            {/* Noise texture overlay */}
            <div className="noise-overlay" />
            <AppContent />
          </div>
        </GameProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
