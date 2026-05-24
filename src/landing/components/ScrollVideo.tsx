import brand21Icon from '../../Public/brand21Icon-164.webp';
import splashBg from '../../Public/splash.webp';

export default function ScrollVideo() {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#0a0f1e]">
      {/* Background image */}
      <div
        className="absolute inset-0 z-0 bg-[#0a0f1e] bg-no-repeat bg-center bg-cover"
        style={{
          backgroundImage: `url(${splashBg})`,
        }}
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/60 via-black/30 to-black/60" />

      {/* Hero content overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-4 sm:px-6">
        <div className="max-w-4xl">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
            <img src={brand21Icon} alt="Kasino21 icono" className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <div className="border-cyber bg-yellow-500/10 text-yellow-400 text-[8px] sm:text-[10px] font-bold px-2 py-1 sm:px-3 sm:py-1.5 rounded-full uppercase tracking-[0.2em]">
              Juego de Cartas Competitivo Online
            </div>
          </div>

          <h1 className="text-[clamp(1.6rem,7vw,4.5rem)] font-black mb-4 sm:mb-6 leading-[1.1]">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-600 font-['Russo_One']" style={{ textShadow: '0 0 30px rgba(251,191,36,0.5), 0 2px 8px rgba(0,0,0,0.9), 0 0 60px rgba(251,191,36,0.3)' }}>
              Conquista el ranking.<br />Domina las mesas.<br />Construye tu legado.
            </span>
          </h1>

          <p className="text-sm sm:text-lg md:text-xl text-yellow-100/90 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed font-bold font-['Chakra_Petch'] px-2" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 20px rgba(251,191,36,0.15)' }}>
            El juego de cartas más estratégico. Compite en torneos, sube tu ELO y demuestra quién domina la mesa.
          </p>

          <p className="text-yellow-200/60 mb-6 sm:mb-10 text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] font-bold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
            Modos 1v1 y 2v2 · Rankings en tiempo real · Torneos · Sistema de logros
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto">
            <a
              href="/login"
              className="relative bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-base sm:text-lg px-10 py-4 sm:px-12 sm:py-5 rounded-2xl hover:scale-105 transition-transform duration-300 animate-cta-pulse font-['Russo_One'] tracking-wider w-full sm:w-auto text-center"
            >
              JUGAR GRATIS
            </a>
            <a
              href="/como-jugar"
              className="border-cyber-strong bg-white/[0.05] text-yellow-200 hover:text-yellow-400 font-bold text-sm sm:text-base px-8 py-3.5 sm:px-10 sm:py-4 rounded-2xl hover:bg-white/[0.1] transition-all duration-300 font-['Chakra_Petch'] w-full sm:w-auto text-center"
            >
              Cómo jugar
            </a>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-50 z-10">
        <span className="text-[8px] sm:text-[10px] uppercase tracking-[0.3em] text-yellow-400/70" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>Scroll para explorar</span>
        <div className="w-px h-6 bg-gradient-to-b from-yellow-400/60 to-transparent" />
      </div>
    </section>
  );
}
