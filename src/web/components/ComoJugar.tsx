import React, { useLayoutEffect } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';

export function ComoJugar() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Cómo Jugar Casino 21 — Reglas del Juego de Cartas Online | KASINO21',
      description: 'Aprende a jugar Casino 21: objetivo, valor de cartas, puntuación, virado, sumatorias y todo sobre el juego de cartas online de KASINO21.',
      canonical: 'https://kasino21.com/como-jugar',
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
            <a href="/terms" className="text-gray-500 hover:text-casino-gold transition-colors">Términos</a>
            <a href="/privacy" className="text-gray-500 hover:text-casino-gold transition-colors">Privacidad</a>
            <a href="/cookies" className="text-gray-500 hover:text-casino-gold transition-colors">Cookies</a>
            <a
              href="/"
              className="bg-casino-gold/10 hover:bg-casino-gold/20 text-casino-gold border border-casino-gold/30 px-4 py-2 rounded-xl transition-all"
            >
              ← Jugar
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
            Guía / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Cómo Jugar{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-400">Casino 21</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Aprende las reglas del juego de cartas Casino 21 y domina la mesa. Compite en partidas 1v1 o 2v2,
            acumula puntos y sé el primero en alcanzar 21.
          </p>
          <p className="text-[11px] text-gray-600 mt-4 font-mono">
            Reglas tradicionales · Versión digital · Partidas en tiempo real
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        <Section icon="🎯" title="Objetivo del juego">
          <p>
            El objetivo de <strong>Casino 21</strong> es ser el primero en alcanzar <strong>21 puntos</strong> acumulados a lo largo de varias rondas.
            Cada ronda, los jugadores compiten por recolectar cartas de la mesa y sumar puntos según las cartas obtenidas.
          </p>
          <p className="mt-3">
            El juego combina estrategia, memoria y cálculo. No solo importa qué cartas tienes, sino cuándo y cómo las juegas.
          </p>
        </Section>

        <Section icon="🃏" title="Valor de las cartas">
          <p>Se utiliza una baraja francesa estándar de 52 cartas. El valor de cada carta es:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { value: 'As', points: '1 punto' },
              { value: '2 – 10', points: 'Su valor nominal' },
              { value: 'J', points: '11 puntos' },
              { value: 'Q', points: '12 puntos' },
              { value: 'K', points: '13 puntos' },
            ].map(({ value, points }) => (
              <div key={value} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-lg font-black text-casino-gold">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{points}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Los palos (picas, corazones, diamantes, tréboles) no afectan el valor de las cartas, pero son importantes para la puntuación.
          </p>
        </Section>

        <Section icon="🎮" title="Mecánicas del juego">
          <h3 className="text-base font-bold text-white mt-6 mb-3">Inicio de la partida</h3>
          <p>
            Al comenzar cada ronda, cada jugador recibe <strong>4 cartas</strong> en su mano y se colocan <strong>4 cartas descubiertas</strong> en la mesa (el board).
            El jugador que repartió las cartas tiene el último turno de la ronda.
          </p>

          <h3 className="text-base font-bold text-white mt-6 mb-3">Tu turno</h3>
          <p>En cada turno, debes jugar una carta de tu mano. Puedes realizar las siguientes acciones:</p>

          <div className="space-y-4 mt-4">
            <ActionCard
              title="Llevar cartas"
              desc="Si juegas una carta cuyo valor coincide con una o más cartas en la mesa, puedes llevarte todas esas cartas. Se retiran del board y se añaden a tu colección."
            />
            <ActionCard
              title="Formar sumatorias"
              desc="Puedes agrupar cartas del board cuya suma total sea igual al valor de una carta en tu mano. Al jugar esa carta, te llevas todas las cartas de la sumatoria. Otros jugadores también pueden llevarse tu sumatoria si tienen la carta adecuada."
            />
            <ActionCard
              title="Cantar un As"
              desc="Si tienes dos Ases en tu mano, puedes cantar (colocar) un As en el board de forma protegida. Ese As no podrá ser llevado por otros jugadores hasta tu próximo turno."
            />
            <ActionCard
              title="Colocar carta en el board"
              desc="Si tu carta no coincide con ninguna del board y no formas sumatoria, la carta se coloca en la mesa como nueva carta disponible."
            />
          </div>

          <h3 className="text-base font-bold text-white mt-6 mb-3">Virado</h3>
          <p>
            Cuando un jugador toma la <strong>última carta del board</strong>, recibe un <strong>Virado</strong>, que otorga 1 punto adicional al final de la ronda.
          </p>
        </Section>

        <Section icon="📊" title="Puntuación por ronda">
          <p>Al final de cada ronda se calculan los puntos de la siguiente manera:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {[
              { rule: 'Mayoría de cartas', pts: '3 pts', desc: 'El jugador/equipo con más cartas recolectadas' },
              { rule: 'Mayoría de picas ♠️', pts: '1 pt', desc: 'El jugador/equipo con más cartas de picas' },
              { rule: '10 de diamantes ♦️', pts: '2 pts', desc: 'El jugador/equipo que tenga esta carta' },
              { rule: '2 de picas ♠️', pts: '1 pt', desc: 'El jugador/equipo que tenga esta carta' },
              { rule: 'Cada As', pts: '1 pt c/u', desc: 'Por cada As recolectado' },
              { rule: 'Cada Virado', pts: '1 pt c/u', desc: 'Por cada virado obtenido en la ronda' },
            ].map(({ rule, pts, desc }) => (
              <div key={rule} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">{rule}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                <span className="text-casino-gold font-black text-sm shrink-0">{pts}</span>
              </div>
            ))}
          </div>

          <h3 className="text-base font-bold text-white mt-6 mb-3">Reglas especiales al acercarse a 21</h3>
          <p>Cuando un jugador o equipo se acerca a la victoria, algunas categorías dejan de otorgar puntos:</p>
          <ul className="mt-3 space-y-2">
            {[
              { pts: '17 pts', rules: 'Solo mayoría de cartas (+3) y mayoría de picas (+1)' },
              { pts: '18–19 pts', rules: 'Solo mayoría de cartas (+3)' },
              { pts: '20 pts', rules: 'Solo mayoría de picas (+1)' },
            ].map(({ pts, rules }) => (
              <li key={pts} className="flex items-start gap-3 text-sm text-gray-400">
                <span className="text-casino-gold font-black shrink-0">{pts}:</span>
                <span>{rules}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon="🏆" title="Victoria">
          <p>
            El primer jugador o equipo en alcanzar <strong>21 puntos o más</strong> gana la partida. Si se acaba el mazo
            antes de que alguien llegue a 21, el jugador o equipo con mayor puntuación acumulada es declarado ganador.
          </p>
        </Section>

        <Section icon="⚡" title="Kasino21 — Funcionalidades de la plataforma">
          <div className="space-y-4">
            <FeatureRow
              title="Apuestas con monedas virtuales"
              desc="Antes de cada partida, los jugadores realizan una apuesta con monedas virtuales. Las monedas no tienen valor comercial ni pueden canjearse por dinero real."
            />
            <FeatureRow
              title="Matchmaking por ELO"
              desc="El sistema empareja jugadores de nivel similar. La tolerancia de búsqueda comienza en 50 puntos de diferencia y se expande hasta 500 si no se encuentran oponentes."
            />
            <FeatureRow
              title="Temporizador por turno"
              desc="Cada turno tiene un límite de 30 segundos. Si se agota el tiempo, el sistema descarta automáticamente tu carta de menor valor."
            />
            <FeatureRow
              title="Modo Bot"
              desc="Si prefieres practicar antes de competir, puedes jugar contra la inteligencia artificial con diferentes niveles de dificultad."
            />
            <FeatureRow
              title="Modos de juego"
              desc="Elige entre 1 vs 1 para duelos directos o 2 vs 2 para partidas en equipo con estrategia coordinada."
            />
          </div>
        </Section>

      </main>

      {/* Footer */}
      <LegalFooter current="como-jugar" />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

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

function ActionCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-sm font-bold text-white mb-1">{title}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureRow({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-sm font-bold text-white mb-1">{title}</p>
      <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function LegalFooter({ current }: { current: string }) {
  const links = [
    { href: '/privacy', label: 'Política de Privacidad' },
    { href: '/terms', label: 'Términos de Servicio' },
    { href: '/cookies', label: 'Política de Cookies' },
  ];

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
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className={`text-xs uppercase tracking-widest font-bold transition-colors ${
                current === link.href.slice(1)
                  ? 'text-casino-gold'
                  : 'text-gray-600 hover:text-gray-400'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href="/"
          className="text-xs bg-casino-gold/10 hover:bg-casino-gold/20 text-casino-gold border border-casino-gold/20 px-4 py-2 rounded-xl font-bold uppercase tracking-widest transition-all"
        >
          ← Volver al Juego
        </a>
      </div>
    </footer>
  );
}
