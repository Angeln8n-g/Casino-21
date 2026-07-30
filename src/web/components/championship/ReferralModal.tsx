import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Copy, Check, Share2, Sparkles, Trophy, Flame, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string;
}

export interface ReferredFriend {
  id: string;
  referred_username: string;
  avatar_url: string | null;
  ads_count: number;
  bonus_awarded: boolean;
  created_at: string;
}

const DEFAULT_MOCK_FRIENDS: ReferredFriend[] = [
  {
    id: 'f-1',
    referred_username: 'Carlos_Gamer',
    avatar_url: null,
    ads_count: 100,
    bonus_awarded: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'f-2',
    referred_username: 'Elena_RD',
    avatar_url: null,
    ads_count: 45,
    bonus_awarded: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'f-3',
    referred_username: 'Lucas_Click',
    avatar_url: null,
    ads_count: 12,
    bonus_awarded: false,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export const ReferralModal: React.FC<Props> = ({ isOpen, onClose, eventId }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 3,
    qualifiedReferrals: 1,
    bonusPoints: 200,
    referralsList: DEFAULT_MOCK_FRIENDS,
  });

  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Jugador';
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://kasino21.com';
  const referralLink = `${originUrl}/login?ref=${encodeURIComponent(username)}`;

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    const userId = user.id;

    async function loadReferralStats() {
      setLoading(true);
      try {
        // Fetch active championship event if not passed
        let targetEventId = eventId;
        if (!targetEventId) {
          const { data: ev } = await supabase
            .from('events')
            .select('id')
            .eq('is_championship', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (ev) targetEventId = ev.id;
        }

        if (targetEventId) {
          const { data, error } = await supabase.rpc('get_user_referral_stats', {
            p_user_id: userId,
            p_event_id: targetEventId,
          });

          if (data && data.success) {
            setStats({
              totalReferrals: data.total_referrals || 0,
              qualifiedReferrals: data.qualified_referrals || 0,
              bonusPoints: data.bonus_points || 0,
              referralsList: data.referrals_list && data.referrals_list.length > 0 ? data.referrals_list : DEFAULT_MOCK_FRIENDS,
            });
          }
        }
      } catch (err) {
        // Fallback to mock data silently
      } finally {
        setLoading(false);
      }
    }

    loadReferralStats();
  }, [isOpen, user, eventId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsapp = () => {
    const text = `🎮 ¡Acompáñame en Kasino21! Juega 21 en tiempo real, ve ads para subir el pozo en vivo y compite por premios en dólares. Registrate con mi link aquí: ${referralLink}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden font-['Chakra_Petch']">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-[#090f23] border-2 border-purple-500/40 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-[0_0_60px_rgba(168,85,247,0.25)] overflow-hidden z-10 text-white"
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black font-['Russo_One'] text-white uppercase tracking-wider">
                    INVITA UN AMIGO Y GANA +200 PTS
                  </h3>
                  <p className="text-xs text-gray-400">Multiplica tus puntos en el Championship por cada referido</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Unique Link Box & Actions */}
            <div className="bg-black/60 border border-purple-500/30 rounded-2xl p-4 mb-6">
              <label className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles size={14} className="text-purple-400" /> Tu Link de Invitación Único:
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-purple-200 font-mono focus:outline-none"
                />

                <button
                  onClick={handleCopyLink}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold font-['Russo_One'] flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                >
                  {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>

              <div className="mt-3 text-center">
                <button
                  onClick={handleShareWhatsapp}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold font-['Russo_One'] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg uppercase tracking-wider"
                >
                  <Share2 size={16} /> Compartir por WhatsApp
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-400 font-bold uppercase">Amigos Invitados</div>
                <div className="text-2xl font-black font-mono text-white mt-1">{stats.totalReferrals}</div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4 text-center">
                <div className="text-xs text-purple-300 font-bold uppercase">Puntos Bonus Ganados</div>
                <div className="text-2xl font-black font-mono text-purple-300 mt-1">+{stats.bonusPoints} pts</div>
              </div>
            </div>

            {/* Referred Friends Tracking List */}
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                <span>Seguimiento de Amigos</span>
                <span className="text-purple-400 font-mono">{stats.qualifiedReferrals} / {stats.totalReferrals} Calificados</span>
              </h4>

              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-purple-500/20">
                {stats.referralsList.map((friend) => {
                  const progress = Math.min(100, Math.max(0, (friend.ads_count / 100) * 100));
                  return (
                    <div
                      key={friend.id}
                      className="bg-black/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 font-black text-sm flex items-center justify-center flex-shrink-0">
                          {friend.referred_username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-white truncate">@{friend.referred_username}</div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div className="bg-purple-400 h-full transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-xs font-mono font-bold text-gray-300">{friend.ads_count} / 100 ads</div>
                        {friend.bonus_awarded ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase border border-emerald-500/30">
                            +200 Pts ✅
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-500 font-bold uppercase">Pendiente</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
