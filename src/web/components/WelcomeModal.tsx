import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

export function WelcomeModal() {
  const { profile, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile && user) {
      if (!profile.username || profile.username.trim() === '' || profile.username.startsWith('Jugador_')) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }
  }, [profile, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('El nombre de usuario no puede estar vacío');
      return;
    }
    if (username.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (username.trim().length > 15) {
      setError('El nombre no puede tener más de 15 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user?.id);

      if (updateError) throw updateError;
      
      // La actualización a través de supabase debería disparar un cambio que podemos capturar
      // Pero por ahora cerramos el modal, el hook useAuth podría requerir un re-fetch si es necesario
      // o simplemente confiar en que la próxima vez que cargue estará bien.
      // Sin embargo, para forzar el refetch, podemos recargar la página o dejar que el componente principal lo maneje.
      window.location.reload();
      
    } catch (err: any) {
      console.error('Error al actualizar username:', err);
      setError(err.message || 'Error al guardar el nombre de usuario');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-panel-strong p-8 max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-casino-gold to-yellow-600"></div>
        
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">👋</div>
          <h2 className="text-3xl font-display font-black text-white tracking-widest uppercase mb-2">
            ¡Bienvenido!
          </h2>
          <p className="text-gray-400 text-sm">
            Parece que eres nuevo o no tienes un nombre de jugador. Por favor, elige cómo quieres que te llamen en la arena.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-center text-xs font-bold mb-6 animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-gray-500 mb-2">
              Nombre de Jugador
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-center font-display font-bold text-xl text-casino-gold placeholder:text-gray-700 focus:border-casino-gold/50 focus:outline-none transition-colors"
              placeholder="Ej. ProPlayer21"
              maxLength={15}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !username.trim()}
            className="w-full py-4 bg-gradient-to-r from-casino-gold to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-display font-black text-lg tracking-widest uppercase rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)]"
          >
            {loading ? 'Guardando...' : 'Comenzar a Jugar'}
          </button>
        </form>
      </div>
    </div>
  );
}
