import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../hooks/useGame';
import { GameMode } from '../../domain/types';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { ProfileHeader } from './ProfileHeader';
import { SocialPanel } from './SocialPanel';
import { TournamentList } from './TournamentList';
import { RecentAchievements } from './RecentAchievements';
import { QuickStats } from './QuickStats';
import { ProfileHistory } from './ProfileHistory';
import { DailyQuests } from './DailyQuests';
import { Store } from './Store';
import { TopNavbar } from './TopNavbar';
import type { DesktopTab } from './TopNavbar';
import { EventsPage } from './EventsPage';
import { AdminPanel } from './AdminPanel';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationToast } from './NotificationToast';
import { GameInvitationModal } from './GameInvitationModal';
import { WelcomeModal } from './WelcomeModal';

export function MainMenu() {
  const { setGameState, setLocalPlayerId } = useGame();
  const { profile, signOut } = useAuth();
  const { toast, dismissToast, totalPending, appNotifications, unreadCount, markAllAsRead, markNotificationAsRead, deleteReadNotifications, deleteNotification, handleGameInvite, activeGameInvitation, setActiveGameInvitation } = useNotifications();
  
  const [playerName, setPlayerName] = useState(profile?.username || 'Jugador');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [mode, setMode] = useState<GameMode>('1v1');
  const [mobileTab, setMobileTab] = useState<'social' | 'lobby' | 'stats' | 'events' | 'store' | 'admin'>('lobby');
  const [desktopTab, setDesktopTab] = useState<DesktopTab>('all');
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    try {
      return localStorage.getItem('casino21_ui_leftCollapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [rightCollapsed, setRightCollapsed] = useState(() => {
    try {
      return localStorage.getItem('casino21_ui_rightCollapsed') === 'true';
    } catch {
      return false;
    }
  });
  
  const [view, setView] = useState<'menu' | 'waiting'>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<string[]>([]);
  const [error, setError] = useState('');
  
  // ─── Modal Apuesta Sala ───
  const [showBetModal, setShowBetModal] = useState(false);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [roomBet, setRoomBet] = useState<number>(0); // Guardamos la apuesta de la sala actual
  const [roomMode, setRoomMode] = useState<'1v1' | '2v2'>('1v1'); // Selección de modo al crear sala

  // ─── FASE 8: Matchmaking State ───
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchmakingTime, setMatchmakingTime] = useState(0);
  const [matchFound, setMatchFound] = useState<{roomId: string, players: any[]} | null>(null);
  const matchmakingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showLobbyDesktop = desktopTab === 'all' || desktopTab === 'lobby';

  useEffect(() => {
    try {
      localStorage.setItem('casino21_ui_leftCollapsed', String(leftCollapsed));
    } catch {}
  }, [leftCollapsed]);

  useEffect(() => {
    try {
      localStorage.setItem('casino21_ui_rightCollapsed', String(rightCollapsed));
    } catch {}
  }, [rightCollapsed]);

  // ─── Desktop Invitation & Spectator Listener ───
  useEffect(() => {
    const handleJoinGameFromInvite = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { roomId, isTournament, isSpectator } = customEvent.detail;
      setRoomIdInput(roomId);
      if (playerName.trim() && roomId) {
        socketService.connect().then(socket => {
          socket.emit('join_room', { roomId: roomId.toUpperCase(), playerName, isTournament, isSpectator });
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

        socket.on('room_created', ({ roomId, playerId, betAmount, mode }) => {
          setCurrentRoomId(roomId);
          setLocalPlayerId(playerId);
          if (betAmount !== undefined) setRoomBet(betAmount);
          if (mode) setMode(mode);
          localStorage.setItem('casino21_roomId', roomId);
          localStorage.setItem('casino21_playerId', playerId);
          localStorage.removeItem('casino21_spectatorRoomId');
          setPlayersInRoom([playerName]);
          setView('waiting');
          setError('');
        });

        socket.on('room_joined', ({ roomId, playerId, betAmount, mode }) => {
          setCurrentRoomId(roomId);
          setLocalPlayerId(playerId);
          if (betAmount !== undefined) setRoomBet(betAmount);
          if (mode) setMode(mode);
          localStorage.setItem('casino21_roomId', roomId);
          localStorage.setItem('casino21_playerId', playerId);
          localStorage.removeItem('casino21_spectatorRoomId');
          setView('waiting');
          setError('');
        });

        // ─── FASE 7: Espectador uniéndose ───
        socket.on('room_joined_as_spectator', ({ roomId }) => {
          setCurrentRoomId(roomId);
          // Omitimos el localPlayerId porque no vamos a jugar
          // En lugar de ir a 'waiting', podemos ir directamente al juego o mantener una vista
          // El App.tsx se encarga de mostrar el GameScreen cuando hay currentRoomId
          // Necesitaremos decirle al GameScreen que somos espectadores
          // Podemos usar un estado global o local. Por simplicidad, agregamos un item a localStorage temporalmente
          localStorage.setItem('casino21_spectatorRoomId', roomId);
          setView('waiting'); // Se cambiará automáticamente a GameScreen cuando llegue el estado
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

        socket.on('room_closed', ({ roomId, reason }: { roomId: string; reason?: string }) => {
          setView('menu');
          setCurrentRoomId(null);
          setPlayersInRoom([]);
          setIsMatchmaking(false);
          setMatchFound(null);
          if (matchmakingIntervalRef.current) clearInterval(matchmakingIntervalRef.current);
          localStorage.removeItem('casino21_roomId');
          localStorage.removeItem('casino21_playerId');
          localStorage.removeItem('casino21_spectatorRoomId');
          if (reason === 'challenge_rejected') {
            setError('Tu desafío fue rechazado.');
          } else if (reason === 'challenge_expired') {
            setError('Tu desafío expiró sin respuesta.');
          } else if (reason === 'challenge_cancelled') {
            setError('El desafío fue cancelado.');
          } else {
            setError(`La sala ${roomId} fue cerrada.`);
          }
        });

        // ─── FASE 8: Matchmaking Events ───
        socket.on('match_found', (data: { roomId: string, players: any[] }) => {
          setIsMatchmaking(false);
          if (matchmakingIntervalRef.current) clearInterval(matchmakingIntervalRef.current);
          setMatchFound(data);
          
          // IMPORTANTE: Establecer localPlayerId para que el cliente sepa que es su turno
          const myPlayer = data.players.find(p => p.id === profile?.id) || data.players.find(p => p.name === playerName);
          if (myPlayer) {
            setLocalPlayerId(myPlayer.id);
            setCurrentRoomId(data.roomId);
            localStorage.setItem('casino21_roomId', data.roomId);
            localStorage.setItem('casino21_playerId', myPlayer.id);
          }
          
          // Limpiar notificación tras 3 segundos (el juego arranca automáticamente)
          setTimeout(() => {
            setMatchFound(null);
          }, 3500);
        });
        // ─── FIN FASE 8 ───

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
        socket.off('room_closed');
        socket.off('match_found');
        if (matchmakingIntervalRef.current) clearInterval(matchmakingIntervalRef.current);
      } catch (e) {
        // Socket might not be connected yet
      }
    };
  }, [playerName, setGameState, setLocalPlayerId, profile?.id]);
  // ─── END Socket Logic ───

  const handleCreateRoomClick = () => {
    if (!playerName.trim()) return setError('Ingresa tu nombre');
    setShowBetModal(true);
  };

  const handleCreateRoomConfirm = async () => {
    try {
      if (profile && betAmount > profile.coins) {
        return setError('No tienes suficientes monedas para esta apuesta.');
      }
      setMode(roomMode); // Sincronizamos el estado global del modo
      const socket = await socketService.connect();
      socket.emit('create_room', { playerName, mode: roomMode, betAmount });
      setShowBetModal(false);
    } catch (e: any) {
      console.error("Error en handleCreateRoomConfirm:", e);
      setError(e.message || 'Error conectando al servidor...');
    }
  };

  const handleCancelRoom = () => {
    try {
      if (currentRoomId) {
        const socket = socketService.getSocket();
        socket.emit('cancel_room', { roomId: currentRoomId });
      }
    } catch (e) {}
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

  // ─── FASE 8: Matchmaking Logic ───
  const startMatchmaking = async () => {
    if (!playerName.trim()) return setError('Ingresa tu nombre');
    try {
      const socket = await socketService.connect();
      socket.emit('join_matchmaking', { 
        playerName, 
        elo: profile?.elo || 1000 
      });
      setIsMatchmaking(true);
      setMatchmakingTime(0);
      setError('');
      
      if (matchmakingIntervalRef.current) clearInterval(matchmakingIntervalRef.current);
      matchmakingIntervalRef.current = setInterval(() => {
        setMatchmakingTime(prev => prev + 1);
      }, 1000);
      
    } catch (e: any) {
      console.error("Error en startMatchmaking:", e);
      setError(e.message || 'Error conectando al servidor...');
    }
  };

  const cancelMatchmaking = () => {
    try {
      const socket = socketService.getSocket();
      socket.emit('leave_matchmaking');
      setIsMatchmaking(false);
      if (matchmakingIntervalRef.current) clearInterval(matchmakingIntervalRef.current);
    } catch (e) {}
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };
  // ─── FIN FASE 8 ───

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
            {roomBet > 0 && (
              <div className="flex justify-center mb-4">
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                  Apuesta: 🪙 {roomBet}
                </span>
              </div>
            )}
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

          {/* Loading indicator & Actions */}
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center justify-center gap-2 text-blue-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              <span className="text-sm font-medium ml-2">El juego iniciará automáticamente</span>
            </div>
            
            {playersInRoom.length === 1 && (
              <button 
                onClick={handleCancelRoom}
                className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
              >
                Cancelar Sala
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Main 3-Column Layout ───
  return (
    <div className="flex flex-col h-screen overflow-hidden relative z-10">
      {/* Ambient background orbs */}
      <div className="ambient-orb ambient-orb-gold w-[400px] h-[400px] -top-40 -left-20" />
      <div className="ambient-orb ambient-orb-emerald w-[300px] h-[300px] bottom-20 right-10" />

      <TopNavbar
        appNotifications={appNotifications}
        unreadCount={unreadCount}
        onMarkAllAsRead={markAllAsRead}
        onMarkAsRead={markNotificationAsRead}
        onChallengeClick={setActiveGameInvitation}
        onDeleteRead={deleteReadNotifications}
        onDeleteNotification={deleteNotification}
        activeTab={desktopTab}
        onTabChange={setDesktopTab}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        onToggleLeft={() => setLeftCollapsed(v => !v)}
        onToggleRight={() => setRightCollapsed(v => !v)}
        isAdmin={profile?.is_admin}
      />
      
      {/* ═════ LEFT COLUMN — Social ═════ */}
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            shrink-0 border-r border-white/[0.04] hidden lg:flex flex-col relative z-20 overflow-visible transition-[width] duration-300
            ${desktopTab === 'all' ? '' : 'lg:hidden'}
            ${leftCollapsed ? 'w-14' : 'w-64'}
          `}
        >
          {leftCollapsed ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 select-none">
              <span className="text-xl">👥</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar relative z-10">
              <SocialPanel />
            </div>
          )}
        </aside>

        {/* ═════ CENTER COLUMN — Main Lobby ═════ */}
        <main className={`flex-1 overflow-y-auto pb-20 lg:pb-0 relative z-10 ${desktopTab === 'events' || desktopTab === 'store' || desktopTab === 'admin' ? 'w-full' : ''}`}>
          <div className={`mx-auto p-4 md:p-6 space-y-6 overflow-visible h-full flex flex-col ${desktopTab === 'events' || desktopTab === 'store' || desktopTab === 'admin' ? 'max-w-7xl' : 'max-w-xl'}`}>

          {/* Mobile Tab Content */}
          <div className="lg:hidden flex-1 flex flex-col">
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
                    onDeleteNotification={deleteNotification}
                  />
                </div>
                <div className="relative z-10">
                  <SocialPanel />
                </div>
              </div>
            )}
            {mobileTab === 'stats' && (
              <div className="space-y-4 animate-fade-in pb-20">
                <div>
                  <h3 className="section-header">📊 Estadísticas</h3>
                  <QuickStats />
                </div>
                <div>
                  <ProfileHistory />
                </div>
                <div>
                  <h3 className="section-header">🎯 Misiones Diarias</h3>
                  <DailyQuests />
                </div>
                <div>
                  <h3 className="section-header">🏅 Logros Recientes</h3>
                  <RecentAchievements />
                </div>
              </div>
            )}
            {mobileTab === 'events' && (
              <div className="animate-fade-in w-full flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 overflow-y-auto">
                <EventsPage />
              </div>
            )}
            {mobileTab === 'admin' && profile?.is_admin && (
              <div className="animate-fade-in w-full flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 overflow-y-auto">
                <AdminPanel />
              </div>
            )}
            {mobileTab === 'store' && (
              <div className="animate-fade-in w-full flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 overflow-y-auto">
                <Store />
              </div>
            )}
          </div>

          <div className={`hidden ${desktopTab === 'social' ? 'lg:block animate-fade-in' : 'lg:hidden'}`}>
            <SocialPanel />
          </div>

          <div className={`hidden ${desktopTab === 'stats' ? 'lg:block animate-fade-in flex-1 overflow-y-auto custom-scrollbar' : 'lg:hidden'}`}>
            <div className="space-y-4 max-w-4xl mx-auto pb-10">
              <div>
                <h3 className="section-header">📊 Estadísticas</h3>
                <QuickStats />
              </div>
              <div>
                <ProfileHistory />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="section-header">🎯 Misiones Diarias</h3>
                  <DailyQuests />
                </div>
                <div>
                  <h3 className="section-header">🏅 Logros Recientes</h3>
                  <RecentAchievements />
                </div>
              </div>
            </div>
          </div>

          <div className={`hidden ${desktopTab === 'events' ? 'lg:flex animate-fade-in flex-1' : 'lg:hidden'}`}>
            <div className="w-full flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 overflow-y-auto">
              <EventsPage />
            </div>
          </div>

          <div className={`hidden ${desktopTab === 'store' ? 'lg:flex animate-fade-in flex-1' : 'lg:hidden'}`}>
            <div className="w-full flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 overflow-y-auto">
              <Store />
            </div>
          </div>

          <div className={`hidden ${desktopTab === 'admin' && profile?.is_admin ? 'lg:flex animate-fade-in flex-1' : 'lg:hidden'}`}>
            <div className="w-full flex-1 flex flex-col bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl p-4 overflow-y-auto">
              <AdminPanel />
            </div>
          </div>

          {/* Desktop Content & Mobile Lobby Tab */}
          <div className={`space-y-8 ${mobileTab === 'lobby' ? 'block animate-fade-in' : 'hidden'} ${showLobbyDesktop ? 'lg:block' : 'lg:hidden'}`}>
            {/* Big Logo */}
          <div className="text-center pt-8 pb-4 lg:hidden">
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

          {/* ─── Matchmaking Overlay (FASE 8) ─── */}
          {isMatchmaking && !matchFound && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#020617]/90 backdrop-blur-md rounded-3xl p-6 text-center animate-fade-in">
              <div className="space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 border-4 border-t-casino-gold border-r-casino-gold border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-4 border-t-transparent border-r-transparent border-b-casino-emerald border-l-casino-emerald rounded-full animate-spin-reverse"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-2xl">⚔️</div>
                </div>
                <div>
                  <h3 className="text-2xl font-display font-black text-casino-gold uppercase tracking-widest animate-pulse">
                    Buscando Oponente
                  </h3>
                  <p className="text-gray-400 mt-2 font-mono text-xl">{formatTime(matchmakingTime)}</p>
                  <p className="text-gray-500 text-xs mt-1 uppercase tracking-widest">Rango Expandido +/- {50 + Math.min(Math.floor(matchmakingTime / 5) * 50, 500)} ELO</p>
                </div>
                <button 
                  onClick={cancelMatchmaking}
                  className="px-6 py-2 border border-red-500/30 text-red-400 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-red-500/10 transition-colors bg-transparent"
                >
                  Cancelar Búsqueda
                </button>
              </div>
            </div>
          )}

          {matchFound && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-casino-gold/10 backdrop-blur-md rounded-3xl p-6 text-center animate-scale-up">
              <div className="space-y-4 bg-black/60 p-8 rounded-3xl border border-casino-gold/30 shadow-[0_0_50px_rgba(251,191,36,0.3)]">
                <h3 className="text-4xl font-display font-black text-white uppercase tracking-widest text-shadow-gold animate-bounce" style={{ textShadow: '0 0 10px rgba(251,191,36,0.8)' }}>
                  ¡PARTIDA ENCONTRADA!
                </h3>
                <div className="flex items-center justify-center gap-6 mt-6">
                  <div className="text-right">
                    <p className="font-bold text-lg text-casino-gold">{matchFound.players[0].name}</p>
                    <p className="text-xs text-gray-400">{matchFound.players[0].elo} ELO</p>
                  </div>
                  <div className="text-3xl animate-pulse">VS</div>
                  <div className="text-left">
                    <p className="font-bold text-lg text-casino-gold">{matchFound.players[1].name}</p>
                    <p className="text-xs text-gray-400">{matchFound.players[1].elo} ELO</p>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-4">Iniciando en breve...</p>
              </div>
            </div>
          )}
          {/* ─── FIN MATCHMAKING OVERLAY ─── */}

          {/* ─── NEW GAME MODE CARDS (FASE 12) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up">
            
            {/* Ranked Card */}
            <button 
              onClick={startMatchmaking}
              className="group relative overflow-hidden rounded-3xl border border-casino-gold/30 hover:border-casino-gold transition-all duration-500 transform hover:-translate-y-2 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(251,191,36,0.3)] text-left flex flex-col h-64"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/40 to-black/80 z-0"></div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-casino-gold/20 rounded-full blur-3xl group-hover:bg-casino-gold/30 transition-colors z-0"></div>
              
              <div className="relative z-10 p-6 flex flex-col h-full">
                <div className="text-4xl mb-4 drop-shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse">⚔️</div>
                <h3 className="font-display font-black text-3xl text-white uppercase tracking-widest mt-auto mb-1 group-hover:text-casino-gold transition-colors">
                  RANKED
                </h3>
                <p className="text-gray-400 text-sm font-medium">1vs1 Competitivo por ELO</p>
                
                <div className="absolute top-6 right-6 bg-casino-gold text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                  JUGAR
                </div>
              </div>
            </button>

            {/* Custom / Friend Room Card */}
            <div className="flex flex-col gap-4 h-64">
              <button 
                onClick={handleCreateRoomClick}
                className="flex-1 group relative overflow-hidden rounded-2xl border border-blue-500/30 hover:border-blue-500 transition-all duration-500 transform hover:-translate-y-1 shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)] text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-black/80 z-0"></div>
                <div className="relative z-10 p-5 flex items-center gap-4 h-full">
                  <div className="text-3xl drop-shadow-[0_0_10px_rgba(59,130,246,0.6)]">👥</div>
                  <div>
                    <h3 className="font-display font-black text-xl text-white uppercase tracking-wider group-hover:text-blue-400 transition-colors">
                      CREAR SALA
                    </h3>
                    <p className="text-gray-400 text-xs">Juega con amigos (1v1 / 2v2)</p>
                  </div>
                </div>
              </button>

              <div className="flex-1 relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md p-5 flex flex-col justify-center gap-3">
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Unirse a Sala</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={roomIdInput} 
                    onChange={e => setRoomIdInput(e.target.value.toUpperCase())} 
                    onKeyDown={e => { if (e.key === 'Enter') handleJoinRoom(); }}
                    className="flex-1 min-w-0 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-center font-mono text-lg uppercase tracking-widest placeholder:text-xs placeholder:normal-case placeholder:tracking-normal focus:border-blue-500/50 outline-none text-white transition-colors" 
                    placeholder="Código..."
                    maxLength={6}
                  />
                  <button 
                    onClick={handleJoinRoom}
                    className="px-6 py-3 shrink-0 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 hover:text-white border border-blue-500/30 hover:border-blue-500/60 rounded-xl font-black text-sm uppercase tracking-wider transition-all"
                  >
                    IR
                  </button>
                </div>
              </div>
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
        <aside
          className={`
            shrink-0 border-l border-white/[0.04] hidden xl:flex flex-col overflow-hidden transition-[width] duration-300
            ${desktopTab === 'all' ? '' : 'xl:hidden'}
            ${rightCollapsed ? 'w-14' : 'w-64'}
          `}
        >
          {rightCollapsed ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 select-none">
              <span className="text-xl">📊</span>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              <div>
                <h3 className="section-header">🎯 Misiones Diarias</h3>
                <DailyQuests />
              </div>
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
        </aside>
      </div>

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
          onClick={() => setMobileTab('events')}
          className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'events' ? 'text-casino-gold' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-xl">📅</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Eventos</span>
        </button>
        <button 
          onClick={() => setMobileTab('stats')}
          className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'stats' ? 'text-casino-gold' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-xl">📊</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Stats</span>
        </button>
        <button 
          onClick={() => setMobileTab('store')}
          className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'store' ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span className="text-xl">🏪</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">Tienda</span>
        </button>
        {profile?.is_admin && (
          <button 
            onClick={() => setMobileTab('admin')}
            className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'admin' ? 'text-casino-gold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <span className="text-xl">🛡️</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">Admin</span>
          </button>
        )}
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

      {/* Forzar Username Modal */}
      <WelcomeModal />

      {/* ─── Modal Crear Sala (Apuesta) ─── */}
      {showBetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel-strong p-6 w-full max-w-sm relative">
            <button 
              onClick={() => setShowBetModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              ✕
            </button>
            <h3 className="section-header text-center text-xl mb-4">Crear Sala</h3>
            
            {/* ─── Selección de Modo ─── */}
            <div className="mb-6">
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-2 ml-1 text-center">Modo de Juego</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setRoomMode('1v1')}
                  className={`flex-1 py-2 rounded-xl border text-sm font-black uppercase tracking-wider transition-all ${
                    roomMode === '1v1'
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                  }`}
                >
                  1 vs 1
                </button>
                <button
                  onClick={() => setRoomMode('2v2')}
                  className={`flex-1 py-2 rounded-xl border text-sm font-black uppercase tracking-wider transition-all ${
                    roomMode === '2v2'
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                  }`}
                >
                  2 vs 2
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center mb-4">Selecciona el monto a apostar (Opcional)</p>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[0, 10, 50, 100, 500, 1000].map(amount => (
                <button
                  key={amount}
                  onClick={() => setBetAmount(amount)}
                  className={`py-2 rounded-xl border text-sm font-bold transition-all ${
                    betAmount === amount 
                      ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {amount === 0 ? 'Gratis' : `🪙 ${amount}`}
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label className="block text-[10px] uppercase text-gray-500 font-bold mb-1 ml-1">Monto personalizado</label>
              <input 
                type="number" 
                min={0}
                value={betAmount}
                onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-center text-yellow-400 font-bold focus:border-yellow-500/50 outline-none transition-colors"
              />
            </div>

            <button 
              onClick={handleCreateRoomConfirm}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all transform hover:scale-[1.02]"
            >
              Crear y Esperar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
