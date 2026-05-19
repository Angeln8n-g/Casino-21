import React, { useEffect, useState, Suspense, lazy } from 'react';
import { GameProvider, useGame } from './hooks/useGame';
import { AudioProvider, useAudio } from './hooks/useAudio';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { triggerHaptic } from './utils/haptics';
import { loadThemes } from './themes/themeRegistry';
import { socketService } from './services/socket';
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
const ComoJugar = lazy(() => import('./components/ComoJugar').then(m => ({ default: m.ComoJugar })));
const About = lazy(() => import('./components/About').then(m => ({ default: m.About })));
const Contact = lazy(() => import('./components/Contact').then(m => ({ default: m.Contact })));
import { CookieConsent } from './components/CookieConsent';

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

function EventToast({ message, type }: { message: string; type: 'start' | 'end' }) {
  return (
    <div className="fixed top-4 right-4 z-[100] animate-fade-in">
      <div className={`px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md ${
        type === 'start'
          ? 'bg-cyan-900/80 border-cyan-500/30 text-cyan-200'
          : 'bg-emerald-900/80 border-emerald-500/30 text-emerald-200'
      }`}>
        <p className="text-sm font-bold">{message}</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { gameState } = useGame();
  const { playSfx } = useAudio();
  const [isRecovery, setIsRecovery] = useState(false);
  const [eventToast, setEventToast] = useState<{ message: string; type: 'start' | 'end' } | null>(null);

  useEffect(() => {
    let mounted = true;
    socketService.connect().then(socket => {
      if (!mounted) return;
      socket.on('event_started', (data: { eventId: string; title: string }) => {
        if (mounted) {
          setEventToast({ message: `\ud83c\udfb2 "${data.title}" ha comenzado automáticamente`, type: 'start' });
          playSfx('alert');
          setTimeout(() => { if (mounted) setEventToast(null); }, 10000);
        }
      });
      socket.on('event_completed', (data: { eventId: string; title: string }) => {
        if (mounted) {
          setEventToast({ message: `\u2705 "${data.title}" ha finalizado`, type: 'end' });
          playSfx('alert');
          setTimeout(() => { if (mounted) setEventToast(null); }, 10000);
        }
      });
    }).catch(() => {});
    return () => { mounted = false; };
  }, [playSfx]);

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
    return (
      <>
        <UpdatePassword />
        {eventToast && <EventToast message={eventToast.message} type={eventToast.type} />}
      </>
    );
  }

  
  if (loading) {
    return (
      <>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-casino-gold to-casino-gold-dark animate-pulse shadow-gold" />
            <div className="absolute inset-0 w-14 h-14 rounded-2xl border-2 border-casino-gold/20 animate-ping" />
          </div>
          <p className="text-gray-500 text-xs uppercase tracking-[0.2em] font-bold animate-pulse">Cargando</p>
        </div>
        {eventToast && <EventToast message={eventToast.message} type={eventToast.type} />}
      </>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        {eventToast && <EventToast message={eventToast.message} type={eventToast.type} />}
      </>
    );
  }

  if (!gameState) {
    return (
      <>
        <MainMenu />
        {eventToast && <EventToast message={eventToast.message} type={eventToast.type} />}
      </>
    );
  }
  
  if ((gameState.phase as any) === 'setup') {
    return (
      <>
        <MainMenu />
        {eventToast && <EventToast message={eventToast.message} type={eventToast.type} />}
      </>
    );
  }
  
  const isSpectator = !!localStorage.getItem('casino21_spectatorRoomId');
  
  return (
    <>
      <GameScreen isSpectator={isSpectator} />
      {eventToast && <EventToast message={eventToast.message} type={eventToast.type} />}
    </>
  );
}

export default function App() {
  // ─── Legal Page Router (public, no auth required) ─────────────────────────
  const pathname = window.location.pathname;
  if (pathname === '/privacy') return <Suspense fallback={<LoadingFallback />}><PrivacyPolicy /></Suspense>;
  if (pathname === '/terms')   return <Suspense fallback={<LoadingFallback />}><TermsOfService /></Suspense>;
  if (pathname === '/cookies') return <Suspense fallback={<LoadingFallback />}><CookiePolicy /></Suspense>;
  if (pathname === '/como-jugar') return <Suspense fallback={<LoadingFallback />}><ComoJugar /></Suspense>;
  if (pathname === '/about') return <Suspense fallback={<LoadingFallback />}><About /></Suspense>;

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
          <CookieConsent />
        </GameProvider>
      </AudioProvider>
    </AuthProvider>
  );
}
