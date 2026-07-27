import React, { useState } from 'react';
import { X, Trophy, Users, Coins, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SponsoredTournament } from '../../../domain/sponsored-tournament';
import { supabase } from '../../services/supabase';
import { CoinFarmingButton } from './CoinFarmingButton';

interface SponsoredTournamentModalProps {
  tournament: SponsoredTournament;
  isOpen: boolean;
  userCoins: number;
  onClose: () => void;
  onRegistered?: () => void;
}

export const SponsoredTournamentModal: React.FC<SponsoredTournamentModalProps> = ({
  tournament,
  isOpen,
  userCoins,
  onClose,
  onRegistered
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [coins, setCoins] = useState(userCoins);

  if (!isOpen) return null;

  const primaryColor = tournament.brandTheme?.primaryColor || '#f59e0b';
  const remainingSlots = Math.max(0, tournament.maxParticipants - tournament.participantsCount);
  const isFull = remainingSlots === 0;
  const hasEnoughCoins = coins >= tournament.entryFeeCoins;

  const handleRegister = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (!user) {
        setErrorMsg('Debes iniciar sesión para inscribirte.');
        setLoading(false);
        return;
      }

      // Llamada RPC atómica
      const { data, error } = await supabase.rpc('register_sponsored_tournament', {
        p_event_id: tournament.id,
        p_user_id: user.id
      });

      if (error) {
        setErrorMsg(`Error al inscribirse: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data && !data.success) {
        if (data.error === 'CUPOS_LLENOS') {
          setErrorMsg('¡Los cupos para este torneo se han agotado!');
        } else if (data.error === 'MONEDAS_INSUFICIENTES') {
          setErrorMsg('No tienes suficientes monedas para pagar la entrada.');
        } else if (data.error === 'YA_INSCRITO') {
          setErrorMsg('Ya estás inscrito en este torneo.');
        } else {
          setErrorMsg(`No se pudo completar la inscripción: ${data.error}`);
        }
        setLoading(false);
        return;
      }

      setSuccessMsg('¡Inscripción exitosa! Te esperamos en la mesa de juego.');
      if (data?.remaining_coins !== undefined) {
        setCoins(data.remaining_coins);
      }
      if (onRegistered) onRegistered();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado al inscribirse.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative">
        {/* Banner / Cabecera Patrocinada */}
        <div
          className="relative p-6 pt-8 pb-10 overflow-hidden flex flex-col justify-end min-h-[180px]"
          style={{
            background: tournament.sponsorBannerUrl
              ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.95)), url(${tournament.sponsorBannerUrl}) center/cover`
              : `linear-gradient(135deg, ${primaryColor}33, #0f172a)`
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950 text-slate-300 hover:text-white p-2 rounded-full backdrop-blur-sm transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {tournament.sponsorLogoUrl ? (
              <img src={tournament.sponsorLogoUrl} alt={tournament.sponsorName} className="h-14 object-contain bg-slate-950/40 p-2 rounded-xl border border-white/10" />
            ) : (
              <div className="w-14 h-14 bg-amber-500/20 text-amber-400 font-black text-2xl rounded-2xl flex items-center justify-center border border-amber-500/40">
                {tournament.sponsorName?.charAt(0) || '★'}
              </div>
            )}
            <div>
              <span
                className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-slate-950"
                style={{ backgroundColor: primaryColor }}
              >
                Torneo Oficial {tournament.sponsorName}
              </span>
              <h2 className="text-2xl font-black text-white mt-1">{tournament.title}</h2>
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-6">
          {/* Tarjeta de Bolsa en Cash y Cupos */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center font-bold">
                <Trophy className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Bolsa en Dinero Real</span>
                <p className="text-xl font-black text-emerald-400">${tournament.cashPrizePool} USD</p>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center font-bold">
                <Users className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <span className="text-xs text-slate-400">Plazas Restantes</span>
                <p className="text-xl font-black text-amber-400">
                  {remainingSlots} / {tournament.maxParticipants}
                </p>
              </div>
            </div>
          </div>

          {/* Desglose de Premios en Cash */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Reparto de Premios (Cash Real)
            </h4>
            <div className="space-y-2">
              {tournament.prizeDistribution.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm py-1.5 px-3 bg-slate-900/60 rounded-xl border border-slate-800">
                  <span className="font-semibold text-slate-200">
                    {item.rank === 1 ? '🥇 1er Lugar' : item.rank === 2 ? '🥈 2do Lugar' : item.rank === 3 ? '🥉 3er Lugar' : `Puesto ${item.rank}`}
                  </span>
                  <span className="font-black text-emerald-400">${item.amountUsd} USD</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sección de Farmeo si faltan monedas */}
          {!hasEnoughCoins && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                Necesitas {tournament.entryFeeCoins.toLocaleString()} monedas para la entrada. ¡Farmea ahora!
              </div>
              <CoinFarmingButton
                sponsorName={tournament.sponsorName || 'Patrocinador'}
                sponsorLogoUrl={tournament.sponsorLogoUrl}
                targetCoins={tournament.entryFeeCoins}
                currentCoins={coins}
                eventId={tournament.id}
                onCoinsUpdated={(newCoins) => setCoins(newCoins)}
              />
            </div>
          )}

          {/* Mensajes de feedback */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Botón de Inscripción */}
          <button
            onClick={handleRegister}
            disabled={loading || isFull || !hasEnoughCoins}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-black py-4 px-6 rounded-2xl text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <Coins className="w-6 h-6" />
            {loading
              ? 'Procesando...'
              : isFull
              ? 'CUPOS LLENOS'
              : !hasEnoughCoins
              ? `FALTAN ${(tournament.entryFeeCoins - coins).toLocaleString()} MONEDAS`
              : `PAGAR ENTRADA CON ${tournament.entryFeeCoins.toLocaleString()} MONEDAS`}
          </button>
        </div>
      </div>
    </div>
  );
};
