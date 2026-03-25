import React, { useState, useEffect } from 'react';
import { useGame } from '../hooks/useGame';
import { GameMode } from '../../domain/types';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';

export function MainMenu() {
  const { setGameState, setLocalPlayerId } = useGame();
  const { profile, signOut } = useAuth();
  
  const [playerName, setPlayerName] = useState(profile?.username || 'Jugador');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [mode, setMode] = useState<GameMode>('1v1');
  
  const [view, setView] = useState<'menu' | 'waiting'>('menu');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [playersInRoom, setPlayersInRoom] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.username) {
      setPlayerName(profile.username);
    }
  }, [profile]);

  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      try {
        const socket = await socketService.connect();
        
        if (!mounted) return;

        // Auto-Reconexión: Verificar si había una sala activa
        const savedRoomId = localStorage.getItem('casino21_roomId');
        if (savedRoomId && profile?.username) {
          socket.emit('join_room', { roomId: savedRoomId, playerName: profile.username });
        }

        socket.on('room_created', ({ roomId, playerId }) => {
          setCurrentRoomId(roomId);
          setLocalPlayerId(playerId);
          
          // Guardar información de la sala en localStorage para permitir reconexión
          localStorage.setItem('casino21_roomId', roomId);
          localStorage.setItem('casino21_playerId', playerId);
          
          setPlayersInRoom([playerName]);
          setView('waiting');
          setError('');
        });

        socket.on('player_joined', ({ players }) => {
          setPlayersInRoom(players);
          // Cambiar a vista de espera si aún no lo estamos
          setView(prevView => {
            if (prevView === 'menu') {
              const rId = roomIdInput.toUpperCase();
              setCurrentRoomId(rId);
              // Guardar información de la sala en localStorage para reconexión (el playerId real lo asume el server por el JWT)
              localStorage.setItem('casino21_roomId', rId);
              return 'waiting';
            }
            return prevView;
          });
        });

        socket.on('error', (msg: string) => {
          setError(msg);
        });

        // Ya no escuchamos game_state_update aquí porque se desmonta al iniciar y perdemos el socket
        // Ahora se escucha globalmente en useGame.tsx
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
        socket.off('player_joined');
        socket.off('error');
      } catch (e) {
        // Socket might not be connected yet
      }
    };
  }, [playerName, setGameState, setLocalPlayerId]);

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
      // Removemos el setCurrentRoomId de aquí para esperar a que el servidor confirme la unión
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Error conectando al servidor...');
    }
  };

  if (view === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-transparent">
        <div className="bg-black/40 backdrop-blur-md p-10 rounded-3xl border border-white/10 max-w-md w-full text-center shadow-2xl">
          <h2 className="text-3xl font-bold text-yellow-400 mb-2">Sala: {currentRoomId}</h2>
          <p className="text-gray-300 mb-8">Comparte este código con tus oponentes</p>
          
          <div className="space-y-4 mb-8">
            <h3 className="font-bold text-white uppercase tracking-widest text-sm">Jugadores ({playersInRoom.length}/{mode === '1v1' ? 2 : 4})</h3>
            {playersInRoom.map((p, i) => (
              <div key={i} className="bg-white/10 py-3 rounded-xl text-lg font-medium border border-white/5">
                {p}
              </div>
            ))}
            {/* Skeletons para jugadores faltantes */}
            {Array.from({ length: (mode === '1v1' ? 2 : 4) - playersInRoom.length }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white/5 py-3 rounded-xl text-lg font-medium border border-dashed border-white/20 text-white/30">
                Esperando jugador...
              </div>
            ))}
          </div>

          <div className="animate-pulse text-blue-400 font-bold">
            El juego iniciará automáticamente...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent relative z-10">
      <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4">
        <div className="text-right">
          <div className="text-white font-bold">{profile?.username || 'Jugador'}</div>
          <div className="text-yellow-400 text-sm font-black">ELO: {profile?.elo || 1000}</div>
        </div>
        <button 
          onClick={signOut}
          className="bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors border border-red-500/30"
        >
          Salir
        </button>
      </div>

      <div className="bg-black/40 backdrop-blur-md p-10 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl">
        <h1 className="text-6xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-10 drop-shadow-lg">
          CASINO 21
        </h1>
        
        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-center mb-6 border border-red-500/50">{error}</div>}

        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2 uppercase tracking-widest font-bold">Tu Nombre</label>
          <input 
            type="text" 
            value={playerName} 
            onChange={e => setPlayerName(e.target.value)} 
            className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-yellow-500 transition-colors" 
            placeholder="Ej. Jugador 1"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm text-gray-400 mb-2 uppercase tracking-widest font-bold">Modo de Juego</label>
          <div className="flex gap-4">
            <button 
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === '1v1' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}
              onClick={() => setMode('1v1')}
            >
              1 vs 1
            </button>
            <button 
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${mode === '2v2' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'}`}
              onClick={() => setMode('2v2')}
            >
              2 vs 2
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={handleCreateRoom}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black text-lg py-4 rounded-xl shadow-lg transition transform hover:scale-105"
          >
            CREAR SALA
          </button>
          
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm font-bold">O ÚNETE A UNA</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              value={roomIdInput} 
              onChange={e => setRoomIdInput(e.target.value.toUpperCase())} 
              className="flex-grow bg-black/50 border border-white/20 rounded-xl p-4 text-white text-center font-mono text-xl focus:outline-none focus:border-blue-500 transition-colors uppercase placeholder:normal-case placeholder:text-sm" 
              placeholder="Código"
              maxLength={6}
            />
            <button 
              onClick={handleJoinRoom}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 rounded-xl shadow-lg transition"
            >
              Unirse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
