import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { FriendProfileModal, FriendForModal } from '../FriendProfileModal';
import { calculateLevelFromXp } from '../ProfileHeader';
import { TournamentHero } from './TournamentHero';
import { TournamentTabs } from './TournamentTabs';
import { TournamentProgress } from './TournamentProgress';
import { TournamentVerticalBracket } from './TournamentVerticalBracket';
import { RewardsCard } from './RewardsCard';
import { TournamentStats } from './TournamentStats';
import { TournamentBracket, TournamentMatch } from '../TournamentBracket';
import {
  calculateDynamicPot,
  parseLegacyCoinPool,
  PrizeTier,
  TournamentFormat,
} from '../../../domain/tournament';

export interface TournamentViewEventData {
  id: string;
  title: string;
  description: string;
  rules: string;
  type: string;
  status: 'draft' | 'upcoming' | 'live' | 'completed';
  tournament_format?: TournamentFormat;
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
  min_elo: number;
  participants_count: number;
  max_participants: number;
  image_url?: string;
  is_sponsored?: boolean;
  sponsor_name?: string | null;
}

interface TournamentViewProps {
  eventId: string;
  event?: TournamentViewEventData;
  matches: TournamentMatch[];
  loading: boolean;
  currentUserId?: string | null;
  isAdmin: boolean;
  inviteCooldowns: Record<string, number>;
  onJoinMatch: (match: TournamentMatch) => void;
  onInviteOpponent: (opponentId: string, match: TournamentMatch) => void;
  onClaimWalkover?: (matchId: string) => void;
  onClose: () => void;
}

type TabType = 'bracket' | 'rewards' | 'stats';

export function TournamentView({
  eventId,
  event,
  matches,
  loading,
  currentUserId,
  isAdmin,
  inviteCooldowns,
  onJoinMatch,
  onInviteOpponent,
  onClaimWalkover,
  onClose,
}: TournamentViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('bracket');
  const [bracketLayout, setBracketLayout] = useState<'tree' | 'list'>('tree');
  const [selectedPlayerProfile, setSelectedPlayerProfile] = useState<FriendForModal | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleViewPlayer = async (playerId: string) => {
    setFetchingProfile(true);
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, equipped_avatar, elo, wins, losses, xp')
        .eq('id', playerId)
        .single();

      if (!error && data) {
        const friendObj: FriendForModal = {
          id: data.id,
          username: data.username || 'Desconocido',
          avatar_url: data.avatar_url,
          equipped_avatar: data.equipped_avatar,
          elo: data.elo || 1000,
          xp: data.xp || 0,
          level: calculateLevelFromXp(data.xp || 0),
          wins: data.wins || 0,
          losses: data.losses || 0,
          isOnline: false,
        };
        setSelectedPlayerProfile(friendObj);
      } else {
        setProfileError('No se pudo cargar el perfil del jugador.');
      }
    } catch {
      setProfileError('Error de conexión al cargar el perfil.');
    } finally {
      setFetchingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-casino-gold/20 border-t-casino-gold rounded-full animate-spin" />
        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
          Cargando detalles del torneo...
        </span>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full text-center py-20">
        <p className="text-slate-300 font-bold">No se encontró información del torneo.</p>
        <button
          type="button"
          onClick={onClose}
          className="btn-gold py-2 px-6 rounded-xl text-xs uppercase tracking-wider mt-4"
        >
          Volver a Torneos
        </button>
      </div>
    );
  }

  const resolvedPotCoins =
    (event.current_prize_coins ?? 0) > 0
      ? event.current_prize_coins!
      : calculateDynamicPot(
          event.guaranteed_prize_coins ?? 0,
          event.entry_fee ?? 0,
          event.participants_count ?? 0,
          event.entry_pool_percent ?? 90
        ) || parseLegacyCoinPool(event.prize_pool);

  const formattedPrizeLabel =
    resolvedPotCoins > 0 ? `${resolvedPotCoins.toLocaleString('es-ES')} Monedas` : event.prize_pool;

  return (
    <div className="w-full space-y-6 text-white pb-10">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 bg-slate-900/80 text-xs font-black text-slate-200 hover:text-white hover:border-casino-gold/30 transition-all select-none"
        >
          ← Volver a Torneos
        </button>
        <span className="text-[10px] text-slate-400 font-mono">ID: {eventId.slice(0, 8)}</span>
      </div>

      {profileError && (
        <div className="px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold">
          {profileError}
        </div>
      )}

      {/* Hero Card */}
      <TournamentHero
        title={event.title}
        status={event.status}
        tournamentFormat={event.tournament_format}
        startDate={event.start_date}
        endDate={event.end_date}
        prizePool={formattedPrizeLabel}
        currentPrizeCoins={event.current_prize_coins}
        guaranteedPrizeCoins={event.guaranteed_prize_coins}
        entryPoolPercent={event.entry_pool_percent}
        entryFee={event.entry_fee}
        participantsCount={event.participants_count}
        maxParticipants={event.max_participants}
        imageUrl={event.image_url}
        sponsorName={event.is_sponsored ? event.sponsor_name : null}
      />

      {/* Round Progression Tracker */}
      <TournamentProgress
        maxParticipants={event.max_participants}
        matches={matches}
        currentUserId={currentUserId}
      />

      {/* Tab Selector */}
      <TournamentTabs activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Content Panel */}
      <div className="mt-6 min-h-[250px]">
        {activeTab === 'bracket' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-900/75 p-2 rounded-2xl border border-white/10">
              <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest pl-2">
                Estructura de la Llave
              </span>
              <div className="flex bg-black/50 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setBracketLayout('tree')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                    bracketLayout === 'tree'
                      ? 'bg-casino-gold text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🌿 Árbol (Visual)
                </button>
                <button
                  type="button"
                  onClick={() => setBracketLayout('list')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                    bracketLayout === 'list'
                      ? 'bg-casino-gold text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  📋 Lista (Rondas)
                </button>
              </div>
            </div>

            {bracketLayout === 'tree' ? (
              <TournamentBracket
                matches={matches}
                title={event.title}
                maxParticipants={event.max_participants}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onJoinMatch={onJoinMatch}
                onInviteOpponent={onInviteOpponent}
                onClaimWalkover={onClaimWalkover}
                inviteCooldowns={inviteCooldowns}
                prizePool={formattedPrizeLabel}
                onViewPlayer={handleViewPlayer}
              />
            ) : (
              <TournamentVerticalBracket
                matches={matches}
                maxParticipants={event.max_participants}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onJoinMatch={onJoinMatch}
                onInviteOpponent={onInviteOpponent}
                onClaimWalkover={onClaimWalkover}
                inviteCooldowns={inviteCooldowns}
                onViewPlayer={handleViewPlayer}
              />
            )}
          </div>
        )}

        {activeTab === 'rewards' && (
          <RewardsCard prizePool={formattedPrizeLabel} event={event} matches={matches} />
        )}

        {activeTab === 'stats' && <TournamentStats event={event} matches={matches} />}
      </div>

      {/* Loading Overlay */}
      {fetchingProfile && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-slate-900 border border-casino-gold/30 p-5 rounded-2xl flex items-center gap-3 animate-fade-in">
            <div className="w-5 h-5 border-2 border-casino-gold/20 border-t-casino-gold rounded-full animate-spin" />
            <span className="text-xs font-bold text-slate-200">Cargando perfil...</span>
          </div>
        </div>
      )}

      {/* Player Profile Modal */}
      {selectedPlayerProfile && (
        <FriendProfileModal
          friend={selectedPlayerProfile}
          onClose={() => setSelectedPlayerProfile(null)}
          onOpenChat={() => {
            sessionStorage.setItem('open_chat_friend_id', selectedPlayerProfile.id);
            window.dispatchEvent(new CustomEvent('open_social_tab', { detail: { tab: 'chat' } }));
            setSelectedPlayerProfile(null);
          }}
        />
      )}
    </div>
  );
}
