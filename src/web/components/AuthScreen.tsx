import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { LogoK21 } from './LogoK21';
import splashBg from '../../Public/splash.webp';

export function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleOAuth = async (provider: 'google' | 'discord') => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || `Ocurrió un error al conectar con ${provider}`);
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (isRecovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/#type=recovery`,
        });
        if (error) throw error;
        setSuccessMsg('Revisa tu correo para recuperar tu contraseña.');
        setIsRecovery(false);
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        if (!username.trim()) throw new Error('El nombre de usuario es obligatorio');
        if (username.trim().length < 3) throw new Error('El nombre debe tener al menos 3 caracteres');
        if (!acceptedTerms) throw new Error('Debes aceptar los Términos de Servicio para registrarte');
        
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
        setSuccessMsg('¡Registro exitoso! Revisa tu correo para verificar tu cuenta (si aplica).');
      }
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError(err.message || 'Ocurrió un error en la autenticación');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${splashBg})` }}
    >
      {/* Dark gradient overlay for professional look and text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/85 via-[#050505]/70 to-[#050505]/95 pointer-events-none" />

      {/* Background Ambient FX */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-casino-gold/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Scanlines Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cGF0aCBkPSJNMCAwTDQgNE0wIDRMNCAwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wMikiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4=')] opacity-40 mix-blend-overlay" />

      <div className="flex-1 flex items-center justify-center w-full py-12">
        <div className="w-full max-w-md bg-black/40 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
          
          {/* Header / Logo */}
          <div className="flex flex-col items-center mb-8 relative">
            <div className="absolute inset-0 bg-casino-gold/20 blur-[40px] rounded-full" />
            <div className="relative z-10 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] animate-float">
              <LogoK21 size={96} />
            </div>
            <h1 className="text-3xl font-display font-black text-yellow-600 mt-4 tracking-wider uppercase">
              KASINO <span className="text-transparent bg-clip-text bg-gradient-to-r from-casino-gold to-casino-gold-dark">21</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1 uppercase tracking-[0.2em] font-bold">Autenticación</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 animate-fade-in-up">
              <span className="text-lg">⚠️</span>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl text-sm mb-6 flex items-start gap-3 animate-fade-in-up">
              <span className="text-lg">✅</span>
              <p className="mt-0.5">{successMsg}</p>
            </div>
          )}

          {/* Tabs for Login/Register (Only if not in recovery) */}
          {!isRecovery && (
            <div className="flex p-1 bg-white/5 rounded-xl mb-6 border border-white/5">
              <button 
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-display font-bold transition-all duration-300 ${
                  isLogin ? 'bg-casino-gold/20 text-casino-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Iniciar Sesión
              </button>
              <button 
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-display font-bold transition-all duration-300 ${
                  !isLogin ? 'bg-casino-gold/20 text-casino-gold shadow-[0_0_10px_rgba(212,175,55,0.2)]' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Registrarse
              </button>
            </div>
          )}

          {isRecovery && (
            <div className="mb-6">
              <h3 className="text-xl font-display font-bold text-white mb-2 text-center">Recuperar Contraseña</h3>
              <p className="text-gray-400 text-xs text-center">Ingresa tu correo y te enviaremos un enlace para cambiar tu contraseña.</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && !isRecovery && (
              <div>
                <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Usuario</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:bg-white/10 transition-all font-mono"
                  placeholder="Tu alias"
                  required
                  minLength={3}
                  maxLength={15}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] text-gray-500 mb-1.5 uppercase tracking-widest font-bold">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:bg-white/10 transition-all font-mono"
                placeholder="tu@email.com"
                required
              />
            </div>

            {!isRecovery && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] text-gray-500 uppercase tracking-widest font-bold">Contraseña</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setIsRecovery(true)}
                      className="text-[11px] text-casino-gold hover:text-white transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
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
            )}

            {!isLogin && !isRecovery && (
              <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-black/40 text-casino-gold focus:ring-casino-gold/50 cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-xs text-gray-400 leading-relaxed cursor-pointer select-none">
                  Acepto los{' '}
                  <button
                    type="button"
                    onClick={() => setShowTerms(true)}
                    className="text-casino-gold hover:text-white underline font-bold"
                  >
                    Términos de Servicio
                  </button>
                  {' '}y confirmo que soy mayor de 13 años.
                </label>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-b from-casino-gold to-casino-gold-dark text-black font-display font-black tracking-widest rounded-xl mt-4 hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  PROCESANDO...
                </span>
              ) : (
                isRecovery ? 'ENVIAR ENLACE' : isLogin ? 'ENTRAR AL CASINO' : 'CREAR CUENTA VIP'
              )}
            </button>

            {isRecovery && (
              <button 
                type="button"
                onClick={() => setIsRecovery(false)}
                className="w-full py-3 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Volver a Iniciar Sesión
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[85vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-casino-gold rounded-full" />
                <h2 className="text-xl font-display font-black text-white uppercase tracking-tighter">Términos de Servicio</h2>
              </div>
              <button
                onClick={() => setShowTerms(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar">
              <div className="prose prose-invert prose-sm max-w-none space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black">Legal / Kasino21</p>
                  <p className="text-[10px] text-casino-gold font-bold">ACTUALIZADO: 05 MAYO 2026</p>
                </div>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">1. Aceptación de Términos</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Al acceder o jugar KASINO21, aceptas estos términos. Si no estás de acuerdo, no uses el juego.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">2. Descripción del Servicio</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">KASINO21 es un juego de cartas online con monedas virtuales. Las monedas, avatares y artículos del Shop NO tienen valor monetario real y NO pueden canjearse por dinero.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">3. Propiedad Intelectual</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Todo el contenido de KASINO21, incluyendo código fuente, diseño, gráficos, logo, nombre "KASINO21", mecánicas de juego y textos, son propiedad exclusiva de Angel. Queda prohibido copiar, distribuir, modificar, descompilar o crear obras derivadas sin autorización escrita.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">4. Conducta del Usuario</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Te comprometes a no hacer trampa, usar bots, explotar bugs, acosar a otros jugadores o intentar hackear el servicio. Nos reservamos el derecho de banear cuentas sin reembolso si violas esto.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">5. Compras Virtuales</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Todas las compras de monedas, avatares VIP o Pases son finales y no reembolsables, excepto cuando lo exija la ley. Al comprar, recibes una licencia de uso del artículo virtual, no propiedad del mismo.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">6. Sin Apuestas con Dinero Real</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">KASINO21 es solo entretenimiento. Está prohibido apostar, vender o intercambiar cuentas, monedas o artículos por dinero real fuera de la plataforma.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">7. Limitación de Responsabilidad</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">El juego se ofrece "tal cual". No garantizamos que estará libre de errores 24/7. No nos hace responsables por pérdida de monedas virtuales debido a bugs, resets o cierre del servicio.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">8. Terminación</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Podemos suspender tu acceso en cualquier momento si incumples estas reglas.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">9. Cambios a los Términos</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">Podemos actualizar estos términos. El uso continuo después de cambios implica aceptación.</p>
                </section>
                
                <section>
                  <h3 className="text-casino-gold font-display font-bold text-base mb-2 uppercase tracking-wide">10. Contacto</h3>
                  <p className="text-gray-300 text-sm leading-relaxed font-mono bg-white/5 p-3 rounded-lg inline-block">Para dudas legales: <span className="text-white">kasino21soporte@gmail.com</span></p>
                </section>
                
                <p className="text-gray-400 text-xs mt-8 pt-6 border-t border-white/10 text-center italic">Al crear una cuenta, confirmas que eres mayor de 13 años.</p>
              </div>
            </div>
            <div className="p-6 border-t border-white/10 bg-white/5">
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTerms(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-casino-gold to-casino-gold-dark text-black font-black uppercase tracking-widest rounded-2xl hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.99]"
              >
                He leído y acepto los términos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Footer */}
      <footer className="w-full relative z-10 text-center py-8 px-4 mt-auto">
        <div className="max-w-4xl mx-auto">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-left">
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-white/40 mb-1">Kasino 21 Engine</p>
              <p className="text-xs text-gray-500 font-medium">© 2026 KASINO21. Todos los derechos reservados.</p>
            </div>

            <div className="flex gap-8 justify-center items-center">
              <a href="/terms" className="text-xs text-gray-400 hover:text-emerald-400 transition-all uppercase tracking-widest font-bold">Términos</a>
              <a href="/privacy" className="text-xs text-gray-400 hover:text-emerald-400 transition-all uppercase tracking-widest font-bold">Privacidad</a>
              <a href="/cookies" className="text-xs text-gray-400 hover:text-emerald-400 transition-all uppercase tracking-widest font-bold">Cookies</a>
              <a href="/como-jugar" className="text-xs text-gray-400 hover:text-emerald-400 transition-all uppercase tracking-widest font-bold">Cómo Jugar</a>
            </div>

            <div className="text-right max-w-[250px]">
              <p className="text-[10px] text-gray-600 leading-relaxed font-medium">
                KASINO21 no está afiliado a ningún casino real. Monedas virtuales sin valor comercial.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>

  );
}
