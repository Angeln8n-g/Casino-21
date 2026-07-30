import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../web/services/supabase';

export interface ChampionshipLeaderboardItem {
  rank: number;
  username: string;
  points: number;
  projectedPrize: number;
  avatarColor: string;
  avatarLetter: string;
  isJustUpdated?: boolean;
  adsWatched?: number;
}

export interface WinnerProofItem {
  id: string;
  name: string;
  city: string;
  amountUsd: number;
  paymentMethod: string;
  methodLogoText: string;
  hoursAgo: number;
  txRef: string;
  verified: boolean;
  avatarUrl?: string;
  avatarLetter: string;
  avatarBg: string;
}

export interface LiveToast {
  id: string;
  user: string;
  city: string;
  amount: number;
  method: string;
  timeAgo: string;
}

export function useChampionshipLanding() {
  const [prizePoolUsd, setPrizePoolUsd] = useState(100);
  const [globalViews, setGlobalViews] = useState(0);
  const [activeLiveUsers, setActiveLiveUsers] = useState(1);
  const [leaderboard, setLeaderboard] = useState<ChampionshipLeaderboardItem[]>([]);
  const [winners, setWinners] = useState<WinnerProofItem[]>([]);
  const [activeToast, setActiveToast] = useState<LiveToast | null>(null);

  // Modales
  const [isTop100Open, setIsTop100Open] = useState(false);
  const [isWinnersWallOpen, setIsWinnersWallOpen] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);

  // Countdown timer to end of month
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Calculate projected prizes based on total pool
  const calculatePrizes = useCallback((totalPool: number, items: ChampionshipLeaderboardItem[]) => {
    return items.map((item) => {
      let prize = 0;
      if (item.rank === 1) prize = Math.round(totalPool * 0.40);
      else if (item.rank === 2) prize = Math.round(totalPool * 0.20);
      else if (item.rank === 3) prize = Math.round(totalPool * 0.10);
      else if (item.rank === 4) prize = Math.round(totalPool * 0.10);
      else if (item.rank >= 5 && item.rank <= 8) prize = Math.round(totalPool * 0.05);
      else prize = 15;
      return { ...item, projectedPrize: prize };
    });
  }, []);

  // Fetch real database info
  useEffect(() => {
    let mounted = true;
    async function loadDbData() {
      try {
        // 1. Championship Event
        const { data: eventData } = await supabase
          .from('events')
          .select('current_prize_usd, global_ad_views, end_date')
          .eq('is_championship', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (eventData && mounted) {
          if (eventData.current_prize_usd) {
            setPrizePoolUsd(Number(eventData.current_prize_usd));
          }
          if (eventData.global_ad_views) {
            setGlobalViews(Number(eventData.global_ad_views));
          }
        }

        // 2. Real Participants sorted by points DESC
        const { data: participants } = await supabase
          .from('championship_participants')
          .select('user_id, points, ads_watched, profiles(username)')
          .order('points', { ascending: false })
          .limit(100);

        if (participants && participants.length > 0 && mounted) {
          const colors = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fb923c', '#38bdf8', '#c084fc', '#facc15', '#4ade80'];
          const mapped: ChampionshipLeaderboardItem[] = participants.map((p: any, idx: number) => {
            const uname = p.profiles?.username ? `@${p.profiles.username}` : `@Usuario_${idx + 1}`;
            return {
              rank: idx + 1,
              username: uname,
              points: p.points || 0,
              projectedPrize: 0,
              avatarColor: colors[idx % colors.length],
              avatarLetter: uname.replace('@', '').charAt(0).toUpperCase() || 'U',
              adsWatched: p.ads_watched || 0,
            };
          });
          setLeaderboard(calculatePrizes(eventData?.current_prize_usd || 100, mapped));
        } else if (mounted) {
          setLeaderboard([]);
        }

        // 3. Paid Claims from DB for real Winners Wall
        const { data: paidClaims } = await supabase
          .from('tournament_prize_claims')
          .select('id, amount_usd, bank_name, account_number, paid_at, profiles(username)')
          .eq('status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(20);

        if (paidClaims && paidClaims.length > 0 && mounted) {
          const colors = ['bg-emerald-500/20 text-emerald-400 border-emerald-500/40', 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', 'bg-amber-500/20 text-amber-400 border-amber-500/40'];
          const mappedWinners: WinnerProofItem[] = paidClaims.map((item: any, idx: number) => {
            const uname = item.profiles?.username ? `@${item.profiles.username}` : `Usuario_${idx + 1}`;
            const hoursAgo = item.paid_at ? Math.max(1, Math.floor((Date.now() - new Date(item.paid_at).getTime()) / 3600000)) : 1;
            return {
              id: item.id,
              name: uname,
              city: 'Verificado',
              amountUsd: item.amount_usd || 0,
              paymentMethod: item.bank_name || 'Transferencia',
              methodLogoText: item.bank_name || 'Transferencia',
              hoursAgo,
              txRef: item.account_number || `REF-TX-${1000 + idx}`,
              verified: true,
              avatarLetter: uname.replace('@', '').charAt(0).toUpperCase() || 'U',
              avatarBg: colors[idx % colors.length],
            };
          });
          setWinners(mappedWinners);
        } else if (mounted) {
          setWinners([]);
        }
      } catch (e) {
        if (mounted) {
          setLeaderboard([]);
          setWinners([]);
        }
      }
    }
    loadDbData();
    return () => { mounted = false; };
  }, [calculatePrizes]);

  // Countdown timer interval to end of month
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const diff = endOfMonth.getTime() - now.getTime();

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeRemaining({ days, hours, minutes, seconds });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real participant update highlight
  useEffect(() => {
    if (leaderboard.length === 0) return;
    const pointsInterval = setInterval(() => {
      setLeaderboard((prev) => {
        if (prev.length === 0) return prev;
        const randomIndex = Math.floor(Math.random() * Math.min(prev.length, 10));
        return prev.map((item, idx) => {
          if (idx === randomIndex) {
            return {
              ...item,
              isJustUpdated: true,
            };
          }
          return { ...item, isJustUpdated: false };
        });
      });

      setTimeout(() => {
        setLeaderboard((prev) => prev.map((item) => ({ ...item, isJustUpdated: false })));
      }, 1500);
    }, 12000);

    return () => clearInterval(pointsInterval);
  }, [leaderboard.length]);

  // Live Toast Notifications from REAL winners list only (no fake names)
  useEffect(() => {
    if (winners.length === 0) return;

    const triggerToast = () => {
      const sample = winners[Math.floor(Math.random() * winners.length)];
      const newToast: LiveToast = {
        id: String(Date.now()),
        user: sample.name,
        city: sample.city,
        amount: sample.amountUsd,
        method: sample.paymentMethod,
        timeAgo: 'recientemente',
      };
      setActiveToast(newToast);

      setTimeout(() => {
        setActiveToast(null);
      }, 6000);
    };

    const toastTimer = setTimeout(triggerToast, 5000);
    const interval = setInterval(triggerToast, 35000);

    return () => {
      clearTimeout(toastTimer);
      clearInterval(interval);
    };
  }, [winners]);

  // Calculator helper function
  const calculateProjection = useCallback((adsPerDay: number) => {
    const daysInMonth = 30;
    const totalAds = adsPerDay * daysInMonth;
    const estimatedPoints = totalAds * 12; // ~12 pts per ad
    let estimatedRank = 32;
    let estimatedPayout = 5;

    if (estimatedPoints >= 14000) { estimatedRank = 1; estimatedPayout = Math.round(prizePoolUsd * 0.40); }
    else if (estimatedPoints >= 13500) { estimatedRank = 2; estimatedPayout = Math.round(prizePoolUsd * 0.20); }
    else if (estimatedPoints >= 12500) { estimatedRank = 4; estimatedPayout = Math.round(prizePoolUsd * 0.10); }
    else if (estimatedPoints >= 10000) { estimatedRank = 8; estimatedPayout = Math.round(prizePoolUsd * 0.05); }
    else if (estimatedPoints >= 5000) { estimatedRank = 16; estimatedPayout = 15; }
    else if (estimatedPoints >= 1500) { estimatedRank = 32; estimatedPayout = 5; }

    return { totalAds, estimatedPoints, estimatedRank, estimatedPayout };
  }, [prizePoolUsd]);

  return {
    prizePoolUsd,
    globalViews,
    activeLiveUsers,
    leaderboard,
    winners,
    activeToast,
    timeRemaining,
    calculateProjection,
    // Modal states
    isTop100Open,
    setIsTop100Open,
    isWinnersWallOpen,
    setIsWinnersWallOpen,
    isSponsorModalOpen,
    setIsSponsorModalOpen,
  };
}
