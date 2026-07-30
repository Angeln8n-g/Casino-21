import React, { useState, useEffect } from 'react';
import { X, Search, Copy, CheckCircle2, Trophy, Users, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

export interface ParticipantItem {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  points: number;
  ads_today: number;
  ads_watched: number;
  referrals_count: number;
  is_current_user: boolean;
}

export const ChampionshipLeaderboardModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real DB state
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [userAdsToday, setUserAdsToday] = useState<number>(0);
  const [dailyCap, setDailyCap] = useState<number>(300);

  const fetchRealLeaderboard = async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      // 1. Get active championship event
      const { data: eventData } = await supabase
        .from('events')
        .select('id, daily_ad_cap')
        .eq('is_championship', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const eventId = eventData?.id;
      if (eventData?.daily_ad_cap) {
        setDailyCap(eventData.daily_ad_cap);
      }

      if (eventId) {
        // 2. Query real participants sorted by points DESC
        const { data: partData } = await supabase
          .from('championship_participants')
          .select('*, profiles(username, avatar_url)')
          .eq('event_id', eventId)
          .order('points', { ascending: false });

        if (partData && partData.length > 0) {
          setTotalCount(partData.length);
          let foundUserRank: number | null = null;
          let foundUserAdsToday = 0;

          const mapped: ParticipantItem[] = partData.map((item: any, idx: number) => {
            const isMe = user?.id === item.user_id;
            if (isMe) {
              foundUserRank = idx + 1;
              foundUserAdsToday = item.ads_today || 0;
            }
            return {
              rank: idx + 1,
              user_id: item.user_id,
              username: item.profiles?.username ? `@${item.profiles.username}` : `Usuario_${idx + 1}`,
              avatar_url: item.profiles?.avatar_url || null,
              points: item.points || 0,
              ads_today: item.ads_today || 0,
              ads_watched: item.ads_watched || 0,
              referrals_count: item.referrals_count || 0,
              is_current_user: isMe,
            };
          });

          setParticipants(mapped);
          setUserRank(foundUserRank);
          setUserAdsToday(foundUserAdsToday);
        } else {
          setParticipants([]);
          setTotalCount(0);
          setUserRank(null);
          setUserAdsToday(0);
        }
      } else {
        setParticipants([]);
        setTotalCount(0);
        setUserRank(null);
      }
    } catch (err) {
      console.error('Error al cargar ranking de Supabase:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealLeaderboard();

    const channel = supabase
      .channel(`championship_leaderboard_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchRealLeaderboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'championship_participants' }, () => {
        fetchRealLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const userRefCode = user?.user_metadata?.username || user?.email?.split('@')[0] || 'usuario';
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kasino21.com';
  const referralLink = `${originUrl}/login?ref=${userRefCode}`;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWatchAdClick = async () => {
    if (!user?.id) {
      alert('Debes iniciar sesión para registrar anuncios y subir en el ranking');
      return;
    }
    setIsRefreshing(true);
    try {
      let { data: eventData } = await supabase
        .from('events')
        .select('id')
        .eq('is_championship', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!eventData?.id) {
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
        }).select('id').single();

        eventData = newEv;
      }

      if (eventData?.id) {
        const { data, error } = await supabase.rpc('record_championship_ad_activity', {
          p_user_id: user.id,
          p_event_id: eventData.id,
          p_type: 'view',
        });

        if (error) {
          console.warn('Fallback direct update on ad RPC error:', error);
          const { data: part } = await supabase
            .from('championship_participants')
            .select('*')
            .eq('event_id', eventData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!part) {
            await supabase.from('championship_participants').insert({
              event_id: eventData.id,
              user_id: user.id,
              points: 1,
              ads_today: 1,
              ads_watched: 1,
            });
          } else {
            await supabase.from('championship_participants').update({
              points: (part.points || 0) + 1,
              ads_today: (part.ads_today || 0) + 1,
              ads_watched: (part.ads_watched || 0) + 1,
              updated_at: new Date().toISOString(),
            }).eq('id', part.id);
          }
        } else if (data?.success === false) {
          alert(data.error === 'DAILY_CAP_REACHED' ? '⚠️ Has alcanzado el tope diario de 300 anuncios.' : `⚠️ Error: ${data.error}`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      await fetchRealLeaderboard();
      setIsRefreshing(false);
    }
  };

  const filteredParticipants = participants.filter((p) =>
    p.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 pt-16 sm:pt-20 pb-6 font-['Chakra_Petch']">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-5xl bg-[#090e1f] border-2 border-yellow-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col max-h-[85vh] relative"
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-[#0d142b] to-slate-950 border-b border-white/10 flex-shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-20 p-2.5 bg-black/60 hover:bg-black/80 rounded-full text-white/70 hover:text-yellow-400 border border-white/20 transition-all cursor-pointer shadow-lg"
            title="Cerrar Ranking"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pr-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-casino-gold via-amber-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.3)] flex-shrink-0">
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 text-slate-950" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white font-['Russo_One'] uppercase tracking-widest">RANKING DE JUGADORES</h2>
                <p className="text-xs sm:text-sm text-casino-gold uppercase tracking-wider font-bold">Top Clasificatorio Championship</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center min-w-[90px] sm:min-w-[100px]">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Participantes</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">{totalCount.toLocaleString()}</span>
              </div>
              <div className="bg-black/50 border border-yellow-500/30 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center min-w-[90px] sm:min-w-[100px]">
                <span className="text-[9px] text-yellow-400/90 uppercase tracking-widest font-bold">Tu Rank</span>
                <span className="text-base sm:text-lg font-black text-casino-gold font-mono">
                  {userRank ? `#${userRank}` : 'Sin Clasificar'}
                </span>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center min-w-[90px] sm:min-w-[100px]">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest font-bold">Ads Hoy</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  {userAdsToday}<span className="text-xs text-gray-500">/{dailyCap}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar & Referral */}
        <div className="p-3.5 sm:p-4 bg-slate-950/80 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-center flex-shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:border-casino-gold outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none flex items-center gap-2 bg-purple-950/30 border border-purple-500/30 rounded-xl p-1.5 pl-3">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider hidden sm:inline">Invita: +200 pts</span>
              <div className="flex gap-1 items-center">
                <code className="text-[11px] text-purple-200 font-mono bg-black/60 px-2 py-1 rounded-lg truncate max-w-[140px]">
                  {referralLink}
                </code>
                <button 
                  onClick={handleCopyRef}
                  className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors cursor-pointer"
                  title="Copiar mi enlace"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleWatchAdClick}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-black font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.2)] cursor-pointer shrink-0"
              title="Registrar anuncio para sumar vistas y puntos al Championship"
            >
              <span>🎬 Ver Ad (+1 Pt)</span>
            </button>
            <button 
              onClick={fetchRealLeaderboard}
              disabled={isRefreshing}
              className={`p-2.5 bg-black/50 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
              title="Actualizar ranking"
            >
              <RefreshCw className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto bg-[#060a17] p-0 custom-scrollbar">
          {loading ? (
            <div className="text-center py-16 text-gray-400 text-xs font-bold uppercase tracking-wider">
              Cargando ranking en vivo desde la base de datos...
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Trophy className="w-12 h-12 mx-auto text-gray-600 mb-3" />
              <h3 className="text-white font-bold text-base mb-1">Aún no hay participantes en el ranking</h3>
              <p className="text-gray-400 text-xs max-w-sm mx-auto">
                Sé el primero en participar viendo anuncios o invitando amigos para aparecer en el Top 32.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap font-['Chakra_Petch']">
              <thead className="sticky top-0 bg-[#090e1f]/95 backdrop-blur-md z-10 text-gray-400 uppercase tracking-widest border-b border-white/10">
                <tr>
                  <th className="px-5 py-3.5 font-black">Rank</th>
                  <th className="px-5 py-3.5 font-black">Jugador</th>
                  <th className="px-5 py-3.5 font-black text-right">Puntos</th>
                  <th className="px-5 py-3.5 font-black text-right">Ads Hoy</th>
                  <th className="px-5 py-3.5 font-black text-right">Ads Totales</th>
                  <th className="px-5 py-3.5 font-black text-right">Referidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredParticipants.map((row) => (
                  <React.Fragment key={row.user_id}>
                    {row.rank === 33 && (
                      <tr>
                        <td colSpan={6} className="p-0 relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-px bg-red-500/50"></div>
                            <span className="absolute px-3 py-1 bg-red-950 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/50 rounded-full">
                              Línea de Corte (Top 32 Clasificados)
                            </span>
                          </div>
                          <div className="h-9"></div>
                        </td>
                      </tr>
                    )}
                    <tr className={`hover:bg-white/5 transition-colors ${row.is_current_user ? 'bg-casino-gold/15 relative font-bold' : ''}`}>
                      <td className="px-5 py-3">
                        {row.is_current_user && <div className="absolute left-0 top-0 bottom-0 w-1 bg-casino-gold shadow-[0_0_10px_rgba(251,191,36,1)]"></div>}
                        <span className={`font-black font-mono ${row.rank <= 3 ? 'text-casino-gold text-base' : row.rank <= 32 ? 'text-emerald-400' : 'text-gray-500'}`}>
                          #{row.rank}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 overflow-hidden font-bold text-xs text-yellow-400 flex-shrink-0">
                            {row.avatar_url ? (
                              <img src={row.avatar_url} alt={row.username} className="w-full h-full object-cover" />
                            ) : (
                              row.username.replace('@', '').charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className={`font-bold ${row.is_current_user ? 'text-casino-gold' : 'text-white'}`}>
                            {row.username} {row.is_current_user && '(TÚ)'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-black font-mono text-yellow-400 text-sm">
                        {row.points.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-300">
                        {row.ads_today}/{dailyCap}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-gray-400">
                        {row.ads_watched}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-purple-300 font-bold">
                        {row.referrals_count}
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
};
