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

const DEFAULT_TOP_10: ChampionshipLeaderboardItem[] = [
  { rank: 1, username: '@ElReyDelAd', points: 14230, projectedPrize: 400, avatarColor: '#fbbf24', avatarLetter: 'E' },
  { rank: 2, username: '@LaDiosaClick', points: 13980, projectedPrize: 200, avatarColor: '#a78bfa', avatarLetter: 'L' },
  { rank: 3, username: '@JuanBanReservas', points: 13500, projectedPrize: 100, avatarColor: '#34d399', avatarLetter: 'J' },
  { rank: 4, username: '@MaraGana', points: 12900, projectedPrize: 100, avatarColor: '#f472b6', avatarLetter: 'M' },
  { rank: 5, username: '@ClickMasterRD', points: 12100, projectedPrize: 50, avatarColor: '#60a5fa', avatarLetter: 'C' },
  { rank: 6, username: '@Suerte21', points: 11800, projectedPrize: 50, avatarColor: '#fb923c', avatarLetter: 'S' },
  { rank: 7, username: '@VeoYgano', points: 11200, projectedPrize: 50, avatarColor: '#38bdf8', avatarLetter: 'V' },
  { rank: 8, username: '@AdKing', points: 10900, projectedPrize: 50, avatarColor: '#c084fc', avatarLetter: 'A' },
  { rank: 9, username: '@PremioFacil', points: 10450, projectedPrize: 15, avatarColor: '#facc15', avatarLetter: 'P' },
  { rank: 10, username: '@NuevoPower', points: 10120, projectedPrize: 15, avatarColor: '#4ade80', avatarLetter: 'N' },
];

const DEFAULT_WINNERS: WinnerProofItem[] = [
  {
    id: 'w1',
    name: 'María G.',
    city: 'Santo Domingo',
    amountUsd: 200,
    paymentMethod: 'Banreservas',
    methodLogoText: 'Banreservas',
    hoursAgo: 2,
    txRef: 'REF-BR-98412',
    verified: true,
    avatarLetter: 'M',
    avatarBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  },
  {
    id: 'w2',
    name: 'Carlos L.',
    city: 'Santiago',
    amountUsd: 50,
    paymentMethod: 'PayPal',
    methodLogoText: 'PayPal',
    hoursAgo: 5,
    txRef: 'PAYPAL-88129X',
    verified: true,
    avatarLetter: 'C',
    avatarBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  },
  {
    id: 'w3',
    name: 'Roberto K.',
    city: 'La Vega',
    amountUsd: 100,
    paymentMethod: 'Banreservas',
    methodLogoText: 'Banreservas',
    hoursAgo: 8,
    txRef: 'REF-BR-77103',
    verified: true,
    avatarLetter: 'R',
    avatarBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  },
  {
    id: 'w4',
    name: 'Ana Sofia P.',
    city: 'San Cristóbal',
    amountUsd: 50,
    paymentMethod: 'Binance Pay',
    methodLogoText: 'Binance',
    hoursAgo: 12,
    txRef: 'BINANCE-TX-4019',
    verified: true,
    avatarLetter: 'A',
    avatarBg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  },
];

const RANDOM_TOAST_USERS = [
  { user: '@LucasRD', city: 'Santo Domingo', amount: 5, method: 'PayPal' },
  { user: '@ElenaG', city: 'Santiago', amount: 15, method: 'Banreservas' },
  { user: '@PedroClick', city: 'San Pedro', amount: 50, method: 'PayPal' },
  { user: '@Karla_21', city: 'La Romana', amount: 5, method: 'Binance' },
  { user: '@DomiMaster', city: 'Puerto Plata', amount: 100, method: 'Banreservas' },
  { user: '@GamerRD', city: 'Moca', amount: 15, method: 'PayPal' },
];

export function useChampionshipLanding() {
  const [prizePoolUsd, setPrizePoolUsd] = useState(1247.35);
  const [globalViews, setGlobalViews] = useState(124735);
  const [activeLiveUsers, setActiveLiveUsers] = useState(142);
  const [leaderboard, setLeaderboard] = useState<ChampionshipLeaderboardItem[]>(DEFAULT_TOP_10);
  const [winners, setWinners] = useState<WinnerProofItem[]>(DEFAULT_WINNERS);
  const [activeToast, setActiveToast] = useState<LiveToast | null>(null);

  // Modales
  const [isTop100Open, setIsTop100Open] = useState(false);
  const [isWinnersWallOpen, setIsWinnersWallOpen] = useState(false);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);

  // Countdown timer to end of month
  const [timeRemaining, setTimeRemaining] = useState({ days: 2, hours: 14, minutes: 32, seconds: 45 });

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

  // Fetch real database info if available
  useEffect(() => {
    let mounted = true;
    async function loadDbData() {
      try {
        const { data: eventData } = await supabase
          .from('events')
          .select('current_prize_usd, global_ad_views, end_date')
          .eq('is_championship', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (eventData && mounted) {
          if (eventData.current_prize_usd && eventData.current_prize_usd > 100) {
            setPrizePoolUsd(Number(eventData.current_prize_usd));
          }
          if (eventData.global_ad_views) {
            setGlobalViews(Number(eventData.global_ad_views));
          }
        }

        // Fetch top participants
        const { data: participants } = await supabase
          .from('championship_participants')
          .select('user_id, points, ads_watched, profiles(username)')
          .order('points', { ascending: false })
          .limit(10);

        if (participants && participants.length > 0 && mounted) {
          const colors = ['#fbbf24', '#a78bfa', '#34d399', '#f472b6', '#60a5fa', '#fb923c', '#38bdf8', '#c084fc', '#facc15', '#4ade80'];
          const mapped: ChampionshipLeaderboardItem[] = participants.map((p: any, idx: number) => {
            const uname = p.profiles?.username ? `@${p.profiles.username}` : DEFAULT_TOP_10[idx]?.username || `@User${idx+1}`;
            return {
              rank: idx + 1,
              username: uname,
              points: p.points || 10000 - idx * 500,
              projectedPrize: 0,
              avatarColor: colors[idx % colors.length],
              avatarLetter: uname.replace('@', '').charAt(0).toUpperCase(),
              adsWatched: p.ads_watched || 0,
            };
          });
          setLeaderboard(calculatePrizes(prizePoolUsd, mapped));
        }

        // Fetch paid claims from database to populate real winners wall
        const { data: paidClaims } = await supabase
          .from('tournament_prize_claims')
          .select('id, amount_usd, bank_name, account_number, paid_at, profiles(username)')
          .eq('status', 'paid')
          .order('paid_at', { ascending: false })
          .limit(10);

        if (paidClaims && paidClaims.length > 0 && mounted) {
          const cities = ['Santo Domingo', 'Santiago', 'La Vega', 'San Cristóbal', 'Puerto Plata', 'Moca'];
          const colors = ['bg-emerald-500/20 text-emerald-400 border-emerald-500/40', 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40', 'bg-amber-500/20 text-amber-400 border-amber-500/40'];
          const mappedWinners: WinnerProofItem[] = paidClaims.map((item: any, idx: number) => {
            const uname = item.profiles?.username || `Usuario${idx+1}`;
            const hoursAgo = item.paid_at ? Math.max(1, Math.floor((Date.now() - new Date(item.paid_at).getTime()) / 3600000)) : 2 + idx * 3;
            return {
              id: item.id,
              name: uname,
              city: cities[idx % cities.length],
              amountUsd: item.amount_usd || 50,
              paymentMethod: item.bank_name || 'Banreservas',
              methodLogoText: item.bank_name || 'Banreservas',
              hoursAgo,
              txRef: item.account_number || `REF-TX-${1000 + idx}`,
              verified: true,
              avatarLetter: uname.charAt(0).toUpperCase(),
              avatarBg: colors[idx % colors.length],
            };
          });
          setWinners(mappedWinners);
        }
      } catch (e) {
        // Fallback silently
      }
    }
    loadDbData();
    return () => { mounted = false; };
  }, [calculatePrizes, prizePoolUsd]);

  // Live jackpot increments (+ $0.01 every 4s)
  useEffect(() => {
    const interval = setInterval(() => {
      setPrizePoolUsd((prev) => {
        const next = Math.round((prev + 0.01) * 100) / 100;
        setLeaderboard((prevBoard) => calculatePrizes(next, prevBoard));
        return next;
      });
      setGlobalViews((prev) => prev + 1);
    }, 4000);

    return () => clearInterval(interval);
  }, [calculatePrizes]);

  // Countdown timer interval
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

  // Top 10 Points live animation jump every 10 seconds
  useEffect(() => {
    const pointsInterval = setInterval(() => {
      setLeaderboard((prev) => {
        const randomIndex = Math.floor(Math.random() * Math.min(prev.length, 10));
        const pointsBonus = Math.floor(Math.random() * 25) + 10;
        
        return prev.map((item, idx) => {
          if (idx === randomIndex) {
            return {
              ...item,
              points: item.points + pointsBonus,
              isJustUpdated: true,
            };
          }
          return { ...item, isJustUpdated: false };
        });
      });

      // Clear point highlight after 1.5s
      setTimeout(() => {
        setLeaderboard((prev) => prev.map((item) => ({ ...item, isJustUpdated: false })));
      }, 1500);
    }, 10000);

    return () => clearInterval(pointsInterval);
  }, []);

  // Live Toast Notifications every 30 seconds
  useEffect(() => {
    const triggerToast = () => {
      const sample = RANDOM_TOAST_USERS[Math.floor(Math.random() * RANDOM_TOAST_USERS.length)];
      const newToast: LiveToast = {
        id: String(Date.now()),
        user: sample.user,
        city: sample.city,
        amount: sample.amount,
        method: sample.method,
        timeAgo: 'hace un momento',
      };
      setActiveToast(newToast);

      setTimeout(() => {
        setActiveToast(null);
      }, 6000);
    };

    const toastTimer = setTimeout(triggerToast, 5000);
    const interval = setInterval(triggerToast, 30000);

    return () => {
      clearTimeout(toastTimer);
      clearInterval(interval);
    };
  }, []);

  // Random fluctuation for active live users
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveLiveUsers((prev) => Math.max(120, prev + Math.floor(Math.random() * 7) - 3));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

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
