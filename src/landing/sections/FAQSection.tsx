import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { faqData } from '../../web/data/faq-data';

function FAQAccordion({
  id,
  question,
  answer,
  isOpen,
  onToggle,
}: {
  id: string;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-[#081020] border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 hover:border-amber-400/30">
      <button
        type="button"
        id={`faq-btn-${id}`}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${id}`}
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-5 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <span className="text-sm sm:text-base font-bold text-white pr-4 font-['Chakra_Petch']">
          {question}
        </span>
        <span
          className={`text-amber-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        >
          <ChevronDown size={18} />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-panel-${id}`}
            role="region"
            aria-labelledby={`faq-btn-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="px-6 pb-5 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/[0.04] pt-4 font-['Chakra_Petch']">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Top 6 most relevant questions for the competitive game landing
  const faqsToShow = faqData.slice(0, 6);

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8 relative bg-[#050811] border-t border-white/[0.06]">
      <div className="max-w-4xl mx-auto">
        {/* Section Heading (No eyebrow per craft-floor) */}
        <div className="text-left max-w-3xl mb-12">
          <h2 className="text-3xl sm:text-5xl font-black font-['Russo_One'] text-white tracking-tight">
            Preguntas frecuentes
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-300 font-['Chakra_Petch'] leading-relaxed">
            Respuestas directas sobre reglas, sistema ELO, torneos y cómo empezar a competir.
          </p>
        </div>

        {/* Accordions Container */}
        <div className="space-y-3">
          {faqsToShow.map((faq, index) => (
            <FAQAccordion
              key={index}
              id={`faq-${index}`}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* View All FAQ Link */}
        <div className="mt-10 text-center">
          <a
            href="/faq"
            className="inline-flex items-center gap-2 text-xs font-['Chakra_Petch'] font-bold text-gray-400 hover:text-amber-400 uppercase tracking-widest transition-colors py-2 px-4 rounded-xl bg-white/[0.04] border border-white/10"
          >
            <span>Ver Centro de Preguntas Completo</span>
            <ArrowRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}

export default memo(FAQSection);
