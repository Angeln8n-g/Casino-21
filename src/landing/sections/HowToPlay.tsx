import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Compass, Share2, Award } from 'lucide-react';

const STEPS = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    desc: 'Regístrate gratis. Tu perfil guarda tu historial, victorias, ELO competitivo, logros y títulos ganados.',
    icon: UserPlus,
    glow: 'rgba(56,189,248,0.2)',
    color: 'text-cyan-400',
  },
  {
    number: '02',
    title: 'Elige tu modo',
    desc: 'Elige partidas ranked 1v1 para duelos directos o únete a partidas 2v2 cooperativas para estrategia coordinada.',
    icon: Compass,
    glow: 'rgba(167,139,250,0.2)',
    color: 'text-purple-400',
  },
  {
    number: '03',
    title: 'Conéctate a la sala',
    desc: 'Usa el emparejamiento automático por ELO, crea una sala privada con código o únete al lobby con un solo clic.',
    icon: Share2,
    glow: 'rgba(236,72,153,0.2)',
    color: 'text-pink-400',
  },
  {
    number: '04',
    title: 'Domina la mesa',
    desc: 'Juega con inteligencia. Arma forma y agrupa estrategícamente, supera la estrategía de tus rivales y reclama el bote de monedas.',
    icon: Award,
    glow: 'rgba(251,191,36,0.2)',
    color: 'text-yellow-400',
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
} as const;

export default function HowToPlay() {
  return (
    <section id="como-jugar" className="py-24 px-6 relative overflow-hidden bg-transparent">
      {/* Light glow elements */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-yellow-500/[0.015] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2 font-['Chakra_Petch']">
            Guía de Inicio
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Cómo empezar a <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">jugar</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            Únete a la competición de cartas en tiempo real en cuatro sencillos pasos.
          </p>
        </div>

        {/* Timeline container */}
        <div className="relative">
          {/* Horizontal connection line on desktop */}
          <div 
            className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-[80px] hidden lg:block z-0"
            style={{
              background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.2) 0%, rgba(168, 85, 247, 0.2) 33%, rgba(236, 72, 153, 0.2) 66%, rgba(234, 179, 8, 0.2) 100%)'
            }}
          />
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10"
          >
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  variants={itemVariants}
                  whileHover={{
                    y: -6,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                  className="bg-[#050811]/40 border border-white/[0.06] rounded-2xl p-6 backdrop-blur-xl relative transition-all duration-300 group"
                  style={{
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.02), 0 4px 30px rgba(0,0,0,0.4)`,
                  }}
                >
                  {/* Step Index floating background */}
                  <div className="absolute -top-6 -right-2 text-6xl font-black text-white/[0.02] group-hover:text-white/[0.04] transition-colors font-['Russo_One'] select-none">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-6 group-hover:border-white/[0.12] transition-colors ${step.color}`}>
                    <Icon size={20} strokeWidth={2.2} />
                  </div>

                  {/* Step Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black font-['Russo_One'] text-yellow-500/50 uppercase tracking-widest">
                        Paso {step.number}
                      </span>
                    </div>
                    
                    <h3 className="text-base font-bold text-white font-['Chakra_Petch'] group-hover:text-yellow-400 transition-colors">
                      {step.title}
                    </h3>
                    
                    <p className="text-xs text-gray-400 font-['Chakra_Petch'] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {/* Outer bottom decorative neon strip on hover */}
                  <div
                    className="absolute bottom-0 left-6 right-6 h-0.5 rounded-t-full transition-transform duration-300 scale-x-0 group-hover:scale-x-100"
                    style={{
                      background: `radial-gradient(circle, ${step.glow.replace('0.2', '1')} 0%, transparent 100%)`,
                      boxShadow: `0 0 10px ${step.glow.replace('0.2', '0.8')}`,
                    }}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
