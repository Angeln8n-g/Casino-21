import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { WinnerProofItem } from '../hooks/useChampionshipLanding';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  winners: WinnerProofItem[];
}

export default function WinnersWallModal({ isOpen, onClose, winners }: Props) {
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
            className="relative bg-[#070c18] border-2 border-emerald-500/40 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden z-10"
          >
            {/* Header Modal */}
            <div className="p-5 sm:p-6 border-b border-emerald-500/20 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black font-['Russo_One'] text-white uppercase">MURO DE GANADORES Y PAGOS</h3>
                  <p className="text-xs text-gray-400 font-['Chakra_Petch']">Histórico de transferencias verificadas a jugadores</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {winners.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0b1326] border border-emerald-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl border ${item.avatarBg} flex items-center justify-center font-black text-xl font-['Russo_One'] flex-shrink-0`}>
                      {item.avatarLetter}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-base font-['Chakra_Petch']">{item.name}</span>
                        <span className="text-xs text-gray-400">({item.city})</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-bold font-['Chakra_Petch'] flex items-center gap-1 mt-0.5">
                        <CheckCircle2 size={13} /> Transacción confirmada via {item.paymentMethod}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                    <div className="text-left sm:text-right">
                      <div className="text-lg font-black font-['Russo_One'] text-emerald-400">${item.amountUsd} USD</div>
                      <div className="text-[10px] font-mono text-gray-500">{item.txRef}</div>
                    </div>

                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 font-['Chakra_Petch']">
                      Verificado ✅
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
