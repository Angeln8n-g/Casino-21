import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Eye, Trophy, Crown, Users, Sparkles, ArrowRight } from 'lucide-react';
import { ReferralModal } from '../../web/components/championship/ReferralModal';

function HowItWorks() {
  const [isReferralOpen, setIsReferralOpen] = useState(false);

  const steps = [
    {
      num: '1',
      title: 'VE ADS',
      desc: 'Cada anuncio que ves hace crecer el pozo acumulado para todos los participantes.',
      icon: Eye,
      iconBg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
      badge: 'Acumula Pozo',
    },
    {
      num: '2',
      title: 'ENTRA AL TOP 32',
      desc: 'Los 32 mejores clasificados al cierre del mes avanzan directamente a la gran final.',
      icon: Trophy,
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      badge: 'Clasificación Mensual',
    },
    {
      num: '3',
      title: 'GANA LA FINAL',
      desc: '1 hora. Eliminación directa en mesa viva. 1 solo Campeón se lleva el 40% del pozo total.',
      icon: Crown,
      iconBg: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
      badge: 'Gran Final',
    },
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 relative overflow-hidden bg-[#020617]">
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Encabezado Bloque 4 */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-3.5 py-1.5 rounded-full mb-3 font-['Chakra_Petch'] uppercase tracking-widest">
            Explicado en 15 Segundos
          </div>

          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-wide uppercase">
            ¿CÓMO GANAR EL <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 neon-gold-strong">POZO?</span>
          </h2>
        </div>

        {/* 3 CARDS CON ICONOS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {steps.map((step, idx) => {
            const IconComponent = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.15 }}
                className="bg-[#070c1a] border border-yellow-500/20 hover:border-yellow-500/50 rounded-3xl p-7 relative group shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 cursor-default"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-14 h-14 rounded-2xl border ${step.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <IconComponent size={28} />
                  </div>
                  <span className="text-4xl font-black font-['Russo_One'] text-white/10 group-hover:text-yellow-400/20 transition-colors">
                    0{step.num}
                  </span>
                </div>

                <div className="text-xs font-bold text-yellow-400 uppercase font-['Chakra_Petch'] tracking-widest mb-1">
                  Paso {step.num} · {step.badge}
                </div>

                <h3 className="text-xl font-black font-['Russo_One'] text-white mb-3 tracking-wide">
                  {step.title}
                </h3>

                <p className="text-gray-400 text-sm font-['Chakra_Petch'] leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* MEJORA 4: BLOQUE MULTIPLICADOR DE REFERIDOS */}
        <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/40 border border-purple-500/30 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 text-purple-300">
              <Users size={28} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-400 font-['Chakra_Petch'] uppercase tracking-wider mb-1">
                <Sparkles size={12} /> Bonus de Velocidad
              </div>
              <h4 className="text-xl sm:text-2xl font-black font-['Russo_One'] text-white">
                Multiplica tus puntos invitando amigos
              </h4>
              <p className="text-gray-300 text-sm font-['Chakra_Petch'] mt-1">
                Recibe <strong className="text-purple-300 font-black">+200 pts bonus</strong> por cada amigo que se registre y complete sus primeros 100 ads.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsReferralOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl transition-all duration-300 font-['Russo_One'] uppercase tracking-wider flex-shrink-0 w-full sm:w-auto text-center shadow-lg cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Obtener mi Link</span>
            <ArrowRight size={16} />
          </button>
        </div>

      </div>

      {/* Modal de Referidos (Condicional) */}
      {isReferralOpen && (
        <ReferralModal isOpen={isReferralOpen} onClose={() => setIsReferralOpen(false)} />
      )}
    </section>
  );
}

export default memo(HowItWorks);

