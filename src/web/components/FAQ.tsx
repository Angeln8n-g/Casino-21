import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO, injectJSONLD, removeJSONLD } from '../utils/seo';
import { faqData, getFAQCategories } from '../data/faq-data';
import AdBanner from './AdBanner';

const categories = ['Todos', ...getFAQCategories()];

export function FAQ() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Preguntas Frecuentes | Kasino21 — Juego de Cartas Online',
      description: 'Resuelve tus dudas sobre Kasino21. Cómo jugar, crear cuenta, monedas virtuales, soporte técnico y más.',
      canonical: 'https://kasino21.com/faq',
    });

    // FAQPage structured data for rich snippets
    injectJSONLD('faq-page', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqData.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer,
        },
      })),
    });

    return () => {
      resetSEO();
      removeJSONLD('faq-page');
    };
  }, []);

  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = activeCategory === 'Todos'
    ? faqData
    : faqData.filter(f => f.category === activeCategory);

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
            <a href="/about" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">Nosotros</a>
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
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-indigo-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-violet-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-violet-400" />
            Preguntas Frecuentes / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            Preguntas <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Frecuentes</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Encuentra respuestas a las dudas más comunes sobre Kasino21. Si no encuentras lo que buscas, contáctanos directamente.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === cat
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-3">
          {filtered.map((faq, index) => (
            <FAQAccordion
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No hay preguntas en esta categoría.</p>
          </div>
        )}

        <AdBanner />

        {/* Still need help */}
        <div className="mt-12 bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-500/20 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-3">💬</div>
          <h3 className="text-lg font-display font-black text-white mb-2">¿No encontraste lo que buscabas?</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Nuestro equipo está aquí para ayudarte. Envíanos tu pregunta y te responderemos lo antes posible.
          </p>
          <a
            href="/contact"
            className="inline-block bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-sm px-8 py-3 rounded-xl hover:scale-105 transition-transform"
          >
            CONTACTAR SOPORTE
          </a>
        </div>

      </main>

      {/* Footer */}
      <FAQFooter />
    </div>
  );
}

function FAQAccordion({ question, answer, isOpen, onToggle }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all hover:border-white/20">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-white pr-4">{question}</span>
        <span className={`text-casino-gold transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-4 text-sm text-gray-400 leading-relaxed border-t border-white/5 pt-4">
          {answer}
        </div>
      </div>
    </div>
  );
}

function FAQFooter() {
  return (
    <footer className="hidden md:block mt-16 border-t border-white/5 bg-black/20">
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
