import React, { useLayoutEffect, useState } from 'react';
import { LogoK21 } from './LogoK21';
import { updateSEO, resetSEO } from '../utils/seo';

export function Contact() {
  useLayoutEffect(() => {
    updateSEO({
      title: 'Contacto | Kasino21 — Juego de Cartas Online',
      description: '¿Tienes preguntas o sugerencias? Contáctanos. Respondemos en 24-48 horas.',
      canonical: 'https://kasino21.com/contact',
    });
    return () => resetSEO();
  }, []);

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contacto desde Kasino21 - ${formData.name}`);
    const body = encodeURIComponent(
      `Nombre: ${formData.name}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`
    );
    window.location.href = `mailto:kansino21.service@gmail.com?subject=${subject}&body=${body}`;
  };

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
            <a href="/faq" className="text-gray-500 hover:text-casino-gold transition-colors hidden sm:inline">FAQ</a>
            <a href="/about" className="text-gray-500 hover:text-casino-gold transition-colors">Nosotros</a>
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
        <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 via-transparent to-emerald-900/20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 py-16 relative z-10">
          <div className="flex items-center gap-2 text-xs text-green-400 font-bold uppercase tracking-widest mb-4">
            <span className="w-6 h-px bg-green-400" />
            Contacto / KASINO21
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-black text-white mb-4 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Contacto</span>
          </h1>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            ¿Tienes preguntas, sugerencias o quieres reportar un problema? Nos encanta escucharte.
            Respondemos en 24-48 horas.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">

        {/* Contact Methods */}
        <Section icon="📧" title="Formas de Contacto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <ContactCard
              icon="🎮"
              title="Soporte del Juego"
              email="kansino21.service@gmail.com"
              desc="Problemas técnicos, bugs, cuentas"
            />
            <ContactCard
              icon="💼"
              title="Negocios y Publicidad"
              email="kasino.21@gmail.com"
              desc="Consultas generales, colaboraciones"
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            También puedes usar el formulario de abajo y se abrirá tu cliente de correo automáticamente.
          </p>
        </Section>

        {/* Contact Form */}
        <Section icon="✍️" title="Envíanos un Mensaje">
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-w-lg">
            <div>
              <label htmlFor="contact-name" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Nombre
              </label>
              <input
                id="contact-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:ring-1 focus:ring-casino-gold/20 transition-all"
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="contact-email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:ring-1 focus:ring-casino-gold/20 transition-all"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="contact-message" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                Mensaje
              </label>
              <textarea
                id="contact-message"
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-casino-gold/50 focus:ring-1 focus:ring-casino-gold/20 transition-all resize-none"
                placeholder="¿En qué podemos ayudarte?"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-sm px-6 py-3 rounded-xl hover:scale-105 transition-transform"
            >
              ENVIAR MENSAJE
            </button>
            <p className="text-[10px] text-gray-600 text-center">
              Se abrirá tu cliente de correo electrónico para enviar el mensaje.
            </p>
          </form>
        </Section>

        {/* Response Time */}
        <Section icon="⏱️" title="Tiempo de Respuesta">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <p className="text-3xl font-black text-casino-gold">24-48h</p>
            <p className="text-sm text-gray-400 mt-2">
              Respondemos todos los mensajes en un plazo de 24 a 48 horas hábiles.
            </p>
          </div>
        </Section>

      </main>

      {/* Footer */}
      <ContactFooter />
    </div>
  );
}

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-xl font-display font-black text-white tracking-tight">{title}</h2>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent ml-2" />
      </div>
      <div className="text-gray-400 text-sm leading-relaxed space-y-3 pl-6 md:pl-10">
        {children}
      </div>
    </section>
  );
}

function ContactCard({ icon, title, email, desc }: { icon: string; title: string; email: string; desc: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-sm font-bold text-white mt-2">{title}</p>
      <a href={`mailto:${email}`} className="text-casino-gold hover:text-white transition-colors font-mono text-xs mt-1 block">
        {email}
      </a>
      <p className="text-[10px] text-gray-600 mt-1">{desc}</p>
    </div>
  );
}

function ContactFooter() {
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
