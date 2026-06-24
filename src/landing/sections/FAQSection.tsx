import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown } from 'lucide-react';
import { faqData } from '../../web/data/faq-data';

function FAQAccordion({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-[#050811]/30 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300 hover:border-yellow-500/10 hover:bg-[#050811]/60">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer"
        aria-expanded={isOpen}
      >
        <span className="text-sm sm:text-base font-bold text-white pr-4 font-['Chakra_Petch']">{question}</span>
        <span className={`text-yellow-400 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} />
        </span>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-6 pb-5 text-xs sm:text-sm text-gray-400 leading-relaxed border-t border-white/[0.03] pt-4 font-['Chakra_Petch']">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Mostrar una selección de las FAQ más importantes (ej. las primeras 6)
  const faqsToShow = faqData.slice(0, 6);

  return (
    <section id="faq" className="py-20 px-6 relative overflow-hidden bg-transparent">
      {/* Background ambient light */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-80 h-80 bg-cyan-500/[0.01] rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold mb-2 font-['Chakra_Petch'] flex items-center justify-center gap-1.5">
            <HelpCircle size={10} /> FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Preguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 neon-blue">Frecuentes</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            ¿Tienes dudas sobre el juego? Encuentra respuestas rápidas aquí.
          </p>
        </div>

        {/* Accordions Container */}
        <div className="max-w-3xl mx-auto space-y-3">
          {faqsToShow.map((faq, index) => (
            <FAQAccordion
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Ver más en FAQ */}
        <div className="mt-12 text-center">
          <a
            href="/faq"
            className="inline-flex items-center text-xs text-gray-500 hover:text-cyan-400 transition-colors font-['Chakra_Petch'] uppercase tracking-widest cursor-pointer"
          >
            Ver Todas las Preguntas →
          </a>
        </div>
      </div>
    </section>
  );
}
