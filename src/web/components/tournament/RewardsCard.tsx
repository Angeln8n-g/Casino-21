import React, { useEffect, useState } from 'react';
import { Sparkles, Coins, Award, Trophy } from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  PrizeTier,
  buildPrizeDisplayGroups,
  calculateDynamicPot,
  parseLegacyCoinPool,
} from '../../../domain/tournament';
import type { TournamentMatch } from '../TournamentBracket';

export interface RewardsEventInfo {
  id: string;
  status?: 'draft' | 'upcoming' | 'live' | 'completed';
  prize_pool?: string;
  entry_fee?: number;
  guaranteed_prize_coins?: number;
  current_prize_coins?: number;
  entry_pool_percent?: number;
  participants_count?: number;
  max_participants?: number;
  prize_tiers?: PrizeTier[] | null;
  reward_xp_winner?: number;
  reward_xp_podium?: number;
  reward_xp_participation?: number;
  reward_store_item_id?: string | null;
}

interface RewardsCardProps {
  prizePool?: string;
  event?: RewardsEventInfo;
  matches?: TournamentMatch[];
}

interface ExclusiveStoreItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  rarity?: string | null;
  image_url?: string | null;
}

interface PodiumWinner {
  playerId: string;
  username: string;
  avatar?: string | null;
  place: number;
  coinsAwarded: number;
  xpAwarded: number;
  hasExclusiveItem: boolean;
}

export function RewardsCard({ prizePool = '0 Monedas', event, matches = [] }: RewardsCardProps) {
  const [exclusiveItem, setExclusiveItem] = useState<ExclusiveStoreItem | null>(null);
  const [podiumWinners, setPodiumWinners] = useState<PodiumWinner[]>([]);

  const entryFee = event?.entry_fee ?? 0;
  const poolPercent = event?.entry_pool_percent ?? 90;
  const guaranteed = event?.guaranteed_prize_coins ?? 0;
  const participantsCount = event?.participants_count ?? 0;
  const maxParticipants = event?.max_participants ?? 8;

  const dynamicCalculated = calculateDynamicPot(guaranteed, entryFee, participantsCount, poolPercent);
  const totalPot =
    (event?.current_prize_coins ?? 0) > 0
      ? event!.current_prize_coins!
      : dynamicCalculated > 0
      ? dynamicCalculated
      : parseLegacyCoinPool(event?.prize_pool || prizePool);

  const fullHousePot = calculateDynamicPot(guaranteed, entryFee, maxParticipants, poolPercent);

  const xpWinner = event?.reward_xp_winner ?? 300;
  const xpPodium = event?.reward_xp_podium ?? 150;
  const xpParticipation = event?.reward_xp_participation ?? 40;

  const displayGroups = buildPrizeDisplayGroups(totalPot, event?.prize_tiers, maxParticipants);

  useEffect(() => {
    let mounted = true;
    const itemId = event?.reward_store_item_id;
    if (!itemId) {
      setExclusiveItem(null);
      return;
    }

    supabase
      .from('store_items')
      .select('id, name, description, category, rarity, image_url')
      .eq('id', itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) {
          setExclusiveItem(data as ExclusiveStoreItem);
        }
      });

    return () => {
      mounted = false;
    };
  }, [event?.reward_store_item_id]);

  useEffect(() => {
    let mounted = true;
    if (!event?.id || event.status !== 'completed') {
      setPodiumWinners([]);
      return;
    }

    const loadPodium = async () => {
      const { data: entries } = await supabase
        .from('event_entries')
        .select('player_id, final_placement, coins_awarded, xp_awarded, item_awarded_id')
        .eq('event_id', event.id)
        .not('final_placement', 'is', null)
        .lte('final_placement', 4)
        .order('final_placement', { ascending: true });

      if (!mounted) return;

      if (entries && entries.length > 0) {
        const pIds = entries.map((e) => e.player_id);
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, equipped_avatar')
          .in('id', pIds);

        if (!mounted) return;
        const profMap: Record<string, any> = {};
        for (const p of profs || []) profMap[p.id] = p;

        setPodiumWinners(
          entries.map((e) => ({
            playerId: e.player_id,
            username: profMap[e.player_id]?.username || 'Jugador',
            avatar: profMap[e.player_id]?.equipped_avatar || profMap[e.player_id]?.avatar_url || null,
            place: e.final_placement,
            coinsAwarded: e.coins_awarded || 0,
            xpAwarded: e.xp_awarded || 0,
            hasExclusiveItem: Boolean(e.item_awarded_id),
          }))
        );
        return;
      }

      // Fallback para torneos finalizados antes de la migración v3 (deducido de la ronda final)
      const finalMatches = matches.filter((m) => m.round === 4 && m.status === 'completed');
      const lastFinal = finalMatches[finalMatches.length - 1];
      if (lastFinal && (lastFinal.player1 || lastFinal.player2)) {
        const winner = lastFinal.player1?.isWinner
          ? lastFinal.player1
          : lastFinal.player2?.isWinner
          ? lastFinal.player2
          : null;
        const runnerUp = lastFinal.player1?.isWinner ? lastFinal.player2 : lastFinal.player1;
        const fallbackList: PodiumWinner[] = [];
        if (winner) {
          fallbackList.push({
            playerId: winner.id,
            username: winner.name,
            avatar: winner.avatar,
            place: 1,
            coinsAwarded: displayGroups[0]?.coinsEach ?? totalPot,
            xpAwarded: xpWinner,
            hasExclusiveItem: Boolean(event.reward_store_item_id),
          });
        }
        if (runnerUp) {
          fallbackList.push({
            playerId: runnerUp.id,
            username: runnerUp.name,
            avatar: runnerUp.avatar,
            place: 2,
            coinsAwarded: displayGroups[1]?.coinsEach ?? 0,
            xpAwarded: xpPodium,
            hasExclusiveItem: false,
          });
        }
        setPodiumWinners(fallbackList);
      }
    };

    loadPodium();
    return () => {
      mounted = false;
    };
  }, [event?.id, event?.status, matches.length]);

  const getTierVisuals = (index: number) => {
    if (index === 0) {
      return {
        icon: '🥇',
        xp: xpWinner,
        borderColor: 'border-casino-gold/40',
        bgColor: 'bg-slate-900/85',
        textColor: 'text-casino-gold',
      };
    }
    if (index === 1) {
      return {
        icon: '🥈',
        xp: xpPodium,
        borderColor: 'border-slate-400/30',
        bgColor: 'bg-slate-900/75',
        textColor: 'text-slate-200',
      };
    }
    if (index === 2) {
      return {
        icon: '🥉',
        xp: xpPodium,
        borderColor: 'border-amber-600/30',
        bgColor: 'bg-slate-900/75',
        textColor: 'text-amber-400',
      };
    }
    return {
      icon: '🎖️',
      xp: xpParticipation,
      borderColor: 'border-white/10',
      bgColor: 'bg-slate-900/65',
      textColor: 'text-cyan-300',
    };
  };

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      {/* Podio Oficial si el torneo está completado */}
      {event?.status === 'completed' && podiumWinners.length > 0 && (
        <div className="rounded-2xl border border-casino-gold/35 bg-slate-900/85 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-casino-gold" />
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Podio Oficial de Ganadores
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-400/30">
              Premios Entregados
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {podiumWinners.map((w) => (
              <div
                key={`${w.playerId}-${w.place}`}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                  w.place === 1
                    ? 'bg-black/50 border-casino-gold/40'
                    : 'bg-black/35 border-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 text-sm font-black text-white">
                    {w.avatar ? (
                      <img src={w.avatar} alt={w.username} className="w-full h-full object-cover" />
                    ) : (
                      w.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-casino-gold block">
                      {w.place === 1 ? '🥇 1.º Campeón' : w.place === 2 ? '🥈 2.º Subcampeón' : `🥉 #${w.place} Semifinalista`}
                    </span>
                    <p className="text-sm font-bold text-white truncate">{w.username}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black font-mono text-casino-gold">
                    +{w.coinsAwarded.toLocaleString('es-ES')} 🪙
                  </p>
                  <p className="text-[10px] font-bold text-emerald-300">+{w.xpAwarded} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cabecera de Pozo Dinámico */}
      <div className="rounded-2xl p-6 border border-casino-gold/25 bg-slate-900/80 text-center space-y-2">
        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest block">
          Pozo Acumulado del Torneo
        </span>
        <h3 className="text-3xl font-black text-casino-gold font-display flex items-center justify-center gap-2">
          <Coins className="w-7 h-7 text-casino-gold" />
          <span>{totalPot > 0 ? `${totalPot.toLocaleString('es-ES')} Monedas` : prizePool}</span>
        </h3>

        {entryFee > 0 && (
          <p className="text-xs text-slate-300">
            Base garantizada:{' '}
            <span className="font-bold text-white">{guaranteed.toLocaleString('es-ES')} 🪙</span> · El{' '}
            <span className="font-bold text-emerald-300">{poolPercent}%</span> de cada entrada engorda el pozo
            {event?.status === 'upcoming' && fullHousePot > totalPot && (
              <>
                {' '}
                (Pozo lleno: <span className="font-bold text-casino-gold">{fullHousePot.toLocaleString('es-ES')} 🪙</span>)
              </>
            )}
          </p>
        )}

        <p className="text-[11px] text-slate-300 max-w-md mx-auto pt-1">
          Las monedas, el XP competitivo y las recompensas exclusivas se acreditan automáticamente al concluir la Gran Final.
        </p>
      </div>

      {/* Cosmético Exclusivo del Campeón */}
      {exclusiveItem && (
        <div className="rounded-2xl border border-purple-400/35 bg-slate-900/85 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-purple-500/15 border border-purple-400/30 flex items-center justify-center overflow-hidden shrink-0">
              {exclusiveItem.image_url ? (
                <img src={exclusiveItem.image_url} alt={exclusiveItem.name} className="w-full h-full object-cover" />
              ) : (
                <Sparkles className="w-6 h-6 text-purple-300" />
              )}
            </div>
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-purple-200 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-400/30">
                <Sparkles className="w-3 h-3" />
                Trofeo Exclusivo para el 1.er Lugar
              </span>
              <h4 className="text-base font-black text-white truncate mt-1">{exclusiveItem.name}</h4>
              {exclusiveItem.description && (
                <p className="text-xs text-slate-300 truncate">{exclusiveItem.description}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 shrink-0 hidden sm:inline">
            {exclusiveItem.rarity || 'Exclusivo'}
          </span>
        </div>
      )}

      {/* Desglose exacto por posición */}
      <div className="flex flex-col gap-3">
        {displayGroups.map((group, idx) => {
          const vis = getTierVisuals(idx);
          return (
            <div
              key={group.label}
              className={`rounded-2xl border p-4 flex items-center justify-between gap-4 ${vis.bgColor} ${vis.borderColor}`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="text-3xl shrink-0">{vis.icon}</div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-black uppercase tracking-widest ${vis.textColor}`}>
                      {group.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                      {group.percentEach}% {group.count > 1 ? 'c/u' : 'del pozo'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug mt-0.5">{group.title}</h4>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className={`text-base font-black font-mono block ${vis.textColor}`}>
                  🪙 {group.coinsEach.toLocaleString('es-ES')}
                </span>
                <span className="text-xs font-bold text-emerald-300">
                  +{vis.xp} XP {idx === 0 && exclusiveItem ? '+ Skin' : ''}
                </span>
              </div>
            </div>
          );
        })}

        {/* XP por participación */}
        <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-200 font-semibold">
            <Award className="w-4 h-4 text-emerald-300" />
            <span>Recompensa garantizada por participar y jugar tu llave</span>
          </div>
          <span className="font-black text-emerald-300">+{xpParticipation} XP</span>
        </div>
      </div>
    </div>
  );
}
