import React, { useState } from 'react';
import { Play, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface CoinFarmingButtonProps {
  sponsorName: string;
  sponsorLogoUrl?: string;
  targetCoins: number;
  currentCoins: number;
  rewardCoinsPerAd?: number;
  eventId?: string;
  onCoinsUpdated?: (newBalance: number) => void;
}

export const CoinFarmingButton: React.FC<CoinFarmingButtonProps> = ({
  sponsorName,
  sponsorLogoUrl,
  targetCoins,
  currentCoins,
  rewardCoinsPerAd = 500,
  eventId,
  onCoinsUpdated
}) => {
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adSecondsRemaining, setAdSecondsRemaining] = useState(15);
  const [adCompleted, setAdCompleted] = useState(false);
  const [loading, setLoading] = useState(false);

  const progressPercentage = Math.min(100, Math.round((currentCoins / targetCoins) * 100));

  const startAd = () => {
    setIsWatchingAd(true);
    setAdCompleted(false);
    setAdSecondsRemaining(15);

    const interval = setInterval(() => {
      setAdSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setAdCompleted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const claimReward = async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!user) {
        alert('Debes iniciar sesión para farmear monedas.');
        setLoading(false);
        return;
      }

      // Recompensar monedas
      const { data: profile } = await supabase
        .from('profiles')
        .select('coins')
        .eq('id', user.id)
        .single();

      const newBalance = (profile?.coins || 0) + rewardCoinsPerAd;

      await supabase
        .from('profiles')
        .update({ coins: newBalance })
        .eq('id', user.id);

      // Registrar analítica de patrocinador
      await supabase.from('sponsor_analytics_logs').insert({
        event_id: eventId || null,
        sponsor_name: sponsorName,
        user_id: user.id,
        event_type: 'ad_watch_complete',
        duration_seconds: 15,
        metadata: { rewardCoins: rewardCoinsPerAd }
      });

      if (onCoinsUpdated) {
        onCoinsUpdated(newBalance);
      }

      setIsWatchingAd(false);
      setAdCompleted(false);
    } catch (err) {
      console.error('Error al reclamar monedas de farmeo:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 shadow-xl backdrop-blur-md">
      {/* Encabezado de Farmeo */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {sponsorLogoUrl ? (
            <img src={sponsorLogoUrl} alt={sponsorName} className="w-8 h-8 object-contain rounded-md" />
          ) : (
            <div className="w-8 h-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center font-bold">
              ★
            </div>
          )}
          <div>
            <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
              Farmeo Exclusivo {sponsorName}
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full border border-amber-500/40">
                100% Sponsor
              </span>
            </h4>
            <p className="text-xs text-slate-400">Junta monedas para asegurar tu cupo en el torneo</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Progreso</span>
          <p className="text-amber-400 font-extrabold text-sm">
            {currentCoins.toLocaleString()} / {targetCoins.toLocaleString()} 🪙
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full bg-slate-800 rounded-full h-3 mb-4 overflow-hidden p-0.5 border border-slate-700">
        <div
          className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Botón de Farmeo */}
      <button
        onClick={startAd}
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-extrabold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <Play className="w-5 h-5 fill-slate-950" />
        <span>Ver Anuncio de {sponsorName} (+{rewardCoinsPerAd} Monedas)</span>
      </button>

      {/* Modal de Anuncio de Farmeo */}
      {isWatchingAd && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            {/* Cabecera del reproductor */}
            <div className="bg-slate-950 p-3 px-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Patrocinio Oficial: {sponsorName}
                </span>
              </div>
              <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-md">
                {adCompleted ? '¡Completado!' : `Quedan ${adSecondsRemaining}s`}
              </span>
            </div>

            {/* Simulación del Video Ad de la Marca */}
            <div className="p-8 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 flex flex-col items-center justify-center text-center min-h-[260px] relative overflow-hidden">
              <div className="absolute inset-0 bg-amber-500/5 backdrop-blur-3xl pointer-events-none" />
              
              {sponsorLogoUrl ? (
                <img src={sponsorLogoUrl} alt={sponsorName} className="h-16 object-contain mb-4 animate-bounce" />
              ) : (
                <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/40 rounded-2xl flex items-center justify-center text-amber-400 text-3xl font-extrabold mb-4 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                  {sponsorName.charAt(0)}
                </div>
              )}

              <h3 className="text-2xl font-black text-white mb-2">{sponsorName}</h3>
              <p className="text-sm text-slate-300 max-w-xs mb-6">
                "Disfruta de las mejores promociones exclusivas en Kasino21 gracias a {sponsorName}"
              </p>

              {!adCompleted ? (
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-full animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  Visualizando anuncio exclusivo... ({adSecondsRemaining}s)
                </div>
              ) : (
                <button
                  onClick={claimReward}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-xl flex items-center gap-2 text-base shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {loading ? 'Reclamando...' : `Reclamar +${rewardCoinsPerAd} Monedas`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
