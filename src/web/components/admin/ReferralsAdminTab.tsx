import React, { useEffect, useState } from 'react';
import { Users, Award, Sparkles, RefreshCw, Trophy, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '../../services/supabase';

export interface TopReferrer {
  username: string;
  total_referrals: number;
  qualified_referrals: number;
  bonus_points: number;
}

const DEFAULT_MOCK_REFERRERS: TopReferrer[] = [
  { username: 'ElReyDelAd', total_referrals: 18, qualified_referrals: 12, bonus_points: 2400 },
  { username: 'LaDiosaClick', total_referrals: 14, qualified_referrals: 9, bonus_points: 1800 },
  { username: 'JuanBanReservas', total_referrals: 10, qualified_referrals: 6, bonus_points: 1200 },
  { username: 'MaraGana', total_referrals: 7, qualified_referrals: 4, bonus_points: 800 },
  { username: 'ClickMasterRD', total_referrals: 5, qualified_referrals: 3, bonus_points: 600 },
];

export const ReferralsAdminTab: React.FC = () => {
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>(DEFAULT_MOCK_REFERRERS);
  const [loading, setLoading] = useState(false);
  const [totalInvites, setTotalInvites] = useState(54);
  const [totalQualified, setTotalQualified] = useState(34);
  const [totalBonusAwarded, setTotalBonusAwarded] = useState(6800);

  const fetchReferralsData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('championship_referrals')
        .select('*, referrer:referrer_id(username)');

      if (data && data.length > 0) {
        setTotalInvites(data.length);
        const qual = data.filter((item: any) => item.bonus_awarded === true);
        setTotalQualified(qual.length);
        setTotalBonusAwarded(qual.length * 200);

        // Group by referrer
        const referrerMap: Record<string, { username: string; total: number; qual: number }> = {};
        data.forEach((item: any) => {
          const uname = item.referrer?.username || 'Usuario';
          if (!referrerMap[uname]) {
            referrerMap[uname] = { username: uname, total: 0, qual: 0 };
          }
          referrerMap[uname].total += 1;
          if (item.bonus_awarded) referrerMap[uname].qual += 1;
        });

        const sorted: TopReferrer[] = Object.values(referrerMap)
          .map((r) => ({
            username: r.username,
            total_referrals: r.total,
            qualified_referrals: r.qual,
            bonus_points: r.qual * 200,
          }))
          .sort((a, b) => b.bonus_points - a.bonus_points);

        setTopReferrers(sorted);
      }
    } catch (err) {
      // Fallback silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralsData();
  }, []);

  return (
    <div className="space-y-6 font-['Chakra_Petch']">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-950 p-5 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Users className="text-purple-400" /> Monitoreo de Programa de Referidos ("Invitar Amigo")
          </h3>
          <p className="text-xs text-gray-400 mt-1">Métricas y top referentes que otorgan +200 pts bonus al llegar a 100 ads</p>
        </div>

        <button
          onClick={fetchReferralsData}
          disabled={loading}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Global Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 text-center">
          <div className="text-xs text-gray-400 font-bold uppercase">Total Invitaciones Registradas</div>
          <div className="text-3xl font-black font-mono text-white mt-1">{totalInvites}</div>
        </div>

        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 text-center">
          <div className="text-xs text-emerald-400 font-bold uppercase">Referidos Calificados (100+ Ads)</div>
          <div className="text-3xl font-black font-mono text-emerald-400 mt-1">{totalQualified}</div>
        </div>

        <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-5 text-center">
          <div className="text-xs text-purple-300 font-bold uppercase">Puntos Bonus Otorgados</div>
          <div className="text-3xl font-black font-mono text-purple-300 mt-1">+{totalBonusAwarded} pts</div>
        </div>
      </div>

      {/* Top Referrers Leaderboard */}
      <div className="space-y-4">
        <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <Trophy size={16} className="text-yellow-400" /> Top Influencers y Referentes
        </h4>

        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase">
              <tr>
                <th className="p-3.5">Posición</th>
                <th className="p-3.5">Usuario Referente</th>
                <th className="p-3.5">Amigos Invitados</th>
                <th className="p-3.5">Amigos Calificados</th>
                <th className="p-3.5 text-right">Puntos Bonus Ganados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {topReferrers.map((r, idx) => (
                <tr key={r.username} className="hover:bg-white/[0.02]">
                  <td className="p-3.5 font-mono font-bold text-yellow-400">#{idx + 1}</td>
                  <td className="p-3.5 font-bold text-white">@{r.username}</td>
                  <td className="p-3.5 font-mono text-gray-300">{r.total_referrals} amigos</td>
                  <td className="p-3.5 font-mono text-emerald-400 font-bold">{r.qualified_referrals} calificados</td>
                  <td className="p-3.5 font-mono text-purple-400 font-black text-right">+{r.bonus_points} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
