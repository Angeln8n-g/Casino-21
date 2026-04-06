import React from 'react';

const FEATURES = [
  {
    icon: '🏆',
    title: 'Sistema ELO',
    desc: 'Ranking competitivo con divisiones: Bronce, Plata, Oro, Platino y Diamante. Cada partida cuenta.',
  },
  {
    icon: '🎯',
    title: 'Torneos',
    desc: 'Brackets de eliminación directa con 4, 8, 16 o 32 jugadores. Compite por el título de campeón.',
  },
  {
    icon: '👥',
    title: 'Sistema Social',
    desc: 'Añade amigos, envía invitaciones a partida y chatea en tiempo real durante el juego.',
  },
  {
    icon: '🎖️',
    title: 'Logros y Títulos',
    desc: '20 logros desbloqueables y 7 títulos exclusivos. Muestra tu progreso en tu perfil.',
  },
  {
    icon: '📊',
    title: 'Temporadas',
    desc: 'Temporadas competitivas con reset de ELO suavizado. Cada temporada es una nueva oportunidad.',
  },
  {
    icon: '⚡',
    title: 'Tiempo real',
    desc: 'Partidas en vivo con WebSockets. Sin lag, sin esperas. La acción es inmediata.',
  },
];

export default function Features() {
  return (
    <section className="py-24 px-6 bg-black/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Todo lo que necesitas</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Un juego completo con funcionalidades de nivel profesional.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:bg-white/5 hover:border-white/15 transition-all group"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-bold mb-2 group-hover:text-yellow-400 transition-colors">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
