import React from 'react';

const STEPS = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    desc: 'Regístrate gratis. Tu perfil guarda tu ELO, victorias, logros y títulos ganados.',
  },
  {
    number: '02',
    title: 'Elige tu modo',
    desc: 'Juega 1v1 para duelos directos o 2v2 para partidas en equipo con estrategia coordinada.',
  },
  {
    number: '03',
    title: 'Crea o únete a una sala',
    desc: 'Genera un código de sala y compártelo, o ingresa el código de un amigo para unirte.',
  },
  {
    number: '04',
    title: 'Domina la mesa',
    desc: 'Usa tus cartas con inteligencia. Llega a 21 sin pasarte y supera a tus rivales.',
  },
];

export default function HowToPlay() {
  return (
    <section id="como-jugar" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4">Cómo jugar</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            En cuatro pasos estás en la mesa compitiendo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-yellow-500/30 transition-colors group"
            >
              <div className="text-5xl font-black text-yellow-500/20 group-hover:text-yellow-500/40 transition-colors mb-4">
                {step.number}
              </div>
              <h3 className="text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
