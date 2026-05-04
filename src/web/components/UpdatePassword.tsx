import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { LogoK21 } from './LogoK21';

export function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Escuchar el evento de contraseña actualizada para asegurar que se limpie la URL
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log('Modo recuperación de contraseña activo');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
      
      setSuccess(true);
      // Redirigir después de 2 segundos o recargar para que App.tsx lea el nuevo estado
      setTimeout(() => {
        window.location.hash = '';
        window.location.reload();
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo */}
      <div className="mb-8 relative animate-fade-in-up">
        <div className="absolute inset-0 bg-casino-gold/20 blur-2xl rounded-full" />
        <LogoK21 size={96} />
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="text-2xl font-display font-black text-white text-center mb-2">Nueva Contraseña</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Ingresa tu nueva contraseña para Casino 21.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p className="mt-0.5">{error}</p>
          </div>
        )}

        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-6 rounded-xl text-center mb-6">
            <div className="text-3xl mb-2">✅</div>
            <p className="font-bold">¡Contraseña actualizada!</p>
            <p className="text-sm mt-1 opacity-80">Redirigiendo al juego...</p>
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-5">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Nueva Contraseña</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:bg-white/10 transition-all font-mono"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-b from-casino-gold to-casino-gold-dark text-black font-display font-black tracking-wide rounded-xl mt-2 hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? 'ACTUALIZANDO...' : 'GUARDAR CONTRASEÑA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
