import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Camera, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const ChampionshipKYCModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'pending' | 'uploading' | 'success' | 'error'>('pending');

  const handleSubmit = () => {
    if (!idFile || !selfieFile) return;
    setStatus('uploading');
    // Mock upload
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-slate-900 border border-casino-gold/30 rounded-3xl overflow-hidden shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white/50 hover:text-white transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center bg-gradient-to-b from-casino-gold/20 to-transparent">
          <div className="w-16 h-16 bg-casino-gold/20 text-casino-gold rounded-full flex items-center justify-center mx-auto mb-4 border border-casino-gold/50 shadow-[0_0_20px_rgba(251,191,36,0.3)]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Verificación de Identidad</h2>
          <p className="text-gray-300 text-sm max-w-md mx-auto">
            ¡Felicidades! Estás en el Top 32. Para recibir tus premios y participar en la final, necesitamos verificar tu identidad.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {status === 'success' ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Documentos Enviados</h3>
              <p className="text-gray-400 text-sm">Nuestro equipo revisará tu información pronto. Tu estado de KYC se actualizará automáticamente.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ID Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Documento de Identidad (Frente)</label>
                  <div className="border-2 border-dashed border-white/20 rounded-2xl bg-black/40 p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 hover:border-casino-gold/50 transition-colors cursor-pointer min-h-[160px]">
                    <Upload className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-xs font-bold text-white mb-1">Haz clic o arrastra</span>
                    <span className="text-[10px] text-gray-500">JPG, PNG, max 5MB</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
                    {idFile && <span className="mt-2 text-xs text-casino-gold font-bold truncate max-w-[150px]">{idFile.name}</span>}
                  </div>
                </div>

                {/* Selfie Upload */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Selfie con Documento</label>
                  <div className="border-2 border-dashed border-white/20 rounded-2xl bg-black/40 p-6 flex flex-col items-center justify-center text-center hover:bg-white/5 hover:border-casino-gold/50 transition-colors cursor-pointer min-h-[160px]">
                    <Camera className="w-8 h-8 text-gray-500 mb-2" />
                    <span className="text-xs font-bold text-white mb-1">Haz clic o arrastra</span>
                    <span className="text-[10px] text-gray-500">JPG, PNG, max 5MB</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} />
                    {selfieFile && <span className="mt-2 text-xs text-casino-gold font-bold truncate max-w-[150px]">{selfieFile.name}</span>}
                  </div>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex gap-3 text-sm text-amber-200/80">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                <p>Las imágenes deben ser claras y legibles. El documento debe coincidir con los datos registrados. Los datos están encriptados y solo se usan para verificación.</p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!idFile || !selfieFile || status === 'uploading'}
                className="w-full py-4 bg-casino-gold hover:bg-yellow-400 text-black font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'uploading' ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Subiendo...</>
                ) : 'Enviar para Verificación'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
