import React, { useState, useEffect } from 'react';
import { Zap, Calendar, Trophy, Coins, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabase';
import { TournamentBracket, TournamentMatch } from './TournamentBracket';
import { StoreAdmin } from './StoreAdmin';
import { QuestManager } from './QuestManager';
import { AdManagerAdmin } from './AdManagerAdmin';
import { AudioAdmin } from './AudioAdmin';
import { PendingPrizesAdmin } from './admin/PendingPrizesAdmin';
import { ChampionshipAdmin } from './admin/ChampionshipAdmin';
import { useAudio } from '../hooks/useAudio';
import {
  CASH_PRIZES_ENABLED,
  PRIZE_TIER_PRESETS,
  PrizeTier,
  PrizeTierPresetKey,
  TournamentFormat,
  VALID_BRACKET_SIZES,
  buildPrizeDisplayGroups,
  calculateDynamicPot,
  getDefaultPrizeTiers,
} from '../../domain/tournament';
import {
  adminKickTournamentPlayerApi,
  adminResolveTournamentMatchApi,
  adminStartTournamentApi,
} from '../services/tournamentApi';

interface AdminEventData {
  id: string;
  title: string;
  description: string;
  rules: string;
  type: 'torneo' | 'liga' | 'especial';
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  tournament_format?: TournamentFormat;
  auto_recreate?: boolean;
  check_in_window_minutes?: number;
  check_in_enabled?: boolean;
  start_date: string;
  end_date: string;
  entry_fee: number;
  prize_pool: string;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  entry_pool_percent?: number;
  prize_tiers?: PrizeTier[];
  reward_xp_winner?: number;
  reward_xp_podium?: number;
  reward_xp_participation?: number;
  reward_store_item_id?: string | null;
  final_best_of?: number;
  min_elo: number;
  image_url: string;
  audio_url?: string;
  board_theme_url?: string;
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
}

interface StoreItemOption {
  id: string;
  name: string;
  category?: string;
  rarity?: string;
}

function toDatetimeLocalValue(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function detectTierPreset(tiers?: PrizeTier[]): PrizeTierPresetKey {
  if (!tiers || tiers.length <= 2) return 'top2';
  if (tiers.length <= 4) return 'top4';
  return 'top8';
}

const DEFAULT_RULES_TEMPLATE =
  '• Eliminación directa 1v1 con seeding por ELO.\n• Tolerancia de espera en sala: 3 minutos (Walkover automático).\n• Las monedas, el XP y las recompensas exclusivas se acreditan automáticamente al concluir la Gran Final.';

export function AdminPanel() {
  const { startUrlLoop, stopLoop } = useAudio();
  const [activeTab, setActiveTab] = useState<
    'events' | 'store' | 'quests' | 'ads' | 'audio' | 'prizes' | 'championship'
  >('events');

  const [events, setEvents] = useState<AdminEventData[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Participants Modal State
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [currentEventParticipants, setCurrentEventParticipants] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Bracket Admin Modal State
  const [bracketModalOpen, setBracketModalOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<AdminEventData | null>(null);
  const [tournamentMatches, setTournamentMatches] = useState<TournamentMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [resolvingMatch, setResolvingMatch] = useState<TournamentMatch | null>(null);
  const [resolveBusy, setResolveBusy] = useState(false);

  // Confirm Start Modal State
  const [confirmStartEvent, setConfirmStartEvent] = useState<AdminEventData | null>(null);
  const [skipCheckInOnManualStart, setSkipCheckInOnManualStart] = useState(false);
  const [startBusy, setStartBusy] = useState(false);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [tierPreset, setTierPreset] = useState<PrizeTierPresetKey>('top4');
  const [currentEvent, setCurrentEvent] = useState<Partial<AdminEventData>>({});
  const [isUploading, setIsUploading] = useState(false);

  const showNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => {
    fetchEvents();
    fetchStoreItems();
  }, []);

  const fetchStoreItems = async () => {
    const { data } = await supabase
      .from('store_items')
      .select('id, name, category, rarity')
      .order('name', { ascending: true });
    if (data) setStoreItems(data as StoreItemOption[]);
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      const rows = ((data || []) as AdminEventData[]).filter(
        (ev) => CASH_PRIZES_ENABLED || !ev.is_championship
      );
      setEvents(rows);
    }
    setLoading(false);
  };

  const openCreateForm = (presetFormat: TournamentFormat = 'sit_and_go') => {
    const defaultMax = presetFormat === 'sit_and_go' ? 8 : 16;
    const defaultTiers = getDefaultPrizeTiers(defaultMax);
    const start = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000);

    setTierPreset(detectTierPreset(defaultTiers));
    setCurrentEvent({
      title: presetFormat === 'sit_and_go' ? 'Sit & Go Relámpago 8J' : 'Torneo Oficial Kasino21',
      description:
        presetFormat === 'sit_and_go'
          ? 'Mesa rápida competitiva: inicia automáticamente apenas se completan los cupos.'
          : 'Torneo programado con seeding por ELO, Check-in automático y premios escalonados.',
      rules: DEFAULT_RULES_TEMPLATE,
      type: 'torneo',
      status: 'upcoming',
      tournament_format: presetFormat,
      auto_recreate: presetFormat === 'sit_and_go',
      check_in_window_minutes: 15,
      entry_fee: 250,
      guaranteed_prize_coins: 1000,
      entry_pool_percent: 90,
      prize_tiers: defaultTiers,
      reward_xp_winner: 300,
      reward_xp_podium: 150,
      reward_xp_participation: 40,
      reward_store_item_id: null,
      final_best_of: presetFormat === 'sit_and_go' ? 1 : 3,
      min_elo: 0,
      image_url: '',
      audio_url: '',
      board_theme_url: '',
      max_participants: defaultMax,
      start_date: toDatetimeLocalValue(start.toISOString()),
      end_date: toDatetimeLocalValue(end.toISOString()),
      is_sponsored: false,
    });
    setIsEditing(true);
  };

  const openEditForm = (ev: AdminEventData) => {
    const tiers = Array.isArray(ev.prize_tiers) && ev.prize_tiers.length > 0
      ? ev.prize_tiers
      : getDefaultPrizeTiers(ev.max_participants || 8);
    setTierPreset(detectTierPreset(tiers));
    setCurrentEvent({
      ...ev,
      tournament_format: ev.tournament_format || 'scheduled',
      guaranteed_prize_coins: ev.guaranteed_prize_coins ?? 0,
      entry_pool_percent: ev.entry_pool_percent ?? 90,
      prize_tiers: tiers,
      reward_xp_winner: ev.reward_xp_winner ?? 300,
      reward_xp_podium: ev.reward_xp_podium ?? 150,
      reward_xp_participation: ev.reward_xp_participation ?? 40,
      final_best_of: ev.final_best_of ?? 1,
      check_in_window_minutes: ev.check_in_window_minutes ?? 15,
      start_date: toDatetimeLocalValue(ev.start_date),
      end_date: toDatetimeLocalValue(ev.end_date),
    });
    setIsEditing(true);
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'audio' | 'boardTheme'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('event_assets').upload(fileName, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('event_assets').getPublicUrl(fileName);

      if (type === 'image') {
        setCurrentEvent((prev) => ({ ...prev, image_url: publicUrl }));
      } else if (type === 'audio') {
        setCurrentEvent((prev) => ({ ...prev, audio_url: publicUrl }));
      } else {
        setCurrentEvent((prev) => ({ ...prev, board_theme_url: publicUrl }));
      }
    } catch (err: any) {
      setError('Error al subir el archivo: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const format = currentEvent.tournament_format || 'scheduled';
    const now = Date.now();
    const startDate =
      format === 'sit_and_go' && !currentEvent.start_date
        ? new Date(now + 24 * 60 * 60 * 1000).toISOString()
        : currentEvent.start_date
        ? new Date(currentEvent.start_date).toISOString()
        : new Date(now + 2 * 60 * 60 * 1000).toISOString();

    const endDate = currentEvent.end_date
      ? new Date(currentEvent.end_date).toISOString()
      : new Date(new Date(startDate).getTime() + 6 * 60 * 60 * 1000).toISOString();

    const maxP = VALID_BRACKET_SIZES.includes((currentEvent.max_participants || 8) as any)
      ? currentEvent.max_participants!
      : 8;
    const entryFee = Math.max(0, Number(currentEvent.entry_fee) || 0);
    const guaranteed = Math.max(0, Number(currentEvent.guaranteed_prize_coins) || 0);
    const poolPercent = Math.min(100, Math.max(0, Number(currentEvent.entry_pool_percent ?? 90)));
    const selectedTiers = PRIZE_TIER_PRESETS[tierPreset]?.tiers || getDefaultPrizeTiers(maxP);
    const existingParticipants = currentEvent.participants_count || 0;
    const computedCurrentPot = calculateDynamicPot(guaranteed, entryFee, existingParticipants, poolPercent);
    const fullHousePot = calculateDynamicPot(guaranteed, entryFee, maxP, poolPercent);

    const prizeLabel =
      fullHousePot > 0
        ? `${fullHousePot.toLocaleString('en-US')} Monedas`
        : currentEvent.prize_pool || 'Premios + XP';

    const payload: Record<string, any> = {
      title: currentEvent.title?.trim() || 'Torneo Kasino21',
      description: currentEvent.description || '',
      rules: currentEvent.rules || DEFAULT_RULES_TEMPLATE,
      type: 'torneo',
      status: currentEvent.status || 'upcoming',
      tournament_format: format,
      auto_recreate: format === 'sit_and_go' ? Boolean(currentEvent.auto_recreate) : false,
      check_in_window_minutes: format === 'scheduled' ? Number(currentEvent.check_in_window_minutes ?? 15) : 0,
      start_date: startDate,
      end_date: endDate,
      entry_fee: entryFee,
      guaranteed_prize_coins: guaranteed,
      current_prize_coins: computedCurrentPot,
      entry_pool_percent: poolPercent,
      prize_pool: prizeLabel,
      prize_tiers: selectedTiers,
      reward_xp_winner: Math.max(0, Number(currentEvent.reward_xp_winner ?? 300)),
      reward_xp_podium: Math.max(0, Number(currentEvent.reward_xp_podium ?? 150)),
      reward_xp_participation: Math.max(0, Number(currentEvent.reward_xp_participation ?? 40)),
      reward_store_item_id: currentEvent.reward_store_item_id || null,
      final_best_of: currentEvent.final_best_of === 3 ? 3 : 1,
      min_elo: Math.max(0, Number(currentEvent.min_elo) || 0),
      max_participants: maxP,
      image_url: currentEvent.image_url || '',
      audio_url: currentEvent.audio_url || null,
      board_theme_url: currentEvent.board_theme_url || null,
      is_sponsored: Boolean(currentEvent.is_sponsored),
      sponsor_name: currentEvent.is_sponsored ? currentEvent.sponsor_name || null : null,
      sponsor_logo_url: currentEvent.is_sponsored ? currentEvent.sponsor_logo_url || null : null,
      sponsor_banner_url: currentEvent.is_sponsored ? currentEvent.sponsor_banner_url || null : null,
      brand_theme: currentEvent.is_sponsored ? currentEvent.brand_theme || null : null,
      cash_prize_pool: CASH_PRIZES_ENABLED && currentEvent.is_sponsored ? Number(currentEvent.cash_prize_pool || 0) : 0,
    };

    if (currentEvent.id) {
      const { error: updErr } = await supabase.from('events').update(payload).eq('id', currentEvent.id);
      if (updErr) {
        setError(updErr.message);
      } else {
        setIsEditing(false);
        showNotice('Torneo actualizado correctamente.');
        fetchEvents();
      }
    } else {
      const { error: insErr } = await supabase.from('events').insert([payload]);
      if (insErr) {
        setError(insErr.message);
      } else {
        setIsEditing(false);
        showNotice('Torneo creado y publicado.');
        fetchEvents();
      }
    }
  };

  const handleConfirmManualStart = async () => {
    if (!confirmStartEvent) return;
    setStartBusy(true);
    setError('');
    const res = await adminStartTournamentApi(confirmStartEvent.id, skipCheckInOnManualStart);
    setStartBusy(false);
    setConfirmStartEvent(null);

    if (!res.success) {
      setError(res.error || 'No se pudieron generar las llaves.');
      return;
    }

    if (res.cancelled) {
      showNotice('Torneo cancelado automáticamente por falta de inscritos (entradas reembolsadas).');
    } else {
      showNotice(
        `Llaves generadas en el servidor (${res.activePlayers} jugadores activos, ${res.matchesCount} partidos).`
      );
    }
    fetchEvents();
  };

  const handleDelete = async (ev: AdminEventData) => {
    if (!window.confirm(`¿Eliminar el torneo "${ev.title}"?`)) return;
    const { error: delErr } = await supabase.from('events').delete().eq('id', ev.id);
    if (delErr) setError(delErr.message);
    else {
      showNotice('Torneo eliminado.');
      fetchEvents();
    }
  };

  const handleViewParticipants = async (eventId: string) => {
    setSelectedEventId(eventId);
    setParticipantsModalOpen(true);
    setParticipantsLoading(true);

    const { data, error: partErr } = await supabase
      .from('event_entries')
      .select(
        'id, player_id, checked_in, final_placement, coins_awarded, joined_at, profiles!inner(id, username, avatar_url, elo, wins, losses)'
      )
      .eq('event_id', eventId)
      .order('joined_at', { ascending: true });

    if (partErr) {
      setError('Error al cargar participantes: ' + partErr.message);
    } else {
      setCurrentEventParticipants(data || []);
    }
    setParticipantsLoading(false);
  };

  const handleKickParticipant = async (playerId: string, playerName: string) => {
    if (!selectedEventId) return;
    if (!window.confirm(`¿Retirar a ${playerName} y reembolsar automáticamente su entrada?`)) return;

    setParticipantsLoading(true);
    const res = await adminKickTournamentPlayerApi(selectedEventId, playerId);
    setParticipantsLoading(false);

    if (!res.success) {
      setError(res.error || 'No se pudo retirar al jugador.');
      return;
    }

    setCurrentEventParticipants((prev) => prev.filter((p) => p.player_id !== playerId));
    showNotice(`Jugador ${playerName} retirado con reembolso aplicado.`);
    fetchEvents();
  };

  const handleAdminBracketView = async (event: AdminEventData) => {
    setSelectedTournament(event);
    setBracketModalOpen(true);
    setMatchesLoading(true);

    if (event.audio_url) {
      startUrlLoop('event-bracket-audio', event.audio_url);
    }

    const { data, error: mErr } = await supabase
      .from('tournament_matches')
      .select(`
        id, round_number, match_order, status, winner_id,
        player1_id, player2_id, game_room_id, best_of, series_game, series_id,
        walkover_reason, waiting_player_id, waiting_since
      `)
      .eq('event_id', event.id);

    if (!mErr && data) {
      const playerIds = Array.from(
        new Set(data.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean))
      );

      const profiles: Record<string, any> = {};
      if (playerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, equipped_avatar')
          .in('id', playerIds);

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
          status: m.status === 'ready' || m.status === 'playing' ? 'live' : m.status === 'completed' || m.status === 'no_show' ? 'completed' : 'pending',
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
    }

    setMatchesLoading(false);
  };

  const handleResolveMatchAction = async (action: 'force_p1' | 'force_p2' | 'reset') => {
    if (!resolvingMatch || !selectedTournament) return;
    setResolveBusy(true);
    const res = await adminResolveTournamentMatchApi(resolvingMatch.id, action);
    setResolveBusy(false);

    if (!res.success) {
      setError(res.error || 'No se pudo resolver el partido.');
      return;
    }

    setResolvingMatch(null);
    showNotice('Partido actualizado y avance/premiación sincronizados en el servidor.');
    await handleAdminBracketView(selectedTournament);
    fetchEvents();
  };

  // Valores para vista previa económica en vivo dentro del formulario
  const previewMaxPlayers = currentEvent.max_participants || 8;
  const previewEntryFee = Math.max(0, Number(currentEvent.entry_fee) || 0);
  const previewGuaranteed = Math.max(0, Number(currentEvent.guaranteed_prize_coins) || 0);
  const previewPoolPercent = Math.min(100, Math.max(0, Number(currentEvent.entry_pool_percent ?? 90)));
  const previewFullPot = calculateDynamicPot(
    previewGuaranteed,
    previewEntryFee,
    previewMaxPlayers,
    previewPoolPercent
  );
  const previewSinkCoins =
    previewEntryFee * previewMaxPlayers - Math.floor((previewEntryFee * previewPoolPercent) / 100) * previewMaxPlayers;
  const previewGroups = buildPrizeDisplayGroups(
    previewFullPot,
    PRIZE_TIER_PRESETS[tierPreset]?.tiers,
    previewMaxPlayers
  );

  return (
    <div className="w-full text-white animate-fade-in flex flex-col h-full">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6 shrink-0">
        <h2 className="text-2xl font-black uppercase tracking-wider text-casino-gold">
          Panel Administrativo
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-black/40 p-1 rounded-xl flex flex-wrap gap-1 border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'events' ? 'bg-casino-gold text-black' : 'text-white/75 hover:text-white'
              }`}
            >
              Torneos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('store')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'store' ? 'bg-purple-500/30 text-purple-200' : 'text-white/75 hover:text-white'
              }`}
            >
              Tienda
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('quests')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'quests' ? 'bg-blue-500/30 text-blue-200' : 'text-white/75 hover:text-white'
              }`}
            >
              Misiones
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ads')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'ads' ? 'bg-amber-500/30 text-amber-200' : 'text-white/75 hover:text-white'
              }`}
            >
              Anuncios
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audio')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === 'audio' ? 'bg-pink-500/30 text-pink-200' : 'text-white/75 hover:text-white'
              }`}
            >
              Audio
            </button>
            {CASH_PRIZES_ENABLED && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('prizes')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeTab === 'prizes' ? 'bg-emerald-500/30 text-emerald-200' : 'text-white/75 hover:text-white'
                  }`}
                >
                  Premios ($)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('championship')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                    activeTab === 'championship' ? 'bg-casino-gold/25 text-casino-gold' : 'text-white/75 hover:text-white'
                  }`}
                >
                  Championship
                </button>
              </>
            )}
          </div>

          {activeTab === 'events' && !isEditing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCreateForm('sit_and_go')}
                className="bg-casino-gold hover:bg-yellow-400 text-black px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>+ Sit &amp; Go</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateForm('scheduled')}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors inline-flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>+ Programado</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-slate-900 text-rose-300 border border-rose-500/50 p-3.5 rounded-xl mb-4 text-xs font-bold flex justify-between items-center shrink-0">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} className="px-2 text-slate-300 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div className="bg-slate-900 text-emerald-300 border border-emerald-400/40 p-3.5 rounded-xl mb-4 text-xs font-bold shrink-0">
          {notice}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {activeTab === 'events' ? (
          <>
            {isEditing ? (
              <div className="rounded-2xl bg-slate-900/90 p-6 border border-white/10 mb-8 space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="text-xl font-black text-white">
                      {currentEvent.id ? 'Editar Torneo' : 'Configurar Nuevo Torneo 2.0'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Llaves generadas en el servidor con seeding por ELO, auto-byes y distribución automática de premios.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5"
                  >
                    Volver a lista
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                  {/* 1. Selector de Formato */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentEvent((prev) => ({
                          ...prev,
                          tournament_format: 'sit_and_go',
                          auto_recreate: prev.auto_recreate ?? true,
                        }))
                      }
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        currentEvent.tournament_format === 'sit_and_go'
                          ? 'bg-slate-800 border-casino-gold'
                          : 'bg-black/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-black text-casino-gold uppercase">
                        <Zap className="w-4 h-4" />
                        <span>⚡ Sit &amp; Go Rápido</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Inicia automáticamente apenas se llena el último cupo. Ideal para colas rápidas de 4 u 8 jugadores.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentEvent((prev) => ({
                          ...prev,
                          tournament_format: 'scheduled',
                          auto_recreate: false,
                        }))
                      }
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        currentEvent.tournament_format !== 'sit_and_go'
                          ? 'bg-slate-800 border-cyan-400'
                          : 'bg-black/40 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-black text-cyan-300 uppercase">
                        <Calendar className="w-4 h-4" />
                        <span>📅 Torneo Programado</span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Abre Check-in automático antes de la hora de inicio y reembolsa a quienes no confirmen asistencia.
                      </p>
                    </button>
                  </div>

                  {/* 2. Datos Generales y Estructura de Llave */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="event-title" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Título del Torneo
                      </label>
                      <input
                        id="event-title"
                        required
                        type="text"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm"
                        value={currentEvent.title || ''}
                        onChange={(e) => setCurrentEvent({ ...currentEvent, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <label htmlFor="event-status" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Estado
                      </label>
                      <select
                        id="event-status"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm"
                        value={currentEvent.status || 'upcoming'}
                        onChange={(e) => setCurrentEvent({ ...currentEvent, status: e.target.value as any })}
                      >
                        <option value="draft">Borrador (Oculto)</option>
                        <option value="upcoming">Abierto a Inscripciones</option>
                        <option value="live">En Curso</option>
                        <option value="completed">Finalizado</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="event-max-participants"
                        className="block text-xs font-bold text-slate-300 uppercase mb-1"
                      >
                        Tamaño del Cuadro (Llave)
                      </label>
                      <select
                        id="event-max-participants"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm"
                        value={currentEvent.max_participants || 8}
                        onChange={(e) => {
                          const nextMax = parseInt(e.target.value, 10);
                          setCurrentEvent({ ...currentEvent, max_participants: nextMax });
                          if (nextMax === 4) setTierPreset('top2');
                          else if (nextMax === 8) setTierPreset('top4');
                        }}
                      >
                        {VALID_BRACKET_SIZES.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz} Jugadores ({sz === 4 ? 'Semis + Final' : sz === 8 ? '3 Rondas' : sz === 16 ? '4 Rondas' : '5 Rondas'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="event-final-bo" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Formato de la Gran Final
                      </label>
                      <select
                        id="event-final-bo"
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm"
                        value={currentEvent.final_best_of || 1}
                        onChange={(e) =>
                          setCurrentEvent({ ...currentEvent, final_best_of: parseInt(e.target.value, 10) })
                        }
                      >
                        <option value={1}>Mejor de 1 (Partida única rápida)</option>
                        <option value={3}>Mejor de 3 (Serie de hasta 3 juegos)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="event-min-elo" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        ELO Mínimo Requerido
                      </label>
                      <input
                        id="event-min-elo"
                        type="number"
                        min={0}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm"
                        value={currentEvent.min_elo ?? 0}
                        onChange={(e) =>
                          setCurrentEvent({ ...currentEvent, min_elo: parseInt(e.target.value, 10) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {/* Opciones específicas por formato */}
                  {currentEvent.tournament_format === 'sit_and_go' ? (
                    <div className="rounded-xl bg-black/40 border border-casino-gold/25 p-4 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-casino-gold block">
                          🔄 Cola Continua 24/7 (Auto-recrear mesa)
                        </span>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Al llenarse e iniciar esta mesa, el servidor abrirá automáticamente una nueva mesa idéntica en el Lobby.
                        </p>
                      </div>
                      <input
                        id="event-auto-recreate"
                        aria-label="Auto-recrear mesa Sit & Go"
                        type="checkbox"
                        checked={Boolean(currentEvent.auto_recreate)}
                        onChange={(e) => setCurrentEvent({ ...currentEvent, auto_recreate: e.target.checked })}
                        className="w-5 h-5 accent-amber-400 rounded cursor-pointer shrink-0"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-black/40 border border-cyan-500/25 p-4">
                      <div>
                        <label
                          htmlFor="event-start-date"
                          className="block text-xs font-bold text-cyan-300 uppercase mb-1"
                        >
                          Fecha y Hora de Inicio
                        </label>
                        <input
                          id="event-start-date"
                          type="datetime-local"
                          required
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm [color-scheme:dark]"
                          value={currentEvent.start_date || ''}
                          onChange={(e) => setCurrentEvent({ ...currentEvent, start_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="event-end-date"
                          className="block text-xs font-bold text-slate-300 uppercase mb-1"
                        >
                          Fecha Estimada de Cierre
                        </label>
                        <input
                          id="event-end-date"
                          type="datetime-local"
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm [color-scheme:dark]"
                          value={currentEvent.end_date || ''}
                          onChange={(e) => setCurrentEvent({ ...currentEvent, end_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="event-checkin-window"
                          className="block text-xs font-bold text-cyan-300 uppercase mb-1"
                        >
                          Ventana Previa de Check-in
                        </label>
                        <select
                          id="event-checkin-window"
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm"
                          value={currentEvent.check_in_window_minutes ?? 15}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              check_in_window_minutes: parseInt(e.target.value, 10),
                            })
                          }
                        >
                          <option value={0}>Sin Check-in (Todos entran directo)</option>
                          <option value={10}>10 minutos antes</option>
                          <option value={15}>15 minutos antes (Recomendado)</option>
                          <option value={30}>30 minutos antes</option>
                          <option value={60}>60 minutos antes</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* 3. Economía Dinámica y Premiación Escalonada */}
                  <div className="rounded-2xl bg-black/45 border border-casino-gold/30 p-5 space-y-5">
                    <div className="flex items-center gap-2">
                      <Coins className="w-5 h-5 text-casino-gold" />
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">
                        Pozo Dinámico y Reparto de Recompensas
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label
                          htmlFor="event-entry-fee"
                          className="block text-xs font-bold text-slate-300 uppercase mb-1"
                        >
                          Entrada (Monedas)
                        </label>
                        <input
                          id="event-entry-fee"
                          type="number"
                          min={0}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                          value={currentEvent.entry_fee ?? 0}
                          onChange={(e) =>
                            setCurrentEvent({ ...currentEvent, entry_fee: parseInt(e.target.value, 10) || 0 })
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="event-guaranteed-coins"
                          className="block text-xs font-bold text-slate-300 uppercase mb-1"
                        >
                          Base Garantizada (Casa/Sponsor)
                        </label>
                        <input
                          id="event-guaranteed-coins"
                          type="number"
                          min={0}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                          value={currentEvent.guaranteed_prize_coins ?? 0}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              guaranteed_prize_coins: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="event-pool-percent"
                          className="block text-xs font-bold text-slate-300 uppercase mb-1"
                        >
                          % de Entradas al Pozo
                        </label>
                        <input
                          id="event-pool-percent"
                          type="number"
                          min={0}
                          max={100}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                          value={currentEvent.entry_pool_percent ?? 90}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              entry_pool_percent: Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)),
                            })
                          }
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="event-tier-preset"
                          className="block text-xs font-bold text-slate-300 uppercase mb-1"
                        >
                          Estructura de Premios
                        </label>
                        <select
                          id="event-tier-preset"
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm"
                          value={tierPreset}
                          onChange={(e) => setTierPreset(e.target.value as PrizeTierPresetKey)}
                        >
                          {(Object.keys(PRIZE_TIER_PRESETS) as PrizeTierPresetKey[]).map((k) => (
                            <option key={k} value={k}>
                              {PRIZE_TIER_PRESETS[k].label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* XP & Cosmético Exclusivo */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      <div>
                        <label htmlFor="xp-winner" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                          XP Campeón (1.º)
                        </label>
                        <input
                          id="xp-winner"
                          type="number"
                          min={0}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                          value={currentEvent.reward_xp_winner ?? 300}
                          onChange={(e) =>
                            setCurrentEvent({ ...currentEvent, reward_xp_winner: parseInt(e.target.value, 10) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="xp-podium" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                          XP Podio (2.º-4.º)
                        </label>
                        <input
                          id="xp-podium"
                          type="number"
                          min={0}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                          value={currentEvent.reward_xp_podium ?? 150}
                          onChange={(e) =>
                            setCurrentEvent({ ...currentEvent, reward_xp_podium: parseInt(e.target.value, 10) || 0 })
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="xp-part" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                          XP Participación
                        </label>
                        <input
                          id="xp-part"
                          type="number"
                          min={0}
                          className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                          value={currentEvent.reward_xp_participation ?? 40}
                          onChange={(e) =>
                            setCurrentEvent({
                              ...currentEvent,
                              reward_xp_participation: parseInt(e.target.value, 10) || 0,
                            })
                          }
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="reward-store-item"
                          className="block text-xs font-bold text-purple-300 uppercase mb-1"
                        >
                          Cosmético Campeón (Opcional)
                        </label>
                        <select
                          id="reward-store-item"
                          className="w-full bg-black/60 border border-purple-400/30 rounded-xl px-3 py-2 text-white text-sm"
                          value={currentEvent.reward_store_item_id || ''}
                          onChange={(e) =>
                            setCurrentEvent({ ...currentEvent, reward_store_item_id: e.target.value || null })
                          }
                        >
                          <option value="">— Sin cosmético extra —</option>
                          {storeItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} ({item.category || 'item'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Simulador en vivo del Pozo */}
                    <div className="rounded-xl bg-slate-900 border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                          Simulación con Mesa Llena ({previewMaxPlayers}/{previewMaxPlayers} Jugadores)
                        </span>
                        <p className="text-lg font-black text-casino-gold font-mono">
                          Pozo Total: 🪙 {previewFullPot.toLocaleString('es-ES')} Monedas
                        </p>
                        {previewSinkCoins > 0 && (
                          <p className="text-[11px] text-slate-300">
                            Comisión anti-inflación quemada por mesa: {previewSinkCoins.toLocaleString('es-ES')} 🪙
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {previewGroups.map((g) => (
                          <div
                            key={g.label}
                            className="px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 text-xs"
                          >
                            <span className="text-slate-300 font-bold">{g.label}: </span>
                            <span className="text-casino-gold font-black font-mono">
                              {g.coinsEach.toLocaleString('es-ES')} 🪙
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Multimedia y Patrocinador */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="event-image-url" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Imagen de Portada
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="event-image-url"
                          type="text"
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                          placeholder="URL o subir"
                          value={currentEvent.image_url || ''}
                          onChange={(e) => setCurrentEvent({ ...currentEvent, image_url: e.target.value })}
                        />
                        <label className="shrink-0 bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold">
                          {isUploading ? '...' : '📁'}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'image')}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="event-audio-url" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Música de Llaves
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="event-audio-url"
                          type="text"
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                          placeholder="URL o subir"
                          value={currentEvent.audio_url || ''}
                          onChange={(e) => setCurrentEvent({ ...currentEvent, audio_url: e.target.value })}
                        />
                        <label className="shrink-0 bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold">
                          {isUploading ? '...' : '🎵'}
                          <input
                            type="file"
                            className="hidden"
                            accept="audio/*"
                            onChange={(e) => handleFileUpload(e, 'audio')}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="event-board-theme-url"
                        className="block text-xs font-bold text-slate-300 uppercase mb-1"
                      >
                        Tapete Personalizado
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          id="event-board-theme-url"
                          type="text"
                          className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                          placeholder="URL textura"
                          value={currentEvent.board_theme_url || ''}
                          onChange={(e) => setCurrentEvent({ ...currentEvent, board_theme_url: e.target.value })}
                        />
                        <label className="shrink-0 bg-white/10 hover:bg-white/15 border border-white/10 px-3 py-2 rounded-xl cursor-pointer text-xs font-bold">
                          {isUploading ? '...' : '🧵'}
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'boardTheme')}
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Patrocinador de Marca */}
                  <div className="rounded-2xl bg-black/40 border border-white/10 p-4 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        id="event-is-sponsored"
                        type="checkbox"
                        checked={Boolean(currentEvent.is_sponsored)}
                        onChange={(e) => setCurrentEvent({ ...currentEvent, is_sponsored: e.target.checked })}
                        className="w-5 h-5 accent-amber-500 rounded"
                      />
                      <div>
                        <span className="text-xs font-black text-casino-gold uppercase tracking-wider block">
                          ★ Torneo Patrocinado por Marca
                        </span>
                        <p className="text-xs text-slate-300">
                          Muestra logo, banner y color oficial del patrocinador con pozo garantizado de monedas y cosméticos.
                        </p>
                      </div>
                    </label>

                    {currentEvent.is_sponsored && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            Nombre del Patrocinador
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Red Bull, Marca Aliada"
                            className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm"
                            value={currentEvent.sponsor_name || ''}
                            onChange={(e) => setCurrentEvent({ ...currentEvent, sponsor_name: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            Color Principal de Marca
                          </label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="color"
                              className="w-10 h-9 bg-transparent border-0 rounded cursor-pointer"
                              value={currentEvent.brand_theme?.primaryColor || '#f59e0b'}
                              onChange={(e) =>
                                setCurrentEvent({
                                  ...currentEvent,
                                  brand_theme: { ...currentEvent.brand_theme, primaryColor: e.target.value },
                                })
                              }
                            />
                            <input
                              type="text"
                              className="flex-1 bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm font-mono"
                              value={currentEvent.brand_theme?.primaryColor || '#f59e0b'}
                              onChange={(e) =>
                                setCurrentEvent({
                                  ...currentEvent,
                                  brand_theme: { ...currentEvent.brand_theme, primaryColor: e.target.value },
                                })
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            URL Logo del Sponsor
                          </label>
                          <input
                            type="text"
                            placeholder="https://.../logo.png"
                            className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm"
                            value={currentEvent.sponsor_logo_url || ''}
                            onChange={(e) => setCurrentEvent({ ...currentEvent, sponsor_logo_url: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                            URL Banner del Sponsor
                          </label>
                          <input
                            type="text"
                            placeholder="https://.../banner.png"
                            className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-white text-sm"
                            value={currentEvent.sponsor_banner_url || ''}
                            onChange={(e) => setCurrentEvent({ ...currentEvent, sponsor_banner_url: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Descripción y Reglas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="event-description" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Descripción Corta
                      </label>
                      <textarea
                        id="event-description"
                        required
                        rows={3}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
                        value={currentEvent.description || ''}
                        onChange={(e) => setCurrentEvent({ ...currentEvent, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="event-rules" className="block text-xs font-bold text-slate-300 uppercase mb-1">
                        Reglas del Torneo
                      </label>
                      <textarea
                        id="event-rules"
                        required
                        rows={3}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs"
                        value={currentEvent.rules || ''}
                        onChange={(e) => setCurrentEvent({ ...currentEvent, rules: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-white/10 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-casino-gold text-black hover:bg-yellow-400 transition-colors"
                    >
                      Guardar Torneo
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900/80 border border-white/10 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead>
                      <tr className="bg-black/45 border-b border-white/10 text-xs uppercase tracking-wider text-slate-300">
                        <th className="p-4 font-black">Torneo</th>
                        <th className="p-4 font-black">Formato</th>
                        <th className="p-4 font-black">Estado</th>
                        <th className="p-4 font-black">Pozo Actual</th>
                        <th className="p-4 font-black text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-300">
                            Cargando torneos...
                          </td>
                        </tr>
                      ) : events.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-300">
                            No hay torneos creados. Usa los botones superiores para lanzar un Sit &amp; Go o Torneo Programado.
                          </td>
                        </tr>
                      ) : (
                        events.map((ev) => {
                          const isSng = ev.tournament_format === 'sit_and_go';
                          const pot =
                            (ev.current_prize_coins ?? 0) > 0
                              ? ev.current_prize_coins!
                              : calculateDynamicPot(
                                  ev.guaranteed_prize_coins ?? 0,
                                  ev.entry_fee ?? 0,
                                  ev.participants_count ?? 0,
                                  ev.entry_pool_percent ?? 90
                                );
                          return (
                            <tr
                              key={ev.id}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                              <td className="p-4">
                                <div className="font-bold text-white flex items-center gap-2 flex-wrap">
                                  <span>{ev.title}</span>
                                  {ev.auto_recreate && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-casino-gold/15 text-casino-gold border border-casino-gold/30 font-black">
                                      🔄 24/7
                                    </span>
                                  )}
                                  {ev.reward_store_item_id && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 font-bold inline-flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5" /> Skin
                                    </span>
                                  )}
                                  {ev.is_sponsored && (
                                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                      ★ {ev.sponsor_name || 'Sponsor'}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-300">
                                  Entrada: {ev.entry_fee > 0 ? `${ev.entry_fee} 🪙` : 'Gratis'} · Cuadro de{' '}
                                  {ev.max_participants}J
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="bg-white/10 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-200">
                                  {isSng ? '⚡ Sit & Go' : '📅 Programado'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                                    ev.status === 'live'
                                      ? 'text-red-300 bg-red-500/20'
                                      : ev.status === 'upcoming'
                                      ? 'text-cyan-300 bg-cyan-500/20'
                                      : ev.status === 'draft'
                                      ? 'text-slate-300 bg-white/10'
                                      : 'text-emerald-300 bg-emerald-500/20'
                                  }`}
                                >
                                  {ev.status}
                                </span>
                              </td>
                              <td className="p-4 text-sm font-mono font-bold text-casino-gold">
                                {pot > 0 ? `🪙 ${pot.toLocaleString('es-ES')}` : ev.prize_pool}
                              </td>
                              <td className="p-4 text-right">
                                <div className="inline-flex flex-wrap justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleViewParticipants(ev.id)}
                                    className="text-xs bg-blue-500/20 text-blue-300 hover:bg-blue-500/35 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                  >
                                    👥 {ev.participants_count}/{ev.max_participants}
                                  </button>

                                  {ev.status === 'upcoming' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setConfirmStartEvent(ev);
                                        setSkipCheckInOnManualStart(true);
                                      }}
                                      className="text-xs bg-casino-gold text-black hover:bg-yellow-400 px-3 py-1.5 rounded-lg font-black transition-colors"
                                    >
                                      Iniciar Ahora
                                    </button>
                                  )}

                                  {(ev.status === 'live' || ev.status === 'completed') && (
                                    <button
                                      type="button"
                                      onClick={() => handleAdminBracketView(ev)}
                                      className="text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/35 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                    >
                                      Admin Llaves
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => openEditForm(ev)}
                                    className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(ev)}
                                    className="text-xs bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 px-3 py-1.5 rounded-lg font-bold transition-colors"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Confirmar Inicio Manual de Torneo */}
            {confirmStartEvent && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => !startBusy && setConfirmStartEvent(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl bg-slate-900 border border-casino-gold/40 p-6 space-y-4 shadow-2xl"
                >
                  <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-casino-gold" />
                    <h3 className="text-lg font-black text-white">Iniciar Torneo en el Servidor</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Se generarán las llaves de <strong>{confirmStartEvent.title}</strong> con seeding por ELO y avance automático de Byes ({confirmStartEvent.participants_count} inscritos actuales).
                  </p>

                  {confirmStartEvent.tournament_format !== 'sit_and_go' && confirmStartEvent.check_in_enabled && (
                    <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-white/10 cursor-pointer text-xs text-slate-200">
                      <input
                        type="checkbox"
                        checked={skipCheckInOnManualStart}
                        onChange={(e) => setSkipCheckInOnManualStart(e.target.checked)}
                        className="w-4 h-4 accent-amber-400"
                      />
                      <span>Incluir también a inscritos que aún no hayan pulsado Check-in</span>
                    </label>
                  )}

                  <div className="flex gap-2.5 justify-end pt-2">
                    <button
                      type="button"
                      disabled={startBusy}
                      onClick={() => setConfirmStartEvent(null)}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/15"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={startBusy}
                      onClick={handleConfirmManualStart}
                      className="px-5 py-2.5 rounded-xl text-xs font-black uppercase bg-casino-gold text-black hover:bg-yellow-400 disabled:opacity-50"
                    >
                      {startBusy ? 'Generando...' : 'Generar Llaves e Iniciar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Participantes */}
            {participantsModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => setParticipantsModalOpen(false)}
              >
                <div
                  className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <div>
                      <h3 className="text-xs font-bold text-casino-gold uppercase tracking-widest mb-1">
                        Participantes Inscritos
                      </h3>
                      <h2 className="text-xl font-black text-white">Gestión y Reembolsos</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setParticipantsModalOpen(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {participantsLoading ? (
                      <div className="text-center py-8 text-slate-300 font-bold uppercase tracking-widest">
                        Cargando...
                      </div>
                    ) : currentEventParticipants.length === 0 ? (
                      <div className="text-center py-8 text-slate-300 font-bold uppercase tracking-widest">
                        No hay inscritos todavía
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {currentEventParticipants.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between bg-black/40 border border-white/10 p-3 rounded-xl gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center shrink-0">
                                {p.profiles?.avatar_url ? (
                                  <img
                                    src={p.profiles.avatar_url}
                                    alt={p.profiles.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="font-bold text-white">
                                    {p.profiles?.username?.charAt(0).toUpperCase() || 'J'}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-white flex items-center gap-2">
                                  <span className="truncate">{p.profiles?.username || 'Jugador'}</span>
                                  {p.checked_in && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                                      ✓ Check-in
                                    </span>
                                  )}
                                  {p.final_placement && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-casino-gold/20 text-casino-gold border border-casino-gold/30">
                                      #{p.final_placement} (+{p.coins_awarded || 0} 🪙)
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-3 text-xs text-slate-300">
                                  <span>ELO: {p.profiles?.elo || 1000}</span>
                                  <span className="text-emerald-300">V: {p.profiles?.wins || 0}</span>
                                  <span className="text-rose-300">D: {p.profiles?.losses || 0}</span>
                                </div>
                              </div>
                            </div>

                            {events.find((ev) => ev.id === selectedEventId)?.status === 'upcoming' && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleKickParticipant(p.player_id, p.profiles?.username || 'Jugador')
                                }
                                className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/35 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0"
                              >
                                Retirar + Reembolso
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-white/10 text-right">
                    <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                      Total: {currentEventParticipants.length}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Bracket Modal */}
            {bracketModalOpen && selectedTournament && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in"
                onClick={() => {
                  setBracketModalOpen(false);
                  stopLoop('event-bracket-audio');
                }}
              >
                <div
                  className="bg-slate-950 w-full max-w-7xl rounded-3xl border border-emerald-500/35 overflow-hidden flex flex-col max-h-[95vh] relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 sm:p-6 border-b border-white/10 bg-slate-900 flex justify-between items-center shrink-0 gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest mb-0.5">
                        Control Administrativo de Llaves
                      </h3>
                      <h2 className="text-lg sm:text-2xl font-black text-white truncate">
                        {selectedTournament.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBracketModalOpen(false);
                        stopLoop('event-bracket-audio');
                      }}
                      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-4">
                    {matchesLoading ? (
                      <div className="flex items-center justify-center h-48 text-emerald-300 font-bold uppercase tracking-widest text-sm">
                        Cargando llaves...
                      </div>
                    ) : tournamentMatches.length === 0 ? (
                      <div className="flex items-center justify-center h-48 text-slate-300 font-bold uppercase tracking-widest text-sm">
                        Las llaves aún no se han generado
                      </div>
                    ) : (
                      <TournamentBracket
                        matches={tournamentMatches}
                        title={selectedTournament.title}
                        maxParticipants={selectedTournament.max_participants}
                        onJoinMatch={(m) => setResolvingMatch(m)}
                        currentUserId={null}
                        isAdmin={true}
                        prizePool={selectedTournament.prize_pool}
                      />
                    )}
                  </div>

                  <div className="p-4 border-t border-white/10 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-slate-300">
                      Haz clic sobre cualquier partido activo para forzar el avance de un jugador o reiniciar la sala. Si resuelves la Gran Final, el servidor distribuirá automáticamente todos los premios.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setBracketModalOpen(false);
                        stopLoop('event-bracket-audio');
                      }}
                      className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl uppercase tracking-wider text-xs shrink-0"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Resolución Administrativa de Partido */}
            {resolvingMatch && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => !resolveBusy && setResolvingMatch(null)}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-400/40 p-6 space-y-4 shadow-2xl"
                >
                  <h3 className="text-lg font-black text-white">
                    Resolver Partido #{resolvingMatch.position}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Sala actual: <span className="font-mono text-white">{resolvingMatch.game_room_id || 'N/A'}</span>
                  </p>

                  <div className="flex flex-col gap-2.5">
                    {resolvingMatch.player1 && (
                      <button
                        type="button"
                        disabled={resolveBusy}
                        onClick={() => handleResolveMatchAction('force_p1')}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        🏆 Avanzar a {resolvingMatch.player1.name}
                      </button>
                    )}

                    {resolvingMatch.player2 && (
                      <button
                        type="button"
                        disabled={resolveBusy}
                        onClick={() => handleResolveMatchAction('force_p2')}
                        className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                      >
                        🏆 Avanzar a {resolvingMatch.player2.name}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={resolveBusy}
                      onClick={() => handleResolveMatchAction('reset')}
                      className="w-full py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/35 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
                    >
                      🔄 Reiniciar Sala y Temporizador
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={resolveBusy}
                    onClick={() => setResolvingMatch(null)}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        ) : activeTab === 'store' ? (
          <StoreAdmin />
        ) : activeTab === 'quests' ? (
          <QuestManager />
        ) : activeTab === 'ads' ? (
          <AdManagerAdmin />
        ) : activeTab === 'audio' ? (
          <AudioAdmin />
        ) : CASH_PRIZES_ENABLED && activeTab === 'championship' ? (
          <ChampionshipAdmin />
        ) : CASH_PRIZES_ENABLED && activeTab === 'prizes' ? (
          <PendingPrizesAdmin />
        ) : null}
      </div>
    </div>
  );
}
