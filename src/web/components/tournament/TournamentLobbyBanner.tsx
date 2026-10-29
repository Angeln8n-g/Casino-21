import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Zap, Calendar, CheckCircle2, Swords, ChevronRight, Coins, Sparkles } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { socketService } from '../../services/socket';
import {
  CASH_PRIZES_ENABLED,
  calculateDynamicPot,
  getRoundDisplayName,
  parseLegacyCoinPool,
} from '../../../domain/tournament';
import { checkInTournamentEvent, joinTournamentEvent } from '../../services/tournamentApi';

interface TournamentLobbyBannerProps {
  onOpenEvents?: (eventId?: string) => void;
}

interface ReadyMatchInfo {
  matchId: string;
  eventId: string;
  eventTitle: string;
  roundNumber: number;
  maxParticipants: number;
  gameRoomId: string;
}

interface FeaturedEventRow {
  id: string;
  title: string;
  status: 'upcoming' | 'live';
  tournament_format?: 'sit_and_go' | 'scheduled';
  start_date: string;
  entry_fee: number;
  prize_pool?: string;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  entry_pool_percent?: number;
  participants_count: number;
  max_participants: number;
  min_elo?: number;
  check_in_enabled?: boolean;
  check_in_deadline?: string | null;
  reward_xp_winner?: number;
  reward_store_item_id?: string | null;
  is_championship?: boolean;
  is_sponsored?: boolean;
  sponsor_name?: string | null;
}

export const TournamentLobbyBanner: React.FC<TournamentLobbyBannerProps> = ({ onOpenEvents }) => {
  const { user, profile } = useAuth();
  const [readyMatch, setReadyMatch] = useState<ReadyMatchInfo | null>(null);
  const [checkInEvent, setCheckInEvent] = useState<FeaturedEventRow | null>(null);
  const [featuredEvent, setFeaturedEvent] = useState<FeaturedEventRow | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Record<string, { checked_in: boolean }>>({});
  const [busyAction, setBusyAction] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadBannerState = useCallback(async () => {
    try {
      const { data: rawEvents } = await supabase
        .from('events')
        .select('*')
        .eq('type', 'torneo')
        .in('status', ['upcoming', 'live'])
        .order('start_date', { ascending: true });

      const validEvents = ((rawEvents || []) as FeaturedEventRow[]).filter(
        (ev) => CASH_PRIZES_ENABLED || !ev.is_championship
      );

      let entryMap: Record<string, { checked_in: boolean }> = {};

      if (user?.id) {
        const { data: entries } = await supabase
          .from('event_entries')
          .select('event_id, checked_in')
          .eq('player_id', user.id);

        for (const e of entries || []) {
          entryMap[e.event_id] = { checked_in: Boolean(e.checked_in) };
        }

        // Buscar si el usuario tiene algún partido activo con ambos jugadores asignados
        const liveEventIds = validEvents.filter((e) => e.status === 'live').map((e) => e.id);
        if (liveEventIds.length > 0) {
          const { data: myMatches } = await supabase
            .from('tournament_matches')
            .select('id, event_id, round_number, series_game, status, winner_id, player1_id, player2_id, game_room_id')
            .in('event_id', liveEventIds)
            .is('winner_id', null)
            .in('status', ['pending', 'ready', 'playing'])
            .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
            .order('round_number', { ascending: true })
            .order('series_game', { ascending: true });

          const playable = (myMatches || []).find(
            (m) => m.player1_id && m.player2_id && m.game_room_id
          );

          if (playable) {
            const ev = validEvents.find((e) => e.id === playable.event_id);
            setReadyMatch({
              matchId: playable.id,
              eventId: playable.event_id,
              eventTitle: ev?.title || 'Torneo Oficial',
              roundNumber: playable.round_number,
              maxParticipants: ev?.max_participants || 8,
              gameRoomId: playable.game_room_id,
            });
          } else {
            setReadyMatch(null);
          }
        } else {
          setReadyMatch(null);
        }
      } else {
        setReadyMatch(null);
      }

      setEnrolledIds(entryMap);

      // Prioridad 2: Torneo programado donde el usuario está inscrito y el Check-in está abierto
      const pendingCheckIn = validEvents.find(
        (ev) =>
          ev.status === 'upcoming' &&
          ev.check_in_enabled &&
          entryMap[ev.id] &&
          !entryMap[ev.id].checked_in
      );
      setCheckInEvent(pendingCheckIn || null);

      // Prioridad 3: Sit & Go más próximo a llenarse -> Próximo Programado -> En vivo
      const upcomingSng = validEvents
        .filter((ev) => ev.status === 'upcoming' && ev.tournament_format === 'sit_and_go')
        .sort((a, b) => {
          const ratioA = (a.participants_count || 0) / Math.max(1, a.max_participants || 8);
          const ratioB = (b.participants_count || 0) / Math.max(1, b.max_participants || 8);
          return ratioB - ratioA;
        });

      const upcomingScheduled = validEvents
        .filter((ev) => ev.status === 'upcoming' && ev.tournament_format !== 'sit_and_go')
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      const liveTournaments = validEvents.filter((ev) => ev.status === 'live');

      setFeaturedEvent(upcomingSng[0] || upcomingScheduled[0] || liveTournaments[0] || null);
    } catch {
      // Silencioso en caso de desconexión temporal
    }
  }, [user?.id]);

  useEffect(() => {
    loadBannerState();
    const handleRefresh = () => loadBannerState();
    window.addEventListener('tournament_Refresh', handleRefresh);

    let cleanupSocket: (() => void) | undefined;
    socketService
      .connect()
      .then((socket) => {
        const refresh = () => loadBannerState();
        socket.on('tournament_list_updated', refresh);
        socket.on('tournament_started', refresh);
        socket.on('tournament_ready', refresh);
        socket.on('tournament_checkin_open', refresh);
        socket.on('event_started', refresh);
        socket.on('event_completed', refresh);
        cleanupSocket = () => {
          socket.off('tournament_list_updated', refresh);
          socket.off('tournament_started', refresh);
          socket.off('tournament_ready', refresh);
          socket.off('tournament_checkin_open', refresh);
          socket.off('event_started', refresh);
          socket.off('event_completed', refresh);
        };
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('tournament_Refresh', handleRefresh);
      cleanupSocket?.();
    };
  }, [loadBannerState]);

  useEffect(() => {
    if (!checkInEvent && (!featuredEvent || featuredEvent.tournament_format === 'sit_and_go')) return;
    const t = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [checkInEvent, featuredEvent]);

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 4500);
  };

  const handleQuickCheckIn = async (eventId: string) => {
    setBusyAction(true);
    const res = await checkInTournamentEvent(eventId);
    setBusyAction(false);
    if (res.success) {
      showNotice('ok', '¡Check-in confirmado! Tu lugar en la llave está asegurado.');
      loadBannerState();
    } else {
      showNotice('err', res.error || 'No se pudo confirmar el Check-in.');
    }
  };

  const handleQuickJoin = async (ev: FeaturedEventRow) => {
    if (!user) {
      showNotice('err', 'Inicia sesión para inscribirte en torneos.');
      return;
    }
    if ((ev.min_elo || 0) > (profile?.elo || 1000)) {
      showNotice('err', `Requiere al menos ${ev.min_elo} ELO (tu ELO: ${profile?.elo || 1000}).`);
      return;
    }
    setBusyAction(true);
    const res = await joinTournamentEvent(ev.id);
    setBusyAction(false);
    if (res.success) {
      if (res.bracketStarted) {
        showNotice('ok', '¡Mesa completa! Las llaves se han generado automáticamente.');
      } else {
        showNotice('ok', `¡Inscrito en "${ev.title}"! El pozo sigue subiendo.`);
      }
      loadBannerState();
    } else {
      showNotice('err', res.error || 'No se pudo completar la inscripción.');
    }
  };

  const formatRemaining = (isoDate: string) => {
    const diff = Math.max(0, new Date(isoDate).getTime() - nowMs);
    const totalSec = Math.floor(diff / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h`;
    }
    if (h > 0) {
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getEventPot = (ev: FeaturedEventRow) => {
    if ((ev.current_prize_coins ?? 0) > 0) return ev.current_prize_coins!;
    const dynamic = calculateDynamicPot(
      ev.guaranteed_prize_coins ?? 0,
      ev.entry_fee ?? 0,
      ev.participants_count ?? 0,
      ev.entry_pool_percent ?? 90
    );
    if (dynamic > 0) return dynamic;
    return parseLegacyCoinPool(ev.prize_pool);
  };

  // ── PRIORIDAD 1: Partida de torneo lista para jugar ─────────────────────────
  if (readyMatch) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/40 bg-slate-900/90 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-300">
              <Swords className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Tu Partida Está Lista
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {getRoundDisplayName(readyMatch.roundNumber, readyMatch.maxParticipants)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate mt-1">
                {readyMatch.eventTitle}
              </h3>
              <p className="text-xs text-slate-300">
                Ingresa ahora para evitar eliminación por Walkover (3 min de tolerancia).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenEvents?.(readyMatch.eventId)}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:outline-none"
            >
              Ver Llave
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('join_game_from_invite', {
                    detail: {
                      roomId: readyMatch.gameRoomId,
                      isTournament: true,
                      isSpectator: false,
                    },
                  })
                );
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-black transition-colors shadow-lg focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:outline-none"
            >
              Entrar a Jugar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PRIORIDAD 2: Check-in abierto para el usuario ───────────────────────────
  if (checkInEvent) {
    const deadline = checkInEvent.check_in_deadline || checkInEvent.start_date;
    return (
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-900/90 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0 text-amber-300">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  Check-in Abierto
                </span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  Cierra en {formatRemaining(deadline)}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white truncate mt-1">
                {checkInEvent.title}
              </h3>
              <p className="text-xs text-slate-300">
                Confirma tu asistencia para entrar al cuadro. Los ausentes reciben reembolso automático.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={busyAction}
              onClick={() => handleQuickCheckIn(checkInEvent.id)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-casino-gold hover:bg-yellow-400 text-black transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-casino-gold focus-visible:outline-none"
            >
              {busyAction ? 'Confirmando...' : '✅ Confirmar Asistencia'}
            </button>
          </div>
        </div>
        {feedback && (
          <p className={`mt-2.5 text-xs font-bold ${feedback.type === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
            {feedback.text}
          </p>
        )}
      </div>
    );
  }

  // ── PRIORIDAD 3: Torneo Sit & Go o Programado Destacado ─────────────────────
  if (!featuredEvent) {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/75 px-4 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-casino-gold/15 border border-casino-gold/30 flex items-center justify-center text-casino-gold shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-white truncate">
              Arena de Torneos Competitivos
            </p>
            <p className="text-[11px] text-slate-300 truncate">
              Compite por pozos acumulables de monedas, XP de torneo y cosméticos exclusivos.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpenEvents?.()}
          className="px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-casino-gold bg-casino-gold/10 hover:bg-casino-gold/20 border border-casino-gold/30 transition-colors shrink-0 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-casino-gold focus-visible:outline-none"
        >
          <span>Cartelera</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isSitAndGo = featuredEvent.tournament_format === 'sit_and_go';
  const isEnrolled = Boolean(enrolledIds[featuredEvent.id]);
  const maxPlayers = Math.max(2, featuredEvent.max_participants || 8);
  const currentPlayers = Math.min(maxPlayers, featuredEvent.participants_count || 0);
  const fillPercent = Math.min(100, Math.round((currentPlayers / maxPlayers) * 100));
  const potCoins = getEventPot(featuredEvent);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-casino-gold/30 bg-slate-900/85 p-4 sm:p-5 shadow-[0_12px_32px_rgba(0,0,0,0.45)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Info izquierda */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {featuredEvent.status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/20 text-red-300 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                En Curso
              </span>
            ) : isSitAndGo ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-casino-gold/15 text-casino-gold border border-casino-gold/30">
                <Zap className="w-3 h-3" />
                Sit &amp; Go Rápido · Inicia al llenarse
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-cyan-500/15 text-cyan-300 border border-cyan-400/30">
                <Calendar className="w-3 h-3" />
                Inicia en {formatRemaining(featuredEvent.start_date)}
              </span>
            )}

            {featuredEvent.is_sponsored && featuredEvent.sponsor_name && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-white border border-white/15">
                Patrocina: {featuredEvent.sponsor_name}
              </span>
            )}

            {featuredEvent.reward_store_item_id && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-200 border border-purple-400/30">
                <Sparkles className="w-3 h-3" />
                Skin Exclusiva
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
            <h3 className="text-lg sm:text-xl font-black text-white truncate">
              {featuredEvent.title}
            </h3>
            <span className="text-xs font-bold text-slate-300 shrink-0">
              Entrada:{' '}
              {featuredEvent.entry_fee > 0 ? (
                <span className="text-casino-gold">🪙 {featuredEvent.entry_fee.toLocaleString()}</span>
              ) : (
                <span className="text-emerald-300">GRATIS</span>
              )}
            </span>
          </div>

          {/* Barra de cupo y pozo */}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            <div className="flex items-center gap-2 min-w-[160px] flex-1 max-w-xs">
              <div className="h-2 flex-1 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-casino-gold to-amber-400 transition-all duration-500"
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 shrink-0">
                {currentPlayers}/{maxPlayers} J
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 border border-casino-gold/25">
              <Coins className="w-3.5 h-3.5 text-casino-gold" />
              <span className="text-xs font-black text-casino-gold">
                Pozo: {potCoins > 0 ? `${potCoins.toLocaleString()} 🪙` : featuredEvent.prize_pool || 'Premios + XP'}
              </span>
            </div>

            <span className="text-[11px] font-bold text-slate-300">
              +{featuredEvent.reward_xp_winner || 300} XP Campeón
            </span>
          </div>
        </div>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onOpenEvents?.(featuredEvent.status === 'live' ? featuredEvent.id : undefined)}
            className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-casino-gold focus-visible:outline-none"
          >
            {featuredEvent.status === 'live' ? 'Ver Llave' : 'Todos los Torneos'}
          </button>

          {featuredEvent.status === 'upcoming' && (
            <button
              type="button"
              disabled={busyAction || isEnrolled || currentPlayers >= maxPlayers}
              onClick={() => handleQuickJoin(featuredEvent)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors focus-visible:ring-2 focus-visible:ring-casino-gold focus-visible:outline-none ${
                isEnrolled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 cursor-default'
                  : 'bg-casino-gold hover:bg-yellow-400 text-black shadow-lg disabled:opacity-50'
              }`}
            >
              {busyAction
                ? 'Procesando...'
                : isEnrolled
                ? '✓ Inscrito'
                : currentPlayers >= maxPlayers
                ? 'Lleno'
                : 'Inscribirme'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <p className={`mt-2.5 text-xs font-bold ${feedback.type === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  );
};
