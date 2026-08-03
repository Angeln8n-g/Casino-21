import React, { useState, useEffect } from 'react';
import { Trophy, Play, Star, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ChampionshipLeaderboardModal } from './ChampionshipLeaderboardModal';

export const ChampionshipLobbyWidget: React.FC = () => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPrize, setCurrentPrize] = useState(1247.35);
  const [targetViews, setTargetViews] = useState(100000);
  const [targetPrize, setTargetPrize] = useState(1250);
  const [globalViews, setGlobalViews] = useState(124735);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userPoints, setUserPoints] = useState<number | null>(null);
  const [phase, setPhase] = useState<'league' | 'cut' | 'final' | 'completed'>('league');
  const [endDate, setEndDate] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!endDate) return;
    const calcTimeLeft = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };
    calcTimeLeft();
    const timer = setInterval(calcTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  useEffect(() => {
    let mounted = true;
    async function loadWidgetData() {
      try {
        // 1. Fetch real active championship event, create if missing
        let { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('is_championship', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!eventData) {
          const { data: newEv } = await supabase.from('events').insert({
            title: 'KASINO21 CHAMPIONSHIP',
            description: 'Liga de 7 días con pozo acumulable en dólares.',
            rules: 'Acumula puntos viendo anuncios y compite por el pozo en efectivo.',
            type: 'liga',
            status: 'live',
            entry_fee: 0,
            prize_pool: '$100.00 USD',
            min_elo: 0,
            participants_count: 0,
            is_championship: true,
            championship_phase: 'league',
            base_prize_usd: 100,
            current_prize_usd: 100,
            max_prize_usd: 5000,
            global_ad_views: 0,
            daily_ad_cap: 300,
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          }).select('*').single();

          eventData = newEv;
        }

        if (eventData && mounted) {
          if (eventData.current_prize_usd) setCurrentPrize(Number(eventData.current_prize_usd));
          if (eventData.global_ad_views) setGlobalViews(Number(eventData.global_ad_views));
          if (eventData.championship_phase) setPhase(eventData.championship_phase);
          if (eventData.end_date) setEndDate(eventData.end_date);
        }

        // 2. Fetch current user's real rank & points in championship
        if (user?.id && mounted) {
          let rawParticipants: any[] | null = null;

          if (eventData?.id) {
            const { data: parts } = await supabase
              .from('championship_participants')
              .select('user_id, points')
              .eq('event_id', eventData.id)
              .order('points', { ascending: false });

            if (parts && parts.length > 0) {
              rawParticipants = parts;
            }
          }

          if (!rawParticipants || rawParticipants.length === 0) {
            const { data: fallbackParts } = await supabase
              .from('championship_participants')
              .select('user_id, points')
              .order('points', { ascending: false })
              .limit(100);

            if (fallbackParts && fallbackParts.length > 0) {
              rawParticipants = fallbackParts;
            }
          }

          if (rawParticipants && mounted) {
            const idx = rawParticipants.findIndex((p: any) => p.user_id === user.id);
            if (idx !== -1) {
              setUserRank(idx + 1);
              setUserPoints(rawParticipants[idx].points || 0);
            } else {
              setUserRank(null);
              setUserPoints(null);
            }
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

    loadWidgetData();

    const channel = supabase
      .channel(`championship_widget_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        if (mounted) loadWidgetData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'championship_participants' }, () => {
        if (mounted) loadWidgetData();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const viewsProgress = globalViews % targetViews;
  const progressPercent = Math.min(100, Math.max(15, (viewsProgress / targetViews) * 100));

  return (
    <>
      <div className="relative w-full max-w-4xl mx-auto mb-6 group cursor-pointer font-['Chakra_Petch']" onClick={() => setIsModalOpen(true)}>
        {/* Animated glowing border */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-casino-gold via-yellow-300 to-casino-gold rounded-3xl opacity-50 blur-[2px] group-hover:opacity-100 transition-opacity duration-500 animate-gradient-x"></div>
        
        {/* Main content container */}
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 p-5 md:p-6 bg-slate-950/90 rounded-3xl overflow-hidden border border-casino-gold/30">
          
          {/* Background patterns */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-casino-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          {/* Left section: Branding & Status */}
          <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-casino-gold via-amber-400 to-yellow-700 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] flex-shrink-0">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-slate-950" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest font-['Russo_One']">KASINO21 CHAMPIONSHIP</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-full">
                  {phase === 'league' ? 'Liga Activa' : phase === 'cut' ? 'Corte' : phase === 'final' ? 'Final en Vivo' : 'Completado'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-casino-gold/90 font-bold tracking-widest uppercase">
                Pozo Acumulado en Tiempo Real
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-lg border border-white/10">
                  <Star className="w-3 h-3 text-casino-gold" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Tu Posición: <span className="text-casino-gold">{userRank ? `#${userRank}` : 'Sin clasificar'}</span>
                  </span>
                </div>
                {userPoints !== null ? (
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 rounded-lg">
                    ✓ Inscrito ({userPoints} pts)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-500/40 rounded-lg animate-pulse">
                    ⚡ Ve Ads para Inscribirte
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Middle section: Prize Pool Progress */}
          <div className="relative z-10 w-full md:flex-1 md:max-w-md flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pozo Actual</p>
                <p className="text-2xl md:text-3xl font-black text-casino-gold font-mono drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]">
                  ${currentPrize.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Próxima Meta</p>
                <p className="text-sm font-black text-white font-mono">${targetPrize.toLocaleString()} USD</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 relative">
              <motion.div 
                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-yellow-600 via-casino-gold to-yellow-300 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </div>
            
            <p className="text-[10px] md:text-xs font-bold text-center text-gray-300 uppercase tracking-wider">
              Faltan <span className="text-casino-gold font-mono">{(targetViews - viewsProgress).toLocaleString()} vistas</span> para aumentar el pozo
            </p>

            {timeLeft && phase === 'league' && (
              <div className="flex items-center justify-center gap-1.5 bg-black/60 border border-yellow-500/30 py-1 px-3 rounded-xl text-[10px] font-bold text-yellow-300 font-mono tracking-wider">
                <span>⏳ Cierre Top 32 en:</span>
                <span className="text-white font-black">
                  {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h:{String(timeLeft.minutes).padStart(2, '0')}m:{String(timeLeft.seconds).padStart(2, '0')}s
                </span>
              </div>
            )}
          </div>

          {/* Right section: CTA */}
          <div className="relative z-10 w-full md:w-auto flex flex-col items-center gap-3">
            <button 
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-casino-gold to-yellow-600 hover:from-yellow-400 hover:to-casino-gold text-slate-950 font-black rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)] transform hover:-translate-y-1 flex items-center justify-center gap-2 font-['Russo_One'] cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              <Play className="w-4 h-4 fill-slate-950" />
              Ver Ranking y Ganar
            </button>
            <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">
              Ver Ranking Completo <ChevronRight className="w-3 h-3" />
            </div>
          </div>

        </div>
      </div>

      {isModalOpen && (
        <ChampionshipLeaderboardModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
};
