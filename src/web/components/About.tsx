import React, { useLayoutEffect } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';

export function About() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Sobre Nosotros | Kasino21 — Juego de Cartas Online',
      description: 'Conoce al equipo detrás de Kasino21, el juego de cartas 21 en español. Nuestra misión, tecnología y valores.',
      canonical: 'https://kasino21.com/about',
    });
    return () => resetSEO();
  }, []);

  return (
    <div className="h-screen overflow-y-auto bg-[#020617] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="opacity-90 group-hover:opacity-100 transition-opacity">
              <LogoK21 size={36} />
            </div>
            <span className="font-display font-black text-casino-gold tracking-wider text-lg">KASINO21</span>
          </a>
          <nav className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <a href="/blog" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Blog</a>
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a href="/contact" className="text-gray-500 hover:text-casino-gold transition-colors">Contacto</a>
            <a
              href="/"
              className="bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
            >
              JUGAR AHORA
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <div className="relative border-b border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/20 via-transparent to-amber-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-yellow-400" />
            Sobre Nosotros / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Sobre <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Kasino21</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Un proyecto nacido de la pasión por los juegos de cartas y la tecnología.
            Creamos un espacio donde jugadores de habla hispana pueden competir, aprender y divertirse.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <Section icon="👤" title="¿Quién está detrás de Kasino21?">
          <p>
            Kasino21 fue creado por <strong>Angel Santana</strong>, un desarrollador apasionado por los juegos de cartas
            y la programación. La idea nació de querer tener un juego de 21 digital que pudiera compartir
            con amigos y la comunidad hispanohablante, sin necesidad de descargar nada.
          </p>
          <p className="mt-3">
            Todo el desarrollo, diseño y programación ha sido hecho con cariño y dedicación, utilizando
            tecnologías modernas como React, Socket.io y Supabase para ofrecer una experiencia fluida
            en tiempo real.
          </p>
        </Section>

        <Section icon="🎯" title="Nuestra Misión">
          <p>
            Nuestra misión es simple: ofrecer el mejor juego de cartas 21 online en español, completamente
            gratuito y accesible desde cualquier navegador. No cobramos dinero real, no hay apuestas reales,
            solo diversión competitiva.
          </p>
          <p className="mt-3">
            Queremos que cada jugador, sin importar su nivel, pueda disfrutar de partidas justas,
            mejorar su estrategia y competir en un ambiente respetuoso.
          </p>
        </Section>

        <Section icon="⚙️" title="Tecnología">
          <p>Kasino21 está construido con tecnologías modernas y open source:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { name: 'React 19', desc: 'Interfaz rápida y responsiva' },
              { name: 'Socket.io', desc: 'Comunicación en tiempo real' },
              { name: 'Supabase', desc: 'Autenticación y base de datos' },
              { name: 'Vite', desc: 'Build tool ultrarrápida' },
              { name: 'Tailwind CSS', desc: 'Diseño moderno y consistente' },
              { name: 'TypeScript', desc: 'Código seguro y mantenible' },
            ].map(({ name, desc }) => (
              <div key={name} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-bold text-casino-gold">{name}</p>
                <p className="text-xs text-gray-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="💎" title="Nuestros Valores">
          <div className="space-y-4">
            {[
              {
                title: '100% Gratuito',
                desc: 'El juego es completamente gratis. Las monedas virtuales no tienen valor monetario real y no se pueden comprar ni vender.',
              },
              {
                title: 'Juego Justo',
                desc: 'Sistema de emparejamiento por ELO que enfrenta jugadores de nivel similar. Sin trampas, sin ventajas ocultas.',
              },
              {
                title: 'Privacidad Primero',
                desc: 'Recopilamos solo los datos mínimos necesarios. No vendemos tu información a terceros.',
              },
              {
                title: 'Sin Apuestas Reales',
                desc: 'Kasino21 no es un casino real. No hay dinero real involucrado. Es un juego de cartas competitivo para divertirse.',
              },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section icon="📬" title="Contacto">
          <p>¿Tienes preguntas, sugerencias o quieres reportar un problema?</p>
          <div className="mt-4 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-yellow-500/20 border border-yellow-500/30 rounded-xl flex items-center justify-center text-2xl shrink-0">
              📧
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Escríbenos</p>
              <a href="mailto:kasino.21@gmail.com" className="text-casino-gold hover:text-white transition-colors font-mono text-sm">
                kasino21.service@gmail.com
              </a>
              <p className="text-xs text-gray-600 mt-1">Respondemos en 24-48 horas</p>
            </div>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <AboutFooter />
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-10">
        {children}
      </div>
    </section>
  );
}

function AboutFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/20">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <LogoK21 size={28} />
          <div>
            <p className="text-xs font-black text-white/60 uppercase tracking-widest">KASINO21</p>
            <p className="text-[10px] text-gray-600">© 2026 · Todos los derechos reservados</p>
          </div>
        </div>
        <nav className="flex gap-6">
          <a href="/privacy" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Privacidad</a>
          <a href="/terms" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Términos</a>
          <a href="/cookies" className="text-xs text-gray-600 hover:text-gray-400 uppercase tracking-widest font-bold transition-colors">Cookies</a>
        </nav>
        <a
          href="/"
          className="text-xs bg-gradient-to-r from-yellow-500 to-yellow-400 text-black px-4 py-2 rounded-xl font-black uppercase tracking-widest hover:scale-105 transition-transform"
        >
          JUGAR AHORA
        </a>
      </div>
    </footer>
  );
}
