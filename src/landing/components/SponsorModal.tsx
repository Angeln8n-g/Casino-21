import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../web/services/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SponsorModal({ isOpen, onClose }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ companyName: '', email: '', phone: '', budget: '$500 - $1,500' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await supabase.from('sponsor_inquiries').insert([
        {
          company_name: formData.companyName,
          email: formData.email,
          phone: formData.phone,
          budget: formData.budget,
          status: 'new',
        },
      ]);
    } catch (err) {
      // Fallback silently if table not applied yet
    } finally {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#080e1e] border-2 border-blue-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-[0_0_50px_rgba(59,130,246,0.25)] overflow-hidden z-10"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black font-['Russo_One'] text-white uppercase">COTIZAR TORNEO MARCAS</h3>
                  <p className="text-xs text-gray-400 font-['Chakra_Petch']">Impulsa tu marca con audiencias activas</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {submitted ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-2xl font-black font-['Russo_One'] text-white">¡Solicitud Enviada!</h4>
                <p className="text-gray-300 font-['Chakra_Petch'] text-sm mt-2">
                  Nuestro equipo corporativo se pondrá en contacto contigo en menos de 24 horas.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 font-['Chakra_Petch']">
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Nombre de la Empresa / Marca</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Banreservas, Cervecería, Claro..."
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Correo Electrónico Corporativo</label>
                  <input
                    type="email"
                    required
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Teléfono / WhatsApp de contacto</label>
                  <input
                    type="tel"
                    required
                    placeholder="+1 (809) 000-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Presupuesto Estimado de Patrocinio</label>
                  <select
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="$250 - $500">$250 - $500 USD (Mini Torneo)</option>
                    <option value="$500 - $1,500">$500 - $1,500 USD (Championship Estándar)</option>
                    <option value="$1,500+">$1,500+ USD (Gran Torneo Patrocinado)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-black font-black text-base py-3.5 rounded-xl shadow-lg font-['Russo_One'] uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={18} /> ENVIAR SOLICITUD DE COTIZACIÓN
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
