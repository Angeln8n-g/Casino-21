import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';

type FAQCategory = 'general' | 'cuenta' | 'juego' | 'monedas' | 'tecnico';

interface FAQItem {
  question: string;
  answer: string;
  category: FAQCategory;
}

const faqData: FAQItem[] = [
  {
    category: 'general',
    question: '¿Qué es Kasino21?',
    answer: 'Kasino21 es un juego de cartas online gratuito basado en el clásico juego del 21 (blackjack). Puedes jugar contra otros jugadores en tiempo real o contra bots, todo desde tu navegador sin necesidad de descargar nada.',
  },
  {
    category: 'general',
    question: '¿Es gratuito jugar?',
    answer: 'Sí, Kasino21 es completamente gratuito. No hay apuestas con dinero real. Las monedas del juego son virtuales y no tienen valor monetario. No se pueden comprar ni vender.',
  },
  {
    category: 'general',
    question: '¿Necesito descargar algo?',
    answer: 'No. Kasino21 funciona directamente en tu navegador web. Solo necesitas una cuenta y conexión a internet para jugar.',
  },
  {
    category: 'general',
    question: '¿En qué idiomas está disponible?',
    answer: 'Actualmente Kasino21 está disponible en español. Estamos trabajando en añadir más idiomas en el futuro.',
  },
  {
    category: 'cuenta',
    question: '¿Cómo creo una cuenta?',
    answer: 'Puedes registrarte directamente desde la página principal usando tu correo electrónico. También puedes iniciar sesión con tu cuenta de Google si lo prefieres.',
  },
  {
    category: 'cuenta',
    question: 'Olvidé mi contraseña, ¿qué hago?',
    answer: 'En la pantalla de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?" y sigue las instrucciones. Recibirás un correo electrónico con un enlace para restablecerla.',
  },
  {
    category: 'cuenta',
    question: '¿Puedo cambiar mi nombre de usuario?',
    answer: 'Actualmente el nombre de usuario se asigna al crear la cuenta. Si necesitas cambiarlo, contáctanos a través de la página de Contacto y te ayudaremos.',
  },
  {
    category: 'cuenta',
    question: '¿Cómo elimino mi cuenta?',
    answer: 'Si deseas eliminar tu cuenta, envíanos un correo a kansino21.service@gmail.com desde el email asociado a tu cuenta. Procesaremos la solicitud en un plazo de 30 días.',
  },
  {
    category: 'juego',
    question: '¿Cómo se juega al 21?',
    answer: 'El objetivo es sumar 21 puntos o acercarse lo más posible sin pasarse. Las cartas numéricas valen su número, las figuras (J, Q, K) valen 10, y el As vale 1 u 11. Si te pasas de 21, pierdes automáticamente.',
  },
  {
    category: 'juego',
    question: '¿Puedo jugar contra amigos?',
    answer: 'Sí. Puedes crear una sala privada y compartir el enlace con tus amigos para jugar juntos. También puedes usar el emparejamiento automático para jugar contra otros jugadores.',
  },
  {
    category: 'juego',
    question: '¿Qué es el sistema ELO?',
    answer: 'ELO es un sistema de puntuación que mide tu nivel de juego. Se usa para emparejarte con jugadores de nivel similar y garantizar partidas equilibradas. Ganas puntos al ganar y los pierdes al perder.',
  },
  {
    category: 'juego',
    question: '¿Puedo jugar contra un bot?',
    answer: 'Sí. Si no quieres esperar a otro jugador, puedes jugar contra un bot. Hay diferentes niveles de dificultad disponibles para que practiques y mejores tu estrategia.',
  },
  {
    category: 'juego',
    question: '¿Qué pasa si me desconecto durante una partida?',
    answer: 'Si te desconectas, tienes 30 segundos para volver a conectarte y reanudar la partida. Si no vuelves a tiempo, se considera que te has rendido y perderás la partida.',
  },
  {
    category: 'monedas',
    question: '¿Cómo consigo monedas?',
    answer: 'Recibes monedas iniciales al crear tu cuenta. Después, puedes ganar más monedas jugando partidas, completando misiones diarias y participando en torneos y eventos especiales.',
  },
  {
    category: 'monedas',
    question: '¿Las monedas tienen valor real?',
    answer: 'No. Las monedas de Kasino21 son completamente virtuales y no tienen ningún valor monetario real. No se pueden comprar, vender ni intercambiar por dinero real.',
  },
  {
    category: 'monedas',
    question: '¿Qué pasa si me quedo sin monedas?',
    answer: 'Si te quedas sin monedas, recibirás una recarga gratuita después de un tiempo. También puedes completar misiones diarias para ganar monedas adicionales.',
  },
  {
    category: 'monedas',
    question: '¿Puedo comprar monedas?',
    answer: 'No. Kasino21 no permite la compra de monedas con dinero real. Todas las monedas se obtienen jugando y completando desafíos dentro del juego.',
  },
  {
    category: 'tecnico',
    question: '¿En qué dispositivos puedo jugar?',
    answer: 'Kasino21 funciona en cualquier dispositivo con un navegador web moderno: computadoras, tablets y smartphones. El diseño se adapta automáticamente al tamaño de tu pantalla.',
  },
  {
    category: 'tecnico',
    question: '¿Qué navegadores son compatibles?',
    answer: 'Kasino21 es compatible con Chrome, Firefox, Safari, Edge y otros navegadores modernos. Recomendamos mantener tu navegador actualizado para la mejor experiencia.',
  },
  {
    category: 'tecnico',
    question: 'El juego va lento, ¿qué puedo hacer?',
    answer: 'Intenta cerrar otras pestañas del navegador, limpiar la caché o usar una conexión a internet más estable. Si el problema persiste, contáctanos con detalles de tu dispositivo y navegador.',
  },
  {
    category: 'tecnico',
    question: '¿Cómo reporto un bug o problema?',
    answer: 'Puedes reportar bugs a través de la página de Contacto o enviando un correo a kansino21.service@gmail.com. Incluye una descripción del problema, tu dispositivo y navegador.',
  },
];

const categories: { key: FAQCategory | 'todas'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'general', label: 'General' },
  { key: 'cuenta', label: 'Cuenta' },
  { key: 'juego', label: 'Juego' },
  { key: 'monedas', label: 'Monedas' },
  { key: 'tecnico', label: 'Técnico' },
];

export function FAQ() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Preguntas Frecuentes | Kasino21 — Juego de Cartas Online',
      description: 'Resuelve tus dudas sobre Kasino21. Cómo jugar, crear cuenta, monedas virtuales, soporte técnico y más.',
      canonical: 'https://kasino21.com/faq',
    });
    return () => resetSEO();
  }, []);

  const [activeCategory, setActiveCategory] = useState<FAQCategory | 'todas'>('todas');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filtered = activeCategory === 'todas'
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
              key={cat.key}
              onClick={() => { setActiveCategory(cat.key); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === cat.key
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20'
              }`}
            >
              {cat.label}
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
