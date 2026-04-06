import React, { useState } from 'react';
import { supabase } from '../services/supabase';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        if (!username.trim()) throw new Error('El nombre de usuario es obligatorio');
        
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
            }
          }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 relative z-10">
      {/* Ambient orbs */}
      <div className="ambient-orb ambient-orb-gold w-[350px] h-[350px] -top-28 left-1/4" />
      <div className="ambient-orb ambient-orb-emerald w-[250px] h-[250px] bottom-10 right-1/4" />

      <div className="glass-panel-strong p-8 md:p-10 max-w-md w-full animate-fade-in relative">
        {/* Decorative top line */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-casino-gold/30 to-transparent" />

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-casino-gold via-casino-gold-dark to-yellow-800 drop-shadow-lg select-none">
            CASINO 21
          </h1>
          <p className="text-gray-500 text-[10px] mt-2 uppercase tracking-[0.3em] font-bold">
            Juego de cartas competitivo
          </p>
        </div>
        
        {/* Tab Toggle */}
        <div className="flex bg-black/30 rounded-xl p-1 mb-6 border border-white/[0.04]">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-display font-bold transition-all duration-300 ${
              isLogin 
                ? 'bg-casino-gold/15 text-casino-gold' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-display font-bold transition-all duration-300 ${
              !isLogin 
                ? 'bg-casino-gold/15 text-casino-gold' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 text-red-400 p-3 rounded-xl text-center text-sm mb-5 border border-red-500/20 animate-slide-down font-medium">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="input-casino" 
                placeholder="Ej. JugadorPro"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="input-casino" 
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="input-casino" 
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3.5 text-lg font-display font-black tracking-wide mt-2 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-casino-bg/30 border-t-casino-bg rounded-full animate-spin" />
                Cargando...
              </span>
            ) : (
              isLogin ? 'ENTRAR' : 'REGISTRARSE'
            )}
          </button>
        </form>

        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
    </div>
  );
}
