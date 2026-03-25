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
        // Si el registro requiere confirmación de email, podríamos mostrar un mensaje
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error en la autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent relative z-10 p-4">
      <div className="bg-black/60 backdrop-blur-md p-10 rounded-3xl border border-white/10 max-w-md w-full shadow-2xl">
        <h1 className="text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-8 drop-shadow-lg">
          CASINO 21
        </h1>
        
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>

        {error && (
          <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-center mb-6 border border-red-500/50 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-400 mb-2 uppercase tracking-widest font-bold">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" 
                placeholder="Ej. JugadorPro"
                required={!isLogin}
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-widest font-bold">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" 
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2 uppercase tracking-widest font-bold">Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full bg-black/50 border border-white/20 rounded-xl p-3 text-white focus:outline-none focus:border-yellow-500 transition-colors" 
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black text-lg py-3 rounded-xl shadow-lg transition transform hover:scale-105 disabled:opacity-50 disabled:transform-none mt-4"
          >
            {loading ? 'Cargando...' : (isLogin ? 'ENTRAR' : 'REGISTRARSE')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-gray-400 hover:text-white transition-colors text-sm underline"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>
    </div>
  );
}
