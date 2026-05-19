import React from 'react';

const TESTIMONIALS = [
  {
    name: 'Carlos M.',
    avatar: '🎰',
    text: 'El mejor juego de 21 online que he probado. Los torneos son adictivos y el sistema ELO te engancha.',
    rating: 5,
  },
  {
    name: 'María L.',
    avatar: '🃏',
    text: 'Me encanta poder jugar con amigos en tiempo real. La interfaz es limpia y las partidas son rápidas.',
    rating: 5,
  },
  {
    name: 'Javier R.',
    avatar: '🏆',
    text: 'Llevo 3 temporadas compitiendo. El matchmaking es justo y siempre hay rivales de mi nivel.',
    rating: 5,
  },
  {
    name: 'Ana P.',
    avatar: '⭐',
    text: 'Empecé sin saber nada y ahora estoy en división Oro. La curva de aprendizaje es perfecta.',
    rating: 4,
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-sm ${i < count ? 'text-yellow-400' : 'text-gray-600'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default function SocialProof() {
  return (
    <section className="py-24 px-6 bg-gradient-to-b from-black/20 to-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Lo que dicen nuestros jugadores</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Miles de jugadores ya disfrutan de Kasino21. Únete a la comunidad.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:bg-white/5 hover:border-white/15 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{t.avatar}</span>
                <div>
                  <div className="font-bold text-sm group-hover:text-yellow-400 transition-colors">{t.name}</div>
                  <Stars count={t.rating} />
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <div className="text-3xl font-black text-yellow-400">4.8/5</div>
            <div className="text-gray-400 text-xs uppercase tracking-widest mt-1">Valoración media</div>
          </div>
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <div>
            <div className="text-3xl font-black text-yellow-400">+10K</div>
            <div className="text-gray-400 text-xs uppercase tracking-widest mt-1">Partidas diarias</div>
          </div>
          <div className="w-px h-10 bg-white/10 hidden sm:block" />
          <div>
            <div className="text-3xl font-black text-yellow-400">99.9%</div>
            <div className="text-gray-400 text-xs uppercase tracking-widest mt-1">Uptime</div>
          </div>
        </div>
      </div>
    </section>
  );
}
