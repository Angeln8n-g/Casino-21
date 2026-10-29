import React, { useState } from 'react';
import { X, Trophy, Users, Coins, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SponsoredTournament } from '../../../domain/sponsored-tournament';
import {
  CASH_PRIZES_ENABLED,
  PrizeTier,
  buildPrizeDisplayGroups,
  calculateDynamicPot,
} from '../../../domain/tournament';
import { joinTournamentEvent } from '../../services/tournamentApi';
import { useFocusTrap } from '../../hooks/useFocusTrap';

interface SponsoredTournamentModalProps {
  tournament: SponsoredTournament & {
    guaranteedPrizeCoins?: number;
    currentPrizeCoins?: number;
    entryPoolPercent?: number;
    prizeTiers?: PrizeTier[] | null;
    rewardXpWinner?: number;
  };
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
  onRegistered,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalRef = useFocusTrap<HTMLDivElement>({ isOpen, onClose });

  if (!isOpen) return null;

  const primaryColor = tournament.brandTheme?.primaryColor || '#f59e0b';
  const remainingSlots = Math.max(0, tournament.maxParticipants - tournament.participantsCount);
  const isFull = remainingSlots === 0;
  const hasEnoughCoins = userCoins >= tournament.entryFeeCoins;

  const coinPot =
    (tournament.currentPrizeCoins ?? 0) > 0
      ? tournament.currentPrizeCoins!
      : calculateDynamicPot(
          tournament.guaranteedPrizeCoins ?? 0,
          tournament.entryFeeCoins ?? 0,
          tournament.participantsCount ?? 0,
          tournament.entryPoolPercent ?? 90
        );

  const coinDisplayGroups = buildPrizeDisplayGroups(
    coinPot,
    tournament.prizeTiers,
    tournament.maxParticipants
  );

  const handleRegister = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = await joinTournamentEvent(tournament.id);
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || 'No se pudo completar la inscripción.');
      return;
    }

    setSuccessMsg(
      result.bracketStarted
        ? '¡Inscripción exitosa y cupo completado! Las llaves han comenzado.'
        : '¡Inscripción confirmada! Te esperamos en la mesa patrocinada.'
    );
    onRegistered?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Torneo Patrocinado"
        className="bg-slate-900 border border-white/15 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl relative"
      >
        {/* Cabecera Patrocinada */}
        <div
          className="relative p-6 pt-8 pb-8 overflow-hidden flex flex-col justify-end min-h-[170px]"
          style={{
            background: tournament.sponsorBannerUrl
              ? `linear-gradient(to bottom, rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.96)), url(${tournament.sponsorBannerUrl}) center/cover`
              : `linear-gradient(135deg, ${primaryColor}33, #0f172a)`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana del torneo"
            className="absolute top-4 right-4 bg-slate-950/70 hover:bg-slate-950 text-slate-200 hover:text-white p-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:outline-none"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {tournament.sponsorLogoUrl ? (
              <img
                src={tournament.sponsorLogoUrl}
                alt={tournament.sponsorName}
                className="h-14 object-contain bg-slate-950/60 p-2 rounded-xl border border-white/15"
              />
            ) : (
              <div className="w-14 h-14 bg-slate-950/80 text-casino-gold font-black text-2xl rounded-2xl flex items-center justify-center border border-casino-gold/40">
                {tournament.sponsorName?.charAt(0) || '★'}
              </div>
            )}
            <div>
              <span
                className="text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full text-black"
                style={{ backgroundColor: primaryColor }}
              >
                Torneo Patrocinado · {tournament.sponsorName}
              </span>
              <h2 className="text-2xl font-black text-white mt-1.5">{tournament.title}</h2>
            </div>
          </div>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/70 border border-casino-gold/30 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-casino-gold/15 text-casino-gold rounded-xl flex items-center justify-center font-bold shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-300 block">
                  {CASH_PRIZES_ENABLED && tournament.cashPrizePool > 0 ? 'Bolsa Oficial' : 'Pozo Garantizado'}
                </span>
                <p className="text-lg font-black text-casino-gold truncate">
                  {CASH_PRIZES_ENABLED && tournament.cashPrizePool > 0
                    ? `$${tournament.cashPrizePool} USD`
                    : `🪙 ${coinPot.toLocaleString('es-ES')}`}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center font-bold shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-300 block">Plazas Disponibles</span>
                <p className="text-lg font-black text-white">
                  {remainingSlots} / {tournament.maxParticipants}
                </p>
              </div>
            </div>
          </div>

          {/* Desglose de Premios */}
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-casino-gold" />
              Reparto Oficial de Premios (+{tournament.rewardXpWinner || 300} XP Campeón)
            </h4>
            <div className="space-y-2">
              {coinDisplayGroups.map((group) => (
                <div
                  key={group.label}
                  className="flex items-center justify-between text-sm py-2 px-3 bg-slate-900/80 rounded-xl border border-white/10"
                >
                  <span className="font-semibold text-slate-200">{group.label}</span>
                  <span className="font-black text-casino-gold">
                    🪙 {group.coinsEach.toLocaleString('es-ES')} ({group.percentEach}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading || isFull || !hasEnoughCoins || Boolean(successMsg)}
            className="w-full bg-casino-gold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-4 px-6 rounded-2xl text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <Coins className="w-5 h-5" />
            {loading
              ? 'Procesando inscripción...'
              : successMsg
              ? '✓ INSCRITO'
              : isFull
              ? 'CUPOS COMPLETOS'
              : !hasEnoughCoins
              ? `TE FALTAN ${(tournament.entryFeeCoins - userCoins).toLocaleString('es-ES')} MONEDAS`
              : tournament.entryFeeCoins > 0
              ? `INSCRIBIRME POR ${tournament.entryFeeCoins.toLocaleString('es-ES')} MONEDAS`
              : 'INSCRIBIRME GRATIS'}
          </button>
        </div>
      </div>
    </div>
  );
};
