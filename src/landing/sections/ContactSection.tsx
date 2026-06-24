import React, { useState } from 'react';
import { Mail, Send, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContactSection() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Contacto desde Kasino21 - ${formData.name}`);
    const body = encodeURIComponent(
      `Nombre: ${formData.name}\nEmail: ${formData.email}\n\nMensaje:\n${formData.message}`
    );
    window.location.href = `mailto:kasino21.service@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contacto" className="py-20 px-6 relative overflow-hidden bg-transparent">
      {/* Background ambient light */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/[0.01] rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-[10px] uppercase tracking-[0.25em] text-yellow-400 font-bold mb-2 font-['Chakra_Petch'] flex items-center justify-center gap-1.5">
            <Mail size={10} /> Soporte
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-['Russo_One'] text-white">
            Ponte en <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 neon-gold">Contacto</span>
          </h2>
          <p className="text-gray-400 text-sm mt-3 font-['Chakra_Petch'] max-w-md mx-auto">
            ¿Tienes dudas, sugerencias o quieres reportar un problema? Escríbenos y te responderemos pronto.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 max-w-4xl mx-auto">
          {/* Info Card (Left) */}
          <div className="md:col-span-2 space-y-4">
            <div className="border border-white/[0.06] bg-[#050811]/40 rounded-3xl p-6 relative overflow-hidden h-full flex flex-col justify-between backdrop-blur-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-yellow-500/[0.02] to-transparent rounded-bl-full pointer-events-none" />
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-white font-['Chakra_Petch'] mb-1">
                    Soporte del Juego
                  </h3>
                  <p className="text-xs text-gray-400 font-['Chakra_Petch']">
                    Para problemas técnicos, fallos de la cuenta o reportes.
                  </p>
                  <a
                    href="mailto:kasino21.service@gmail.com"
                    className="inline-block mt-2 text-xs font-semibold text-yellow-400 hover:text-yellow-300 font-mono transition-colors"
                  >
                    kasino21.service@gmail.com
                  </a>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white font-['Chakra_Petch'] mb-1">
                    Negocios y Colaboraciones
                  </h3>
                  <p className="text-xs text-gray-400 font-['Chakra_Petch']">
                    Consultas generales y propuestas comerciales.
                  </p>
                  <a
                    href="mailto:kasino21.service@gmail.com"
                    className="inline-block mt-2 text-xs font-semibold text-yellow-400 hover:text-yellow-300 font-mono transition-colors"
                  >
                    kasino21.service@gmail.com
                  </a>
                </div>
              </div>

              {/* Response time */}
              <div className="mt-8 border-t border-white/[0.03] pt-6 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-['Chakra_Petch']">Tiempo de Respuesta</div>
                  <div className="text-[10px] text-gray-500 font-['Chakra_Petch'] uppercase tracking-wider">Dentro de 24-48 horas hábiles</div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form (Right) */}
          <div className="md:col-span-3">
            <div className="border border-white/[0.06] bg-[#050811]/40 rounded-3xl p-6 sm:p-8 backdrop-blur-xl hover:border-yellow-500/10 transition-colors duration-500">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="landing-contact-name" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-['Chakra_Petch']">
                    Nombre
                  </label>
                  <input
                    id="landing-contact-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all font-['Chakra_Petch']"
                    placeholder="Tu nombre"
                  />
                </div>
                
                <div>
                  <label htmlFor="landing-contact-email" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-['Chakra_Petch']">
                    Email
                  </label>
                  <input
                    id="landing-contact-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all font-['Chakra_Petch']"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="landing-contact-message" className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 font-['Chakra_Petch']">
                    Mensaje
                  </label>
                  <textarea
                    id="landing-contact-message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all resize-none font-['Chakra_Petch']"
                    placeholder="¿Cómo podemos ayudarte?"
                  />
                </div>

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black font-black text-xs sm:text-sm py-3 px-6 rounded-xl hover:shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all font-['Russo_One'] tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={14} /> ENVIAR MENSAJE
                </motion.button>
                <p className="text-[9px] text-gray-600 text-center font-['Chakra_Petch']">
                  Se abrirá tu cliente de correo electrónico para enviar el mensaje.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
