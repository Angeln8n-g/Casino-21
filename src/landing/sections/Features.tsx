import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Users, Award, BarChart2, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: Trophy,
    title: 'Sistema ELO',
    desc: 'Ranking competitivo con divisiones: Bronce, Plata, Oro, Platino y Diamante. Cada partida cuenta para tu ascenso.',
    color: 'from-yellow-400 to-amber-600',
    glow: 'rgba(251, 191, 36, 0.25)',
  },
  {
    icon: Target,
    title: 'Torneos Activos',
    desc: 'Brackets de eliminación directa con hasta 32 jugadores en vivo. Compite por el título y llévate el pozo de premios.',
    color: 'from-rose-400 to-red-600',
    glow: 'rgba(244, 63, 94, 0.25)',
  },
  {
    icon: Users,
    title: 'Sistema Social',
    desc: 'Añade amigos, envía invitaciones a partidas personalizadas y chatea en tiempo real durante los duelos.',
    color: 'from-cyan-400 to-blue-600',
    glow: 'rgba(56, 189, 248, 0.25)',
  },
  {
    icon: Award,
    title: 'Logros y Títulos',
    desc: 'Desbloquea 20 logros exclusivos y viste 7 títulos legendarios en tu perfil para intimidar a tus oponentes.',
    color: 'from-purple-400 to-fuchsia-600',
    glow: 'rgba(167, 139, 250, 0.25)',
  },
  {
    icon: BarChart2,
    title: 'Estadísticas e Historial',
    desc: 'Análisis detallado de tus porcentajes de victoria, ELO histórico, misiones diarias y rachas de victorias.',
    color: 'from-emerald-400 to-teal-600',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  {
    icon: Zap,
    title: 'Acción en Tiempo Real',
    desc: 'Duelos inmediatos gestionados por WebSockets de Express 5. La acción fluye sin lag ni esperas innecesarias.',
    color: 'from-amber-400 to-orange-600',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

export default function Features() {
  return (
    <section className="py-24 px-6 relative overflow-hidden bg-black/15">
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-gray-500 font-bold mb-2 font-['Chakra_Petch']">
            Funcionalidades Clave
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Todo lo que necesitas para <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">dominar la mesa</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-xl mx-auto">
            Un motor de juego optimizado con características competitivas de nivel profesional.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={itemVariants}
                whileHover={{
                  y: -5,
                  boxShadow: `0 10px 30px -10px ${f.glow}`,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                className="bg-white/[0.015] border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 group cursor-default"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${f.color} text-black font-black shadow-[0_0_15px_${f.glow}]`}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-[10px] font-black font-['Russo_One'] text-white/[0.04] group-hover:text-white/[0.08] transition-colors select-none">
                    0{i + 1}
                  </span>
                </div>
                
                <h3 className="text-base font-bold text-white mb-2 font-['Chakra_Petch'] group-hover:text-yellow-400 transition-colors">
                  {f.title}
                </h3>
                
                <p className="text-xs text-gray-400 font-['Chakra_Petch'] leading-relaxed">
                  {f.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
