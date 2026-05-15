import React, { useEffect, useState, Suspense, lazy } from 'react';
import { GameProvider, useGame } from './hooks/useGame';
import { AudioProvider } from './hooks/useAudio';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { triggerHaptic } from './utils/haptics';
import { loadThemes } from './themes/themeRegistry';
// ── Lazy-loaded components (code splitting) ───────────────────────────────────
// These components are NOT needed on initial page load. By lazy-loading them,
// the main JS bundle shrinks dramatically and the critical path speeds up.
const MainMenu = lazy(() => import('./components/MainMenu').then(m => ({ default: m.MainMenu })));
const GameScreen = lazy(() => import('./components/GameScreen').then(m => ({ default: m.GameScreen })));
const AuthScreen = lazy(() => import('./components/AuthScreen').then(m => ({ default: m.AuthScreen })));
const UpdatePassword = lazy(() => import('./components/UpdatePassword').then(m => ({ default: m.UpdatePassword })));
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./components/legal/TermsOfService').then(m => ({ default: m.TermsOfService })));
const CookiePolicy = lazy(() => import('./components/legal/CookiePolicy').then(m => ({ default: m.CookiePolicy })));

// Minimal loading fallback matching the app's existing design
function LoadingFallback() {
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
  // ─── Legal Page Router (public, no auth required) ─────────────────────────
  const pathname = window.location.pathname;
  if (pathname === '/privacy') return <Suspense fallback={<LoadingFallback />}><PrivacyPolicy /></Suspense>;
  if (pathname === '/terms')   return <Suspense fallback={<LoadingFallback />}><TermsOfService /></Suspense>;
  if (pathname === '/cookies') return <Suspense fallback={<LoadingFallback />}><CookiePolicy /></Suspense>;

  // Global event listener for button haptics
  useEffect(() => {
    loadThemes();
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
            <Suspense fallback={<LoadingFallback />}>
              <AppContent />
            </Suspense>
          </div>
        </GameProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
