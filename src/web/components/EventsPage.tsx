import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Calendar, Trophy, Coins, Sparkles, CheckCircle2, RotateCcw, Shield } from 'lucide-react';
import { supabase } from '../services/supabase';
import { socketService } from '../services/socket';
import { useAuth } from '../hooks/useAuth';
import { useAudio } from '../hooks/useAudio';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { logger } from '../utils/logger';
import {
  CASH_PRIZES_ENABLED,
  PrizeTier,
  TournamentFormat,
  buildPrizeDisplayGroups,
  calculateDynamicPot,
  parseLegacyCoinPool,
} from '../../domain/tournament';
import {
  checkInTournamentEvent,
  claimTournamentWalkoverApi,
  inviteTournamentOpponentApi,
  joinTournamentEvent,
  leaveTournamentEvent,
} from '../services/tournamentApi';
import { TournamentMatch } from './TournamentBracket';
import { TournamentView } from './tournament/TournamentView';
import { SponsoredTournamentModal } from './tournament/SponsoredTournamentModal';
import { PrizeClaimModal } from './tournament/PrizeClaimModal';
import { PrizeClaim } from '../../domain/sponsored-tournament';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface EventData {
  id: string;
  title: string;
  description: string;
  rules: string;
  type: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  tournament_format?: TournamentFormat;
  auto_recreate?: boolean;
  check_in_enabled?: boolean;
  check_in_deadline?: string | null;
  check_in_window_minutes?: number;
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  entry_pool_percent?: number;
  prize_tiers?: PrizeTier[] | null;
  reward_xp_winner?: number;
  reward_xp_podium?: number;
  reward_xp_participation?: number;
  reward_store_item_id?: string | null;
  final_best_of?: number;
  min_elo: number;
  image_url?: string;
  audio_url?: string;
  participants_count: number;
  max_participants: number;
  is_championship?: boolean;
  is_sponsored?: boolean;
  sponsor_name?: string;
  sponsor_logo_url?: string;
  sponsor_banner_url?: string;
  cash_prize_pool?: number;
  brand_theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    tableFeltUrl?: string;
    cardBackUrl?: string;
    logoUrl?: string;
  };
  prize_distribution?: { rank: number; amountUsd: number }[];
}

type CategoryTab = 'all' | 'sit_and_go' | 'scheduled' | 'live' | 'completed';

interface UserEntryState {
  checked_in: boolean;
}

function resolveEventCoinPot(ev: EventData): number {
  if ((ev.current_prize_coins ?? 0) > 0) return ev.current_prize_coins!;
  const dynamic = calculateDynamicPot(
    ev.guaranteed_prize_coins ?? 0,
    ev.entry_fee ?? 0,
    ev.participants_count ?? 0,
    ev.entry_pool_percent ?? 90
  );
  if (dynamic > 0) return dynamic;
  return parseLegacyCoinPool(ev.prize_pool);
}

function EventCard({
  event,
  entryState,
  isLoading,
  onViewRules,
  onViewBracket,
  onJoinEvent,
  onLeaveEvent,
  onCheckInEvent,
}: {
  event: EventData;
  entryState?: UserEntryState;
  isLoading: boolean;
  onViewRules: (rules: string, title: string) => void;
  onViewBracket: (event: EventData) => void;
  onJoinEvent: (event: EventData, e: React.MouseEvent) => void;
  onLeaveEvent: (event: EventData, e: React.MouseEvent) => void;
  onCheckInEvent: (event: EventData, e: React.MouseEvent) => void;
}) {
  const isEnrolled = Boolean(entryState);
  const isCheckedIn = Boolean(entryState?.checked_in);
  const isSitAndGo = event.tournament_format === 'sit_and_go';
  const maxPlayers = Math.max(2, event.max_participants || 8);
  const currentPlayers = Math.min(maxPlayers, event.participants_count || 0);
  const fillPercent = Math.min(100, Math.round((currentPlayers / maxPlayers) * 100));

  const potCoins = resolveEventCoinPot(event);
  const prizeGroups = buildPrizeDisplayGroups(potCoins, event.prize_tiers, maxPlayers);
  const firstPrize = prizeGroups[0]?.coinsEach ?? 0;
  const secondPrize = prizeGroups[1]?.coinsEach ?? 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      onClick={() => {
        if (event.status === 'live' || event.status === 'completed') {
          onViewBracket(event);
        } else {
          onViewRules(event.rules, event.title);
        }
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/85 hover:border-casino-gold/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between p-5 gap-4 shadow-lg"
    >
      {event.image_url && (
        <div
          className="absolute inset-0 opacity-15 group-hover:opacity-25 transition-opacity bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: `url(${event.image_url})` }}
        />
      )}

      {/* Cabecera de badges */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {event.status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                EN CURSO
              </span>
            ) : event.status === 'completed' ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-slate-200 border border-white/15">
                FINALIZADO
              </span>
            ) : isSitAndGo ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-casino-gold/15 text-casino-gold border border-casino-gold/35">
                <Zap className="w-3 h-3" />
                Sit &amp; Go
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-400/35">
                <Calendar className="w-3 h-3" />
                Programado
              </span>
            )}

            {event.min_elo > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/50 text-slate-200 border border-white/10">
                <Shield className="w-3 h-3 text-casino-gold" />
                {event.min_elo}+ ELO
              </span>
            )}
          </div>

          {isEnrolled && event.status === 'upcoming' && (
            <span
              className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                isCheckedIn || isSitAndGo
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/35'
              }`}
            >
              {isSitAndGo ? '✓ Inscrito' : isCheckedIn ? '✓ Check-in Listo' : '⏳ Inscrito'}
            </span>
          )}
        </div>

        <div>
          {event.is_sponsored && event.sponsor_name && (
            <span className="text-[10px] font-black uppercase tracking-widest text-casino-gold block mb-0.5">
              ★ Patrocina: {event.sponsor_name}
            </span>
          )}
          <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-casino-gold transition-colors line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-0.5">
            {event.status === 'upcoming'
              ? isSitAndGo
                ? '⚡ Inicia al instante al llenarse la mesa'
                : `📅 Inicia: ${formatDate(event.start_date)}`
              : event.status === 'live'
              ? '🔴 Llaves eliminatorias en juego'
              : `🏆 Finalizó: ${formatDate(event.end_date)}`}
          </p>
        </div>

        {/* Bloque de Pozo y Desglose */}
        <div className="rounded-xl bg-black/45 border border-casino-gold/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
              Pozo Acumulado
            </span>
            <span className="text-sm font-black font-mono text-casino-gold flex items-center gap-1">
              <Coins className="w-3.5 h-3.5" />
              {potCoins > 0 ? `${potCoins.toLocaleString('es-ES')} 🪙` : event.prize_pool}
            </span>
          </div>

          {potCoins > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-200 pt-1 border-t border-white/10">
              <span>🥇 1.º: {firstPrize.toLocaleString('es-ES')} 🪙</span>
              {secondPrize > 0 && <span>🥈 2.º: {secondPrize.toLocaleString('es-ES')} 🪙</span>}
              <span className="text-emerald-300 font-bold">+{event.reward_xp_winner || 300} XP</span>
            </div>
          )}

          {event.reward_store_item_id && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-200 pt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <span>Incluye Cosmético Exclusivo para el Campeón</span>
            </div>
          )}
        </div>

        {/* Barra de cupos */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold">
              Jugadores ({currentPlayers}/{maxPlayers})
            </span>
            <span className="font-bold text-slate-200">
              Entrada:{' '}
              {event.entry_fee > 0 ? (
                <span className="text-casino-gold">🪙 {event.entry_fee.toLocaleString('es-ES')}</span>
              ) : (
                <span className="text-emerald-300">GRATIS</span>
              )}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-casino-gold to-yellow-400 transition-all duration-500"
              style={{ width: `${fillPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Botonera inferior */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewRules(event.rules, event.title);
          }}
          className="text-[11px] uppercase font-bold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-colors border border-white/10"
        >
          Reglas
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {event.status === 'upcoming' && !isEnrolled && (
            <button
              type="button"
              onClick={(e) => onJoinEvent(event, e)}
              disabled={isLoading || currentPlayers >= maxPlayers}
              className="text-[11px] uppercase font-black px-4 py-2 rounded-xl transition-colors bg-casino-gold hover:bg-yellow-400 text-black disabled:opacity-50"
            >
              {isLoading ? 'Procesando...' : currentPlayers >= maxPlayers ? 'Cupo Lleno' : 'Inscribirme'}
            </button>
          )}

          {event.status === 'upcoming' && isEnrolled && (
            <>
              {event.check_in_enabled && !isCheckedIn && !isSitAndGo && (
                <button
                  type="button"
                  onClick={(e) => onCheckInEvent(event, e)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 text-[11px] uppercase font-black px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Check-in</span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => onLeaveEvent(event, e)}
                disabled={isLoading}
                title="Cancelar inscripción y recibir reembolso"
                className="inline-flex items-center gap-1 text-[11px] uppercase font-bold px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retirarme</span>
              </button>
            </>
          )}

          {(event.status === 'live' || event.status === 'completed') && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onViewBracket(event);
              }}
              className="text-[11px] uppercase font-black text-casino-gold hover:text-yellow-300 bg-casino-gold/15 hover:bg-casino-gold/25 px-4 py-2 rounded-xl transition-colors border border-casino-gold/35"
            >
              {event.status === 'completed' ? 'Ver Podio y Llave' : 'Ver Llave en Vivo'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EventsPage() {
  const { user, profile } = useAuth();
  const { startUrlLoop, stopLoop } = useAudio();
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<EventData[]>([]);
  const [userEntries, setUserEntries] = useState<Record<string, UserEntryState>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toastNotice, setToastNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();
  const [pushPromptModalOpen, setPushPromptModalOpen] = useState(false);
  const pushPromptModalRef = useFocusTrap({
    isOpen: pushPromptModalOpen,
    onClose: () => setPushPromptModalOpen(false),
  });
  const [pendingEnrollment, setPendingEnrollment] = useState<EventData | null>(null);

  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const rulesModalRef = useFocusTrap({
    isOpen: rulesModalOpen,
    onClose: () => setRulesModalOpen(false),
  });
  const [selectedRules, setSelectedRules] = useState({ title: '', content: '' });

  const [selectedTournament, setSelectedTournament] = useState('');
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [bracketChannel, setBracketChannel] = useState<any>(null);
  const [inviteCooldowns, setInviteCooldowns] = useState<Record<string, number>>({});

  // Sponsored Tournament & Legacy Prize Claim state (guarded by CASH_PRIZES_ENABLED)
  const [sponsoredModalOpen, setSponsoredModalOpen] = useState(false);
  const [selectedSponsoredEvent, setSelectedSponsoredEvent] = useState<EventData | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [activePrizeClaim, setActivePrizeClaim] = useState<PrizeClaim | null>(null);
  const [activeClaimSponsorName, setActiveClaimSponsorName] = useState<string>('Sponsor');

  const showToast = useCallback((type: 'ok' | 'err', text: string) => {
    setToastNotice({ type, text });
    window.setTimeout(() => setToastNotice(null), 5000);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setInviteCooldowns((prev) => {
        const next: Record<string, number> = {};
        let changed = false;
        const nowMs = Date.now();
        for (const [id, endTime] of Object.entries(prev)) {
          if (endTime > nowMs) {
            next[id] = endTime;
          } else {
            changed = true;
          }
        }
        return changed || Object.keys(next).length !== Object.keys(prev).length ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function mapMatchStatus(dbStatus: string): TournamentMatch['status'] {
    switch (dbStatus) {
      case 'ready':
      case 'playing':
        return 'live';
      case 'no_show':
      case 'completed':
        return 'completed';
      case 'pending':
      default:
        return 'pending';
    }
  }

  const fetchBracketData = useCallback(async (eventId: string) => {
    const { data, error } = await supabase
      .from('tournament_matches')
      .select(`
        id, round_number, match_order, status, winner_id,
        player1_id, player2_id, game_room_id,
        best_of, series_game, series_id,
        walkover_reason, waiting_player_id, waiting_since
      `)
      .eq('event_id', eventId);

    if (error || !data) {
      if (error) logger.error('Error fetching matches:', error);
      return;
    }

    const playerIds = Array.from(
      new Set(data.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean))
    );

    const profiles: Record<string, any> = {};
    if (playerIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, equipped_avatar')
        .in('id', playerIds);

      if (profilesError) logger.error('Error fetching profiles:', profilesError);
      for (const p of profilesData || []) {
        profiles[p.id] = p;
      }
    }

    const mappedMatches: TournamentMatch[] = data.map((m) => {
      const p1 = m.player1_id ? profiles[m.player1_id] : null;
      const p2 = m.player2_id ? profiles[m.player2_id] : null;

      return {
        id: m.id,
        round: m.round_number,
        position: m.match_order,
        player1: p1
          ? {
              id: p1.id,
              name: p1.username || 'Jugador',
              avatar: p1.equipped_avatar || p1.avatar_url,
              isWinner: m.winner_id === p1.id,
            }
          : null,
        player2: p2
          ? {
              id: p2.id,
              name: p2.username || 'Jugador',
              avatar: p2.equipped_avatar || p2.avatar_url,
              isWinner: m.winner_id === p2.id,
            }
          : null,
        status: mapMatchStatus(m.status),
        game_room_id: m.game_room_id,
        best_of: m.best_of,
        series_game: m.series_game,
        series_id: m.series_id,
        walkover_reason: m.walkover_reason,
        waiting_player_id: m.waiting_player_id,
        waiting_since: m.waiting_since,
      };
    });
    setTournamentMatches(mappedMatches);
  }, []);

  const closeBracketModal = useCallback(() => {
    setSelectedTournament('');
    stopLoop('event-bracket-audio');
    if (bracketChannel) {
      supabase.removeChannel(bracketChannel);
      setBracketChannel(null);
    }
  }, [bracketChannel, stopLoop]);

  const handleViewBracket = useCallback(
    async (event: EventData) => {
      if (bracketChannel) {
        supabase.removeChannel(bracketChannel);
      }
      setSelectedTournament(event.id);
      setMatchesLoading(true);

      if (event.audio_url) {
        startUrlLoop('event-bracket-audio', event.audio_url);
      }

      await fetchBracketData(event.id);
      setMatchesLoading(false);

      const channel = supabase
        .channel(`bracket-${event.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tournament_matches',
            filter: `event_id=eq.${event.id}`,
          },
          () => {
            fetchBracketData(event.id);
          }
        )
        .subscribe();

      setBracketChannel(channel);
    },
    [bracketChannel, fetchBracketData, startUrlLoop]
  );

  const loadEventsAndEntries = useCallback(async () => {
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'draft')
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      const cleaned = ((eventsData || []) as EventData[]).filter((ev) => {
        if (!CASH_PRIZES_ENABLED) {
          if (ev.is_championship) return false;
          if (ev.type !== 'torneo') return false;
        }
        return true;
      });

      setEvents(cleaned);

      if (user?.id) {
        const { data: entriesData, error: entriesError } = await supabase
          .from('event_entries')
          .select('event_id, checked_in')
          .eq('player_id', user.id);

        if (entriesError) {
          logger.error('Error al cargar inscripciones:', entriesError);
        } else {
          const map: Record<string, UserEntryState> = {};
          for (const entry of entriesData || []) {
            map[entry.event_id] = { checked_in: Boolean(entry.checked_in) };
          }
          setUserEntries(map);
        }

        if (CASH_PRIZES_ENABLED) {
          try {
            const { data: claimsData } = await supabase
              .from('tournament_prize_claims')
              .select('*, events:event_id(sponsor_name)')
              .eq('user_id', user.id)
              .in('status', ['pending_claim', 'claim_submitted'])
              .order('created_at', { ascending: false })
              .limit(1);

            if (claimsData && claimsData.length > 0) {
              const rawClaim = claimsData[0];
              setActivePrizeClaim({
                id: rawClaim.id,
                eventId: rawClaim.event_id,
                userId: rawClaim.user_id,
                rankPosition: rawClaim.rank_position,
                amountUsd: rawClaim.amount_usd,
                fullName: rawClaim.full_name,
                idCardNumber: rawClaim.id_card_number,
                phoneNumber: rawClaim.phone_number,
                bankName: rawClaim.bank_name,
                accountNumber: rawClaim.account_number,
                status: rawClaim.status,
                smsVerified: rawClaim.sms_verified,
                claimedAt: rawClaim.claimed_at,
                paidAt: rawClaim.paid_at,
                expiresAt: rawClaim.expires_at,
                createdAt: rawClaim.created_at,
              });
              if ((rawClaim.events as any)?.sponsor_name) {
                setActiveClaimSponsorName((rawClaim.events as any).sponsor_name);
              }
            }
          } catch {
            // Silencioso
          }
        }
      } else {
        setUserEntries({});
      }
    } catch (err) {
      logger.error('Error fetching events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadEventsAndEntries();
  }, [loadEventsAndEntries]);

  useEffect(() => {
    const handleRefresh = () => {
      loadEventsAndEntries();
      if (selectedTournament) fetchBracketData(selectedTournament);
    };

    const handleOpenBracketEvent = (e: Event) => {
      const targetId = (e as CustomEvent)?.detail?.eventId;
      if (!targetId) return;
      const found = events.find((ev) => ev.id === targetId);
      if (found) {
        handleViewBracket(found);
      } else {
        supabase
          .from('events')
          .select('*')
          .eq('id', targetId)
          .maybeSingle()
          .then(({ data }) => {
            if (data) handleViewBracket(data as EventData);
          });
      }
    };

    window.addEventListener('tournament_Refresh', handleRefresh);
    window.addEventListener('open_tournament_bracket', handleOpenBracketEvent);

    let cleanupSocket: (() => void) | undefined;
    socketService
      .connect()
      .then((socket) => {
        socket.on('tournament_list_updated', handleRefresh);
        socket.on('event_started', handleRefresh);
        socket.on('event_completed', handleRefresh);
        socket.on('tournament_started', handleRefresh);
        socket.on('tournament_checkin_open', handleRefresh);
        cleanupSocket = () => {
          socket.off('tournament_list_updated', handleRefresh);
          socket.off('event_started', handleRefresh);
          socket.off('event_completed', handleRefresh);
          socket.off('tournament_started', handleRefresh);
          socket.off('tournament_checkin_open', handleRefresh);
        };
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('tournament_Refresh', handleRefresh);
      window.removeEventListener('open_tournament_bracket', handleOpenBracketEvent);
      cleanupSocket?.();
    };
  }, [events, fetchBracketData, handleViewBracket, loadEventsAndEntries, selectedTournament]);

  const handleInviteOpponent = async (opponentId: string, match: TournamentMatch) => {
    if (!user || !match.game_room_id) return;
    const currentCooldown = inviteCooldowns[match.id];
    if (currentCooldown && currentCooldown > Date.now()) return;

    const res = await inviteTournamentOpponentApi({
      opponentId,
      roomId: match.game_room_id,
      eventTitle: events.find((e) => e.id === selectedTournament)?.title || 'Torneo',
      senderName: profile?.username,
    });

    if (res.success) {
      showToast('ok', '🔔 Aviso enviado a tu rival exitosamente.');
      setInviteCooldowns((prev) => ({
        ...prev,
        [match.id]: Date.now() + 60_000,
      }));
    } else {
      showToast('err', res.error || 'No se pudo enviar el aviso.');
    }
  };

  const handleClaimWalkover = async (matchId: string) => {
    if (!user) return;
    const res = await claimTournamentWalkoverApi(matchId);
    if (res.success) {
      showToast('ok', '🏆 ¡Victoria por Walkover adjudicada! Avanzaste a la siguiente ronda.');
      if (selectedTournament) await fetchBracketData(selectedTournament);
    } else {
      showToast('err', res.error || 'Aún no se cumple el tiempo reglamentario.');
    }
  };

  const handleJoinMatch = (match: TournamentMatch) => {
    if (!match.game_room_id) {
      showToast('err', 'La sala de juego aún no está disponible.');
      return;
    }

    closeBracketModal();
    const isSpectator = !(user && (match.player1?.id === user.id || match.player2?.id === user.id));

    window.dispatchEvent(
      new CustomEvent('join_game_from_invite', {
        detail: { roomId: match.game_room_id, isTournament: true, isSpectator },
      })
    );
  };

  const handleViewRules = (rules: string, title: string) => {
    setSelectedRules({ title, content: rules });
    setRulesModalOpen(true);
  };

  const confirmEnrollment = async (eventObj: EventData) => {
    if (!user) return;
    setActionLoading(eventObj.id);
    const res = await joinTournamentEvent(eventObj.id);
    setActionLoading(null);

    if (!res.success) {
      showToast('err', res.error || 'No se pudo completar la inscripción.');
      return;
    }

    await loadEventsAndEntries();

    if (res.bracketStarted) {
      showToast('ok', `⚡ ¡Mesa completa! Las llaves de "${eventObj.title}" han comenzado.`);
      handleViewBracket({ ...eventObj, status: 'live' });
    } else {
      showToast('ok', `🎉 ¡Inscrito en "${eventObj.title}"! Tu lugar está asegurado.`);
    }
  };

  const handleJoinEvent = async (eventObj: EventData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      showToast('err', 'Debes iniciar sesión para inscribirte en un torneo.');
      return;
    }

    if ((eventObj.min_elo || 0) > (profile?.elo || 1000)) {
      showToast(
        'err',
        `Este torneo requiere ${eventObj.min_elo} ELO mínimo (tu ELO actual: ${profile?.elo || 1000}).`
      );
      return;
    }

    if (eventObj.is_sponsored) {
      setSelectedSponsoredEvent(eventObj);
      setSponsoredModalOpen(true);
      return;
    }

    if (isSupported && !isSubscribed) {
      setPendingEnrollment(eventObj);
      setPushPromptModalOpen(true);
      return;
    }

    await confirmEnrollment(eventObj);
  };

  const handleLeaveEvent = async (eventObj: EventData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setActionLoading(eventObj.id);
    const res = await leaveTournamentEvent(eventObj.id);
    setActionLoading(null);

    if (res.success) {
      const refundMsg =
        (res.refunded_coins ?? 0) > 0
          ? ` Se reembolsaron ${res.refunded_coins?.toLocaleString('es-ES')} monedas a tu saldo.`
          : '';
      showToast('ok', `Inscripción cancelada en "${eventObj.title}".${refundMsg}`);
      loadEventsAndEntries();
    } else {
      showToast('err', res.error || 'No se pudo cancelar la inscripción.');
    }
  };

  const handleCheckInEvent = async (eventObj: EventData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    setActionLoading(eventObj.id);
    const res = await checkInTournamentEvent(eventObj.id);
    setActionLoading(null);

    if (res.success) {
      showToast('ok', `✅ ¡Check-in confirmado para "${eventObj.title}"!`);
      loadEventsAndEntries();
    } else {
      showToast('err', res.error || 'No se pudo confirmar el Check-in.');
    }
  };

  const handlePushChoice = async (accept: boolean) => {
    setPushPromptModalOpen(false);
    if (accept) {
      await subscribeToPush();
    }
    if (pendingEnrollment) {
      const target = pendingEnrollment;
      setPendingEnrollment(null);
      await confirmEnrollment(target);
    }
  };

  const filteredEvents = events.filter((e) => {
    const isSng = e.tournament_format === 'sit_and_go';
    if (categoryTab === 'sit_and_go' && (!isSng || e.status === 'completed')) return false;
    if (categoryTab === 'scheduled' && (isSng || e.status !== 'upcoming')) return false;
    if (categoryTab === 'live' && e.status !== 'live') return false;
    if (categoryTab === 'completed' && e.status !== 'completed') return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchText =
        e.title.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.rules || '').toLowerCase().includes(q);
      if (!matchText) return false;
    }
    return true;
  });

  // Ordenar: En vivo primero -> Sit & Go con más llenado -> Programados próximos -> Finalizados
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const weight = (ev: EventData) => {
      if (ev.status === 'live') return 0;
      if (ev.status === 'upcoming' && ev.tournament_format === 'sit_and_go') return 1;
      if (ev.status === 'upcoming') return 2;
      return 3;
    };
    const diff = weight(a) - weight(b);
    if (diff !== 0) return diff;
    if (a.status === 'upcoming' && a.tournament_format === 'sit_and_go') {
      const ratioA = (a.participants_count || 0) / Math.max(1, a.max_participants || 8);
      const ratioB = (b.participants_count || 0) / Math.max(1, b.max_participants || 8);
      return ratioB - ratioA;
    }
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
  });

  const featuredEvents = sortedEvents.filter((e) => e.status === 'live' || e.status === 'upcoming');
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (currentSlide >= featuredEvents.length) {
      setCurrentSlide(0);
    }
  }, [currentSlide, featuredEvents.length]);

  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEvents.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [featuredEvents.length]);

  const featuredEvent = featuredEvents[currentSlide];

  useEffect(() => {
    if (!featuredEvent || featuredEvent.tournament_format === 'sit_and_go') return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [featuredEvent]);

  const formatCountdown = (targetDate: string) => {
    const diffMs = Math.max(0, new Date(targetDate).getTime() - now);
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}:${String(
      minutes
    ).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-300 uppercase tracking-widest font-bold">
        Cargando torneos...
      </div>
    );
  }

  if (selectedTournament) {
    const eventObj = events.find((e) => e.id === selectedTournament);
    return (
      <div className="space-y-4">
        {toastNotice && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-bold ${
              toastNotice.type === 'ok'
                ? 'bg-slate-900 border-emerald-400/40 text-emerald-300'
                : 'bg-slate-900 border-rose-500/40 text-rose-300'
            }`}
          >
            {toastNotice.text}
          </div>
        )}
        <TournamentView
          eventId={selectedTournament}
          event={eventObj}
          matches={tournamentMatches}
          loading={matchesLoading}
          currentUserId={user?.id}
          isAdmin={profile?.role === 'admin' || Boolean(profile?.is_admin)}
          inviteCooldowns={inviteCooldowns}
          onJoinMatch={handleJoinMatch}
          onInviteOpponent={handleInviteOpponent}
          onClaimWalkover={handleClaimWalkover}
          onClose={closeBracketModal}
        />
      </div>
    );
  }

  const featuredPot = featuredEvent ? resolveEventCoinPot(featuredEvent) : 0;
  const featuredEntry = featuredEvent ? userEntries[featuredEvent.id] : undefined;

  return (
    <div id="events-section" className="w-full text-white animate-fade-in space-y-6">
      {toastNotice && (
        <div
          role="status"
          className={`px-4 py-3 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-between gap-3 ${
            toastNotice.type === 'ok'
              ? 'bg-slate-900/95 border-emerald-400/40 text-emerald-300'
              : 'bg-slate-900/95 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{toastNotice.text}</span>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-slate-300 hover:text-white px-2"
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {CASH_PRIZES_ENABLED && activePrizeClaim && (
        <div className="bg-slate-900 border border-casino-gold/40 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-casino-gold shrink-0" />
            <div>
              <h4 className="font-black text-sm text-white">
                ¡Tienes un premio de ${activePrizeClaim.amountUsd} USD pendiente de reclamo!
              </h4>
              <p className="text-xs text-slate-300">Torneo Oficial {activeClaimSponsorName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClaimModalOpen(true)}
            className="bg-casino-gold hover:bg-yellow-400 text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider"
          >
            Reclamar
          </button>
        </div>
      )}

      {/* Hero Destacado */}
      {featuredEvent && (
        <div className="relative w-full rounded-3xl overflow-hidden border border-casino-gold/30 bg-slate-900/90 shadow-xl">
          {featuredEvent.image_url && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
              style={{ backgroundImage: `url(${featuredEvent.image_url})` }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/60 pointer-events-none" />

          <div className="relative z-10 p-6 sm:p-10 flex flex-col justify-between gap-5 max-w-2xl">
            <div className="flex items-center gap-2.5 flex-wrap">
              {featuredEvent.status === 'live' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  EN VIVO AHORA
                </span>
              ) : featuredEvent.tournament_format === 'sit_and_go' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-casino-gold/15 text-casino-gold border border-casino-gold/35">
                  <Zap className="w-3.5 h-3.5" />
                  SIT &amp; GO RÁPIDO · {featuredEvent.participants_count}/{featuredEvent.max_participants} JUGADORES
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-400/35">
                  <Calendar className="w-3.5 h-3.5" />
                  INICIA EN {formatCountdown(featuredEvent.start_date)}
                </span>
              )}

              <span className="px-3 py-1 rounded-full bg-black/50 border border-casino-gold/30 text-casino-gold text-xs font-black font-mono">
                🪙 Pozo: {featuredPot > 0 ? featuredPot.toLocaleString('es-ES') : featuredEvent.prize_pool}
              </span>
            </div>

            <div>
              <h2 className="text-3xl sm:text-5xl font-black font-display text-white leading-tight">
                {featuredEvent.title}
              </h2>
              <p className="text-slate-300 text-sm sm:text-base mt-2 line-clamp-2">
                {featuredEvent.description ||
                  'Compite en llaves de eliminación directa con premios escalonados automáticos, XP competitivo y trofeos de podio.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {featuredEvent.status === 'upcoming' && !featuredEntry && (
                <button
                  type="button"
                  onClick={(e) => handleJoinEvent(featuredEvent, e)}
                  disabled={actionLoading === featuredEvent.id}
                  className="px-6 py-3 rounded-xl uppercase tracking-wider text-xs sm:text-sm font-black bg-casino-gold hover:bg-yellow-400 text-black transition-colors disabled:opacity-50"
                >
                  {actionLoading === featuredEvent.id
                    ? 'Procesando...'
                    : featuredEvent.entry_fee > 0
                    ? `Inscribirme (🪙 ${featuredEvent.entry_fee.toLocaleString('es-ES')})`
                    : 'Inscribirme Gratis'}
                </button>
              )}

              {featuredEvent.status === 'upcoming' && featuredEntry && (
                <>
                  {featuredEvent.check_in_enabled &&
                    !featuredEntry.checked_in &&
                    featuredEvent.tournament_format !== 'sit_and_go' && (
                      <button
                        type="button"
                        onClick={(e) => handleCheckInEvent(featuredEvent, e)}
                        disabled={actionLoading === featuredEvent.id}
                        className="px-6 py-3 rounded-xl uppercase tracking-wider text-xs sm:text-sm font-black bg-amber-400 hover:bg-amber-300 text-black transition-colors"
                      >
                        ✅ Confirmar Check-in
                      </button>
                    )}
                  <span className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/35">
                    ✓ Ya Estás Inscrito
                  </span>
                </>
              )}

              {(featuredEvent.status === 'live' || featuredEvent.status === 'completed') && (
                <button
                  type="button"
                  onClick={() => handleViewBracket(featuredEvent)}
                  className="px-6 py-3 rounded-xl uppercase tracking-wider text-xs sm:text-sm font-black bg-casino-gold hover:bg-yellow-400 text-black transition-colors"
                >
                  Ver Llaves en Vivo
                </button>
              )}

              <button
                type="button"
                onClick={() => handleViewRules(featuredEvent.rules, featuredEvent.title)}
                className="px-5 py-3 rounded-xl text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
              >
                Reglas
              </button>
            </div>
          </div>

          {featuredEvents.length > 1 && (
            <div className="px-6 pb-4 flex gap-2 relative z-10">
              {featuredEvents.map((ev, idx) => (
                <button
                  type="button"
                  key={ev.id}
                  aria-label={`Ver destacado ${idx + 1}`}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlide ? 'bg-casino-gold w-7' : 'bg-white/30 hover:bg-white/50 w-2'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Encabezado y Pestañas de Formato */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-wider text-white">
              Arena de Torneos
            </h3>
            <p className="text-xs text-slate-300">
              Pozos dinámicos acumulables · Reparto Top 2 / Top 4 / Top 8 + XP + Cosméticos Exclusivos
            </p>
          </div>
          <span className="text-xs text-slate-200 font-bold bg-slate-900 px-3 py-1.5 rounded-full border border-white/10">
            {sortedEvents.length} {sortedEvents.length === 1 ? 'torneo' : 'torneos'}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 p-3 bg-slate-900/80 rounded-2xl border border-white/10">
          {/* Pestañas de formato */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { key: 'all', label: 'Todos' },
                { key: 'sit_and_go', label: '⚡ Sit & Go Rápidos' },
                { key: 'scheduled', label: '📅 Programados' },
                { key: 'live', label: '🔴 En Curso' },
                { key: 'completed', label: '🏆 Finalizados' },
              ] as Array<{ key: CategoryTab; label: string }>
            ).map((tab) => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setCategoryTab(tab.key)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                  categoryTab === tab.key
                    ? 'bg-casino-gold text-black'
                    : 'bg-black/40 text-slate-200 hover:bg-white/10 hover:text-white border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              id="events-search-input"
              aria-label="Buscar torneos por nombre o reglas"
              type="text"
              placeholder="Buscar torneo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-casino-gold/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-300 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grilla de Torneos */}
      {sortedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              entryState={userEntries[event.id]}
              isLoading={actionLoading === event.id}
              onViewRules={handleViewRules}
              onViewBracket={handleViewBracket}
              onJoinEvent={handleJoinEvent}
              onLeaveEvent={handleLeaveEvent}
              onCheckInEvent={handleCheckInEvent}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-slate-900/65 py-16 px-6 text-center space-y-2">
          <Trophy className="w-10 h-10 text-casino-gold mx-auto opacity-80" />
          <h4 className="text-base font-black uppercase tracking-wider text-white">
            No hay torneos en esta categoría
          </h4>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Pronto se abrirán nuevas mesas Sit &amp; Go y torneos programados con pozos garantizados.
          </p>
        </div>
      )}

      {/* Modal Reglas */}
      {rulesModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setRulesModalOpen(false)}
        >
          <div
            ref={rulesModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rules-modal-title"
            className="bg-slate-900 w-full max-w-lg rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xs font-bold text-casino-gold uppercase tracking-widest mb-1">
                  Reglas Oficiales
                </h3>
                <h2 id="rules-modal-title" className="text-xl font-black text-white leading-tight">
                  {selectedRules.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                aria-label="Cerrar reglas del torneo"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-slate-200 whitespace-pre-wrap text-sm leading-relaxed">
              {selectedRules.content ||
                '• Eliminación directa 1v1.\n• Tolerancia máxima de espera en sala: 3 minutos (Walkover automático).\n• Los premios en monedas, XP y cosméticos se acreditan automáticamente al concluir la Gran Final.'}
            </div>

            <div className="p-5 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-wider text-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Push Notifications */}
      {pushPromptModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => handlePushChoice(false)}
        >
          <div
            ref={pushPromptModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="push-prompt-title"
            className="bg-slate-900 w-full max-w-sm rounded-3xl border border-casino-gold/35 overflow-hidden flex flex-col p-7 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-center">
              <div className="w-16 h-16 bg-casino-gold/15 rounded-2xl flex items-center justify-center border border-casino-gold/40 text-3xl">
                🔔
              </div>
            </div>

            <h2 id="push-prompt-title" className="text-xl font-black text-white mb-2">
              ¿Activar avisos de partida?
            </h2>

            <p className="text-slate-300 font-medium mb-6 text-xs leading-relaxed">
              Te avisaremos en el instante exacto en que se abra el Check-in o comience tu llave para que nunca pierdas por Walkover.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handlePushChoice(true)}
                className="w-full font-black py-3 rounded-xl uppercase tracking-wider text-xs bg-casino-gold text-black hover:bg-yellow-400 transition-colors"
              >
                Sí, Avisarme
              </button>
              <button
                type="button"
                onClick={() => handlePushChoice(false)}
                className="w-full font-bold py-3 rounded-xl uppercase tracking-wider text-xs bg-white/10 text-white hover:bg-white/15 transition-colors"
              >
                Inscribirme sin avisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Torneo Patrocinado Unificado */}
      {selectedSponsoredEvent && (
        <SponsoredTournamentModal
          tournament={{
            id: selectedSponsoredEvent.id,
            title: selectedSponsoredEvent.title,
            description: selectedSponsoredEvent.description,
            status: selectedSponsoredEvent.status,
            startDate: selectedSponsoredEvent.start_date,
            endDate: selectedSponsoredEvent.end_date,
            isSponsored: true,
            sponsorName: selectedSponsoredEvent.sponsor_name || 'Patrocinador',
            sponsorLogoUrl: selectedSponsoredEvent.sponsor_logo_url,
            sponsorBannerUrl: selectedSponsoredEvent.sponsor_banner_url,
            brandTheme: selectedSponsoredEvent.brand_theme,
            maxParticipants: selectedSponsoredEvent.max_participants || 8,
            participantsCount: selectedSponsoredEvent.participants_count || 0,
            entryFeeCoins: selectedSponsoredEvent.entry_fee || 0,
            cashPrizePool: selectedSponsoredEvent.cash_prize_pool || 0,
            prizeDistribution: selectedSponsoredEvent.prize_distribution || [],
            guaranteedPrizeCoins: selectedSponsoredEvent.guaranteed_prize_coins,
            currentPrizeCoins: selectedSponsoredEvent.current_prize_coins,
            entryPoolPercent: selectedSponsoredEvent.entry_pool_percent,
            prizeTiers: selectedSponsoredEvent.prize_tiers,
            rewardXpWinner: selectedSponsoredEvent.reward_xp_winner,
          }}
          isOpen={sponsoredModalOpen}
          userCoins={profile?.coins || 0}
          onClose={() => setSponsoredModalOpen(false)}
          onRegistered={() => {
            setSponsoredModalOpen(false);
            loadEventsAndEntries();
            showToast('ok', `🎉 ¡Inscripción confirmada en "${selectedSponsoredEvent.title}"!`);
          }}
        />
      )}

      {CASH_PRIZES_ENABLED && activePrizeClaim && (
        <PrizeClaimModal
          claim={activePrizeClaim}
          sponsorName={activeClaimSponsorName}
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          onSubmitted={() => setClaimModalOpen(false)}
        />
      )}
    </div>
  );
}
