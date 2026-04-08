import React, { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { GameMode } from '../../domain/types';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { ProfileHeader } from './ProfileHeader';
import { SocialPanel } from './SocialPanel';
import { TournamentList } from './TournamentList';
import { RecentAchievements } from './RecentAchievements';
import { QuickStats } from './QuickStats';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationToast } from './NotificationToast';
import { GameInvitationModal } from './GameInvitationModal';

export function MainMenu() {
  const { setGameState, setLocalPlayerId } = useGame();
  const { profile, signOut } = useAuth();
  const { toast, dismissToast, totalPending, appNotifications, unreadCount, markAllAsRead, markNotificationAsRead, deleteReadNotifications, handleGameInvite, activeGameInvitation, setActiveGameInvitation } = useNotifications();
  
  const [playerName, setPlayerName] = useState(profile?.username || 'Jugador');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [mode, setMode] = useState<GameMode>('1v1');
  const [mobileTab, setMobileTab] = useState<'social' | 'lobby' | 'stats'>('lobby');
  
  const [view, setView] = useState<'menu' | 'waiting'>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<string[]>([]);
  const [error, setError] = useState('');

  // ─── Desktop Invitation Listener ───
  useEffect(() => {
    const handleJoinGameFromInvite = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { roomId } = customEvent.detail;
      setRoomIdInput(roomId);
      if (playerName.trim() && roomId) {
        socketService.connect().then(socket => {
          socket.emit('join_room', { roomId: roomId.toUpperCase(), playerName });
        }).catch(err => setError(err.message || 'Error conectando al servidor...'));
      }
    };

    window.addEventListener('join_game_from_invite', handleJoinGameFromInvite);
    return () => {
      window.removeEventListener('join_game_from_invite', handleJoinGameFromInvite);
    };
  }, [playerName]);

  useEffect(() => {
    if (profile?.username) {
      setPlayerName(profile.username);
    }
  }, [profile]);

  // ─── Socket Logic (UNTOUCHED) ───
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        const socket = await socketService.connect();
        
        if (!mounted) return;

        const savedRoomId = localStorage.getItem('casino21_roomId');
        if (savedRoomId && profile?.username) {
          socket.emit('join_room', { roomId: savedRoomId, playerName: profile.username });
        }

        socket.on('room_created', ({ roomId, playerId }) => {
          setCurrentRoomId(roomId);
          setLocalPlayerId(playerId);
          localStorage.setItem('casino21_roomId', roomId);
          localStorage.setItem('casino21_playerId', playerId);
          setPlayersInRoom([playerName]);
          setView('waiting');
          setError('');
        });

        socket.on('room_joined', ({ roomId, playerId }) => {
          setCurrentRoomId(roomId);
          setLocalPlayerId(playerId);
          localStorage.setItem('casino21_roomId', roomId);
          localStorage.setItem('casino21_playerId', playerId);
          setView('waiting');
          setError('');
        });

        socket.on('player_joined', ({ players }) => {
          setPlayersInRoom(players);
          // Only switch view if not already waiting. RoomId will be set by room_joined if this player just joined
          setView(prevView => prevView === 'menu' ? 'waiting' : prevView);
        });

        socket.on('error', (msg: string) => {
          setError(msg);
        });
      } catch (err) {
        console.error("Error conectando socket:", err);
      }
    };

    setupSocket();

    return () => {
      mounted = false;
      try {
        const socket = socketService.getSocket();
        socket.off('room_created');
        socket.off('room_joined');
        socket.off('player_joined');
        socket.off('error');
      } catch (e) {
        // Socket might not be connected yet
      }
    };
  }, [playerName, setGameState, setLocalPlayerId]);
  // ─── END Socket Logic ───

  const handleCreateRoom = async () => {
    if (!playerName.trim()) return setError('Ingresa tu nombre');
    try {
      const socket = await socketService.connect();
      socket.emit('create_room', { playerName, mode });
    } catch (e: any) {
      console.error("Error en handleCreateRoom:", e);
      setError(e.message || 'Error conectando al servidor...');
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) return setError('Ingresa tu nombre');
    if (!roomIdInput.trim()) return setError('Ingresa el código de la sala');
    
    try {
      const socket = await socketService.connect();
      socket.emit('join_room', { roomId: roomIdInput.toUpperCase(), playerName });
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error conectando al servidor...');
    }
  };

  // ─── Waiting Room View ───
  if (view === 'waiting') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="glass-panel-strong p-8 max-w-md w-full text-center animate-fade-in">
          {/* Room Code */}
          <div className="mb-6">
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-bold mb-1">Código de Sala</p>
            <h2 className="text-4xl font-display font-black text-casino-gold tracking-widest animate-glow-pulse inline-block">
              {currentRoomId}
            </h2>
          </div>
          
          <p className="text-gray-400 text-sm mb-8">Comparte este código con tus oponentes</p>
          
          {/* Player Slots */}
          <div className="space-y-3 mb-8">
            <h3 className="section-header text-center">
              Jugadores ({playersInRoom.length}/{mode === '1v1' ? 2 : 4})
            </h3>
            {playersInRoom.map((p, i) => (
              <div key={i} className="bg-casino-emerald/10 border border-casino-emerald/20 py-3 px-4 rounded-xl text-sm font-display font-bold text-casino-emerald flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-casino-emerald animate-pulse" />
                {p}
              </div>
            ))}
            {Array.from({ length: (mode === '1v1' ? 2 : 4) - playersInRoom.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/[0.02] py-3 px-4 rounded-xl text-sm font-medium border border-dashed border-white/[0.08] text-gray-600 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-gray-600/50" />
                Esperando jugador...
              </div>
            ))}
          </div>

          {/* Loading indicator */}
          <div className="flex items-center justify-center gap-2 text-blue-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-sm font-medium ml-2">El juego iniciará automáticamente</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main 3-Column Layout ───
  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      {/* Ambient background orbs */}
      <div className="ambient-orb ambient-orb-gold w-[400px] h-[400px] -top-40 -left-20" />
      <div className="ambient-orb ambient-orb-emerald w-[300px] h-[300px] bottom-20 right-10" />
      
      {/* ═════ LEFT COLUMN — Social ═════ */}
      <aside className="w-72 shrink-0 border-r border-white/[0.04] hidden lg:flex flex-col relative z-20 overflow-visible">
        <div className="p-4 overflow-visible relative z-50"> {/* Dropdown anchor area */}
          <ProfileHeader 
            appNotifications={appNotifications}
            unreadCount={unreadCount}
            onMarkAllAsRead={markAllAsRead}
            onMarkAsRead={markNotificationAsRead}
            onChallengeClick={setActiveGameInvitation}
            onDeleteRead={deleteReadNotifications}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-4 custom-scrollbar relative z-10">
          <SocialPanel />
        </div>
      </aside>

      {/* ═════ CENTER COLUMN — Main Lobby ═════ */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0 relative z-10">
        <div className="max-w-xl mx-auto p-4 md:p-6 space-y-6 overflow-visible">

          {/* Mobile Tab Content */}
          <div className="lg:hidden">
            {mobileTab === 'social' && (
              <div className="space-y-4 animate-fade-in overflow-visible relative">
                <div className="overflow-visible relative z-50">
                  <ProfileHeader 
                    appNotifications={appNotifications}
                    unreadCount={unreadCount}
                    onMarkAllAsRead={markAllAsRead}
                    onMarkAsRead={markNotificationAsRead}
                    onChallengeClick={setActiveGameInvitation}
                    onDeleteRead={deleteReadNotifications}
                  />
                </div>
                <div className="relative z-10">
                  <SocialPanel />
                </div>
              </div>
            )}
            {mobileTab === 'stats' && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <h3 className="section-header">🏅 Logros Recientes</h3>
                  <RecentAchievements />
                </div>
                <div>
                  <h3 className="section-header">📊 Estadísticas</h3>
                  <QuickStats />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Content & Mobile Lobby Tab */}
          <div className={`space-y-6 lg:block ${mobileTab === 'lobby' ? 'block animate-fade-in' : 'hidden'}`}>
            {/* Big Logo */}
          <div className="text-center pt-4 pb-2">
            <h1 className="text-6xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold via-casino-gold-dark to-yellow-800 drop-shadow-lg animate-fade-in select-none">
              CASINO 21
            </h1>
            <p className="text-gray-500 text-xs mt-2 uppercase tracking-[0.3em] font-bold">
              Juego de cartas competitivo
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-center text-sm border border-red-500/20 animate-slide-down font-medium">
              {error}
            </div>
          )}

          {/* ─── Create Game Card ─── */}
          <div className="glass-panel-strong p-6 animate-slide-up">
            <h2 className="section-header">🎮 Nueva Partida</h2>
            
            {/* Player Name */}
            <div className="mb-5">
              <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Tu Nombre</label>
              <input 
                type="text" 
                value={playerName} 
                onChange={e => setPlayerName(e.target.value)} 
                className="input-casino text-lg" 
                placeholder="Ej. Jugador 1"
              />
            </div>

            {/* Game Mode Toggle */}
            <div className="mb-6">
              <label className="block text-[11px] text-gray-500 mb-2 uppercase tracking-widest font-bold">Modo de Juego</label>
              <div className="flex gap-3">
                <button 
                  className={`flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all duration-300 ${
                    mode === '1v1' 
                      ? 'bg-casino-gold/15 text-casino-gold border border-casino-gold/30 shadow-gold' 
                      : 'btn-ghost'
                  }`}
                  onClick={() => setMode('1v1')}
                >
                  <span className="text-lg block mb-0.5">⚔</span>
                  1 vs 1
                </button>
                <button 
                  className={`flex-1 py-3 rounded-xl font-display font-bold text-sm transition-all duration-300 ${
                    mode === '2v2' 
                      ? 'bg-casino-gold/15 text-casino-gold border border-casino-gold/30 shadow-gold' 
                      : 'btn-ghost'
                  }`}
                  onClick={() => setMode('2v2')}
                >
                  <span className="text-lg block mb-0.5">👥</span>
                  2 vs 2
                </button>
              </div>
            </div>

            {/* Create Room Button */}
            <button 
              onClick={handleCreateRoom}
              className="btn-gold w-full py-4 text-lg font-display font-black tracking-wide"
            >
              CREAR SALA
            </button>
          </div>

          {/* ─── Join Game Card ─── */}
          <div className="glass-panel p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <h2 className="section-header">🚪 Unirse a una Sala</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={roomIdInput} 
                onChange={e => setRoomIdInput(e.target.value.toUpperCase())} 
                className="input-casino flex-1 text-center font-mono text-xl uppercase tracking-[0.15em] placeholder:text-sm placeholder:normal-case placeholder:tracking-normal" 
                placeholder="Código de sala"
                maxLength={6}
              />
              <button 
                onClick={handleJoinRoom}
                className="btn-emerald px-6 shrink-0 font-display"
              >
                Unirse
              </button>
            </div>
          </div>

          {/* ─── Tournaments Section ─── */}
          <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="section-header">🏆 Torneos Activos</h2>
            <TournamentList />
          </div>

          {/* Bottom spacing */}
          <div className="h-6" />
          </div>
        </div>
      </main>

      {/* ═════ RIGHT COLUMN — Quick Stats ═════ */}
      <aside className="w-72 shrink-0 border-l border-white/[0.04] overflow-y-auto p-4 space-y-4 hidden xl:block">
        {/* Recent Achievements */}
        <div>
          <h3 className="section-header">🏅 Logros Recientes</h3>
          <RecentAchievements />
        </div>
        
        {/* Quick Stats */}
        <div>
          <h3 className="section-header">📊 Estadísticas</h3>
          <QuickStats />
        </div>
      </aside>

      {/* ═════ MOBILE BOTTOM NAVIGATION ═════ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 glass-panel-strong border-t border-white/[0.05] flex justify-around items-center p-3 px-6 z-50">
        <button 
          onClick={() => setMobileTab('social')}
          className={`flex flex-col items-center gap-1 transition-colors relative ${mobileTab === 'social' ? 'text-casino-gold' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-xl">👥</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Social</span>
          {totalPending > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
              {totalPending}
            </span>
          )}
        </button>
        <button 
          onClick={() => setMobileTab('lobby')}
          className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'lobby' ? 'text-casino-gold' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-xl">🎲</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Lobby</span>
        </button>
        <button 
          onClick={() => setMobileTab('stats')}
          className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'stats' ? 'text-casino-gold' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
        </button>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <NotificationToast 
          toast={toast}
          onDismiss={dismissToast}
          onGameInviteAccept={(invitationId, roomId) => handleGameInvite(invitationId, roomId, 'accepted')}
          onGameInviteReject={(invitationId) => handleGameInvite(invitationId, null, 'rejected')}
        />
      )}

      {/* Persistence Game Challenge Modal */}
      {activeGameInvitation && (
        <GameInvitationModal 
          invite={activeGameInvitation}
          onAccept={(invId, rId) => handleGameInvite(invId, rId, 'accepted')}
          onReject={(invId) => handleGameInvite(invId, null, 'rejected')}
          onClose={() => setActiveGameInvitation(null)}
        />
      )}
    </div>
  );
}
