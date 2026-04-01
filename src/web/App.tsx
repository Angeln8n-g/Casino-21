import React, { useState, useRef, useEffect } from 'react';
import { GameProvider, useGame } from './hooks/useGame';
import { MainMenu } from './components/MainMenu';
import { GameScreen } from './components/GameScreen';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { SocialPanel } from './components/SocialPanel';
import { TournamentPage } from './pages/TournamentPage';
import { NotificationCenter } from './components/social/NotificationCenter';
import { Trophy, Users, LogOut, ChevronDown } from 'lucide-react';

function MobileProfileMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl text-white text-sm hover:bg-white/10 transition-colors"
      >
        <span className="font-bold max-w-[80px] truncate hidden xs:block">{profile?.username || '...'}</span>
        <span className="text-yellow-400 font-black text-xs hidden sm:block">{profile?.elo || 1000}</span>
        <ChevronDown size={13} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]">
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-white font-bold text-sm">{profile?.username}</p>
            <p className="text-yellow-400 text-xs font-black">ELO: {profile?.elo || 1000}</p>
          </div>
          <button
            onClick={() => { signOut(); setOpen(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-red-400 hover:bg-red-500/10 text-sm font-bold transition-colors"
          >
            <LogOut size={14} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const { gameState } = useGame();
  const [showSocial, setShowSocial] = useState(false);
  const [showTournament, setShowTournament] = useState(false);
  const [openChatWith, setOpenChatWith] = useState<{ id: string; username: string } | null>(null);

  const handleOpenChat = (friendId: string, friendName: string) => {
    setOpenChatWith({ id: friendId, username: friendName });
    setShowSocial(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  if (showTournament) {
    return <TournamentPage onBack={() => setShowTournament(false)} />;
  }

  const inGame = gameState && (gameState.phase as any) !== 'setup';

  return (
    <div className="relative">
      {/* Top nav — only outside game */}
      {!inGame && (
        <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-3 py-2 bg-black/60 backdrop-blur-md border-b border-white/10 sm:bg-transparent sm:border-none sm:py-4 sm:px-4">
          <button
            onClick={() => setShowTournament(true)}
            className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl text-yellow-400 font-bold text-sm hover:bg-white/10 transition-colors"
          >
            <Trophy size={15} />
            <span className="hidden xs:inline">Torneos</span>
          </button>
          <div className="flex gap-2 items-center">
            <NotificationCenter onOpenChat={handleOpenChat} />
            <button
              onClick={() => setShowSocial(s => !s)}
              className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 px-3 py-2 rounded-xl text-white font-bold text-sm hover:bg-white/10 transition-colors"
            >
              <Users size={15} />
              <span className="hidden xs:inline">Social</span>
            </button>
            <MobileProfileMenu />
          </div>
        </div>
      )}

      {/* Spacer so content doesn't hide under fixed nav */}
      {!inGame && <div className="h-12 sm:h-0" />}

      {inGame ? <GameScreen /> : <MainMenu />}

      {showSocial && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => { setShowSocial(false); setOpenChatWith(null); }} />
          <SocialPanel
            onClose={() => { setShowSocial(false); setOpenChatWith(null); }}
            openChatWith={openChatWith}
            onChatOpened={() => setOpenChatWith(null)}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <div className="relative min-h-dvh w-full overflow-x-hidden text-white bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none mix-blend-screen"></div>
          <AppContent />
        </div>
      </GameProvider>
    </AuthProvider>
  );
}