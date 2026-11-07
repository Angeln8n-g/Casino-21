import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  Share,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Users, Copy, Check, Share2, Sparkles, X } from 'lucide-react-native';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { triggerHaptic } from '../../utils/haptics';

export interface ReferredFriend {
  id: string;
  referred_username: string;
  avatar_url: string | null;
  ads_count: number;
  bonus_awarded: boolean;
  created_at: string;
}

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
  eventId?: string;
}

export function ReferralModal({ visible, onClose, eventId }: ReferralModalProps) {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalReferrals: number;
    qualifiedReferrals: number;
    bonusPoints: number;
    referralsList: ReferredFriend[];
  }>({
    totalReferrals: 0,
    qualifiedReferrals: 0,
    bonusPoints: 0,
    referralsList: [],
  });

  const username =
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'Jugador';
  const baseUrl = (
    process.env.EXPO_PUBLIC_WEB_URL ||
    process.env.VITE_APP_URL ||
    'https://kasino21.com'
  ).replace(/\/$/, '');
  const referralLink = `${baseUrl}/login?ref=${encodeURIComponent(username)}`;

  useEffect(() => {
    if (!visible || !user?.id) return;
    let isMounted = true;
    const userId = user.id;

    const loadReferralStats = async () => {
      setLoading(true);
      try {
        let targetEventId = eventId;
        if (!targetEventId) {
          const { data: ev } = await supabase
            .from('events')
            .select('id')
            .eq('is_championship', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (ev?.id) targetEventId = ev.id;
        }

        if (targetEventId) {
          const { data } = await supabase.rpc('get_user_referral_stats', {
            p_user_id: userId,
            p_event_id: targetEventId,
          });

          if (isMounted && data && data.success) {
            setStats({
              totalReferrals: data.total_referrals || 0,
              qualifiedReferrals: data.qualified_referrals || 0,
              bonusPoints: data.bonus_points || 0,
              referralsList: Array.isArray(data.referrals_list) ? data.referrals_list : [],
            });
          }
        }
      } catch (err) {
        console.warn('Error cargando estadísticas de referidos:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadReferralStats();

    return () => {
      isMounted = false;
    };
  }, [visible, user?.id, eventId]);

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(referralLink);
      triggerHaptic('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShareWhatsapp = async () => {
    triggerHaptic('light');
    const message = `🎮 ¡Acompáñame en Kasino21! Juega 21 en tiempo real, ve ads para subir el pozo en vivo y compite por premios en dólares. Regístrate con mi link aquí: ${referralLink}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return;
      }
    } catch {}
    try {
      await Share.share({ message });
    } catch {}
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        className="flex-1 bg-black/85 justify-center items-center px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#090f23] border-2 border-purple-500/40 rounded-3xl p-5 max-h-[88%]"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between border-b border-purple-500/20 pb-4 mb-4">
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <View className="w-11 h-11 rounded-2xl bg-purple-500/20 border border-purple-500/40 items-center justify-center">
                <Users color="#c084fc" size={22} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-black text-white uppercase tracking-wider">
                  INVITA UN AMIGO Y GANA +200 PTS
                </Text>
                <Text className="text-[11px] text-gray-400 mt-0.5">
                  Multiplica tus puntos en el Championship por cada referido
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 items-center justify-center"
            >
              <X color="#d1d5db" size={18} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Link Box & Share */}
            <View className="bg-black/60 border border-purple-500/30 rounded-2xl p-4 mb-4">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Sparkles color="#c084fc" size={14} />
                <Text className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Tu Link de Invitación Único:
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <View className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5">
                  <Text
                    numberOfLines={1}
                    className="text-xs text-purple-200 font-mono"
                  >
                    {referralLink}
                  </Text>
                </View>

                <Pressable
                  onPress={handleCopyLink}
                  className="bg-purple-600 active:bg-purple-500 px-3.5 py-2.5 rounded-xl flex-row items-center gap-1.5"
                >
                  {copied ? (
                    <Check color="#34d399" size={15} />
                  ) : (
                    <Copy color="#ffffff" size={15} />
                  )}
                  <Text className="text-white text-xs font-black uppercase">
                    {copied ? 'Copiado' : 'Copiar'}
                  </Text>
                </Pressable>
              </View>

              <Pressable
                onPress={handleShareWhatsapp}
                className="w-full bg-emerald-600 active:bg-emerald-500 py-3 rounded-xl flex-row items-center justify-center gap-2 mt-3"
              >
                <Share2 color="#ffffff" size={16} />
                <Text className="text-white text-xs font-black uppercase tracking-wider">
                  Compartir por WhatsApp
                </Text>
              </Pressable>
            </View>

            {/* Stats Summary */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 items-center">
                <Text className="text-[10px] text-gray-400 font-bold uppercase text-center">
                  Amigos Invitados
                </Text>
                <Text className="text-2xl font-black font-mono text-white mt-1">
                  {stats.totalReferrals}
                </Text>
              </View>

              <View className="flex-1 bg-purple-500/10 border border-purple-500/30 rounded-2xl p-3.5 items-center">
                <Text className="text-[10px] text-purple-300 font-bold uppercase text-center">
                  Puntos Bonus
                </Text>
                <Text className="text-2xl font-black font-mono text-purple-300 mt-1">
                  +{stats.bonusPoints} pts
                </Text>
              </View>
            </View>

            {/* Referred Friends Tracking */}
            <View>
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Seguimiento de Amigos
                </Text>
                <Text className="text-[11px] text-purple-400 font-mono font-bold">
                  {stats.qualifiedReferrals} / {stats.totalReferrals} Calificados
                </Text>
              </View>

              {loading ? (
                <View className="py-6 items-center">
                  <ActivityIndicator color="#c084fc" />
                </View>
              ) : stats.referralsList.length === 0 ? (
                <View className="bg-black/40 border border-white/5 rounded-2xl p-5 items-center">
                  <Text className="text-gray-400 text-xs font-semibold text-center">
                    Aún no tienes amigos referidos en el Championship actual.
                  </Text>
                  <Text className="text-purple-400/80 text-[11px] text-center mt-1">
                    ¡Comparte tu enlace único arriba para ganar +200 puntos bonus!
                  </Text>
                </View>
              ) : (
                <View className="gap-2.5">
                  {stats.referralsList.map((friend) => {
                    const progress = Math.min(
                      100,
                      Math.max(0, ((friend.ads_count || 0) / 100) * 100)
                    );
                    return (
                      <View
                        key={friend.id}
                        className="bg-black/40 border border-white/5 rounded-2xl p-3 flex-row items-center justify-between gap-3"
                      >
                        <View className="flex-row items-center gap-3 flex-1">
                          <View className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 items-center justify-center">
                            <Text className="text-purple-300 font-black text-sm">
                              {friend.referred_username?.charAt(0).toUpperCase() || 'J'}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text
                              numberOfLines={1}
                              className="text-xs font-bold text-white"
                            >
                              @{friend.referred_username}
                            </Text>
                            <View className="w-full bg-slate-900 rounded-full h-1.5 mt-1.5 overflow-hidden">
                              <View
                                className="bg-purple-400 h-full"
                                style={{ width: `${progress}%` }}
                              />
                            </View>
                          </View>
                        </View>

                        <View className="items-end">
                          <Text className="text-xs font-mono font-bold text-gray-300">
                            {friend.ads_count || 0} / 100 ads
                          </Text>
                          {friend.bonus_awarded ? (
                            <View className="bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded mt-0.5">
                              <Text className="text-[10px] text-emerald-400 font-bold uppercase">
                                +200 Pts ✅
                              </Text>
                            </View>
                          ) : (
                            <Text className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                              Pendiente
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
