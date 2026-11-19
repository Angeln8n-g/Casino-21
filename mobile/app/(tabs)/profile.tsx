import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useAudio } from '../../hooks/useAudio';
import { useMusicSettings } from '../../hooks/useMusicSettings';
import { triggerHaptic } from '../../utils/haptics';
import { appEvents } from '../../utils/events';
import { ProfileHistoryView } from '../../components/profile/ProfileHistoryView';
import { DeleteAccountModal } from '../../components/profile/DeleteAccountModal';
import {
  LogOut,
  LogIn,
  Trophy,
  Award,
  Zap,
  Sparkles,
  Coins,
  Edit2,
  Check,
  X,
  UserX,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react-native';

export function getDivisionFromElo(elo: number) {
  if (elo < 1200)
    return { name: 'bronze', label: 'Bronce', icon: '🥉', color: 'text-amber-700', bg: 'bg-amber-950/20' };
  if (elo < 1500)
    return { name: 'silver', label: 'Plata', icon: '🥈', color: 'text-slate-300', bg: 'bg-slate-800/40' };
  if (elo < 1800)
    return { name: 'gold', label: 'Oro', icon: '🥇', color: 'text-amber-400', bg: 'bg-amber-500/20' };
  if (elo < 2100)
    return { name: 'platinum', label: 'Platino', icon: '💎', color: 'text-cyan-400', bg: 'bg-cyan-500/20' };
  return { name: 'diamond', label: 'Diamante', icon: '👑', color: 'text-purple-400', bg: 'bg-purple-500/20' };
}

export function calculateLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 100));
}

export function xpForLevel(level: number): number {
  return level * level * 100;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, signOut, refetchProfile } = useAuth();
  const { sfxVolume, sfxMuted, musicEnabled, musicMuted, musicVolume, playSfx } = useAudio();
  const { openSettingsModal, style: musicStyle } = useMusicSettings();

  // Estadísticas básicas
  const elo = profile?.elo || 1000;
  const xp = profile?.xp || 0;
  const level = calculateLevelFromXp(xp);
  const nextLevelXp = xpForLevel(level + 1);
  const currentLevelMinXp = xpForLevel(level);
  const progress = Math.min(
    100,
    Math.max(0, ((xp - currentLevelMinXp) / Math.max(1, nextLevelXp - currentLevelMinXp)) * 100)
  );
  const division = getDivisionFromElo(elo);

  const wins = profile?.wins || 0;
  const losses = profile?.losses || 0;
  const totalGames = wins + losses;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const tournamentsWon = (profile as any)?.tournaments_won || 0;

  // Edición de Username
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(profile?.username || '');
  const [usernameError, setUsernameError] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  // Modal de baja GDPR
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (profile?.username) {
      setNewUsername(profile.username);
    }
  }, [profile?.username]);

  // ── Guardar Username ────────────────────────────────────────
  const handleSaveUsername = async () => {
    if (!user) return;
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setUsernameError('El nombre no puede estar vacío');
      return;
    }
    if (trimmed.length < 3) {
      setUsernameError('Debe tener al menos 3 caracteres');
      return;
    }
    if (trimmed.length > 15) {
      setUsernameError('Máximo 15 caracteres permitidos');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError('');
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', user.id);

      if (error) {
        if (error.message.includes('unique')) {
          setUsernameError('Este nombre ya está en uso');
        } else {
          setUsernameError(error.message || 'Error al guardar');
        }
      } else {
        triggerHaptic('success');
        setIsEditingUsername(false);
        appEvents.emit('profile_updated');
        if (refetchProfile) await refetchProfile();
        Alert.alert('¡Actualizado!', 'Tu nombre de usuario ha sido modificado.');
      }
    } catch (err: any) {
      setUsernameError(err.message || 'Error de conexión');
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          triggerHaptic('light');
          await signOut();
        },
      },
    ]);
  };

  const avatarUri = profile?.equipped_avatar || profile?.avatar_url;

  return (
    <ScrollView className="flex-1 bg-slate-950 px-4 pt-12" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* ── Tarjeta Principal del Perfil ─────────────────────── */}
      <View className="bg-slate-900/90 rounded-3xl p-5 mb-4 border border-slate-800 items-center">
        {/* Avatar */}
        <View className="relative mb-3">
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              contentFit="cover"
              className="w-24 h-24 rounded-full border-2 border-amber-400 bg-slate-800"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-400 items-center justify-center">
              <Text className="text-4xl text-amber-400 font-bold">
                {profile?.username?.charAt(0).toUpperCase() || 'P'}
              </Text>
            </View>
          )}

          {/* Badge de División */}
          <View className="absolute -bottom-1 -right-1 bg-slate-900 border border-slate-700 rounded-full px-2 py-0.5 flex-row items-center">
            <Text className="text-xs mr-1">{division.icon}</Text>
            <Text className={`font-black text-[10px] ${division.color}`}>{division.label}</Text>
          </View>
        </View>

        {/* Nombre de Usuario & Edición */}
        {isEditingUsername ? (
          <View className="flex-row items-center gap-2 w-full mt-2 justify-center">
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Nuevo nombre..."
              placeholderTextColor="#64748b"
              maxLength={15}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold text-sm w-44"
              autoFocus
            />
            <Pressable
              disabled={isSavingUsername}
              onPress={handleSaveUsername}
              className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-xl"
            >
              {isSavingUsername ? (
                <ActivityIndicator size="small" color="#34d399" />
              ) : (
                <Check color="#34d399" size={16} />
              )}
            </Pressable>
            <Pressable
              disabled={isSavingUsername}
              onPress={() => {
                setIsEditingUsername(false);
                setNewUsername(profile?.username || '');
                setUsernameError('');
              }}
              className="p-2 bg-red-500/20 border border-red-500/40 rounded-xl"
            >
              <X color="#f87171" size={16} />
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center gap-2 mt-1">
            <Text className="text-white font-bold text-xl">{profile?.username || 'Jugador K21'}</Text>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                setIsEditingUsername(true);
              }}
              className="p-1 rounded-lg bg-slate-800/60"
            >
              <Edit2 color="#fbbf24" size={14} />
            </Pressable>
          </View>
        )}

        {usernameError.length > 0 && (
          <Text className="text-red-400 text-[11px] font-semibold mt-1">{usernameError}</Text>
        )}

        {/* Título Equipado */}
        {profile?.equipped_title && (
          <Text className="text-amber-400 text-xs font-bold uppercase tracking-widest mt-1">
            ✨ {profile.equipped_title} ✨
          </Text>
        )}

        {/* Barra de Progreso de Nivel y XP */}
        <View className="w-full bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl mt-4">
          <View className="flex-row justify-between items-center mb-1.5">
            <Text className="text-slate-400 text-[11px] font-bold uppercase">Progreso de Nivel</Text>
            <Text className="text-amber-400 text-[11px] font-mono font-bold">
              Lvl {level} — {xp}/{nextLevelXp} XP
            </Text>
          </View>

          <View className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
            <View
              className="h-full bg-amber-400 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </View>
        </View>
      </View>

      {/* ── Estadísticas Clave ───────────────────────────────── */}
      <View className="flex-row flex-wrap justify-between mb-4">
        <View className="bg-slate-900/80 w-[48%] p-3.5 rounded-2xl border border-slate-800 mb-2.5 flex-row items-center">
          <View className="bg-amber-500/10 p-2.5 rounded-xl mr-2.5">
            <Coins color="#fbbf24" size={20} />
          </View>
          <View>
            <Text className="text-slate-400 text-[10px] uppercase font-bold">Fichas</Text>
            <Text className="text-amber-400 font-bold text-base">
              {(profile?.coins || 0).toLocaleString()}
            </Text>
          </View>
        </View>

        <View className="bg-slate-900/80 w-[48%] p-3.5 rounded-2xl border border-slate-800 mb-2.5 flex-row items-center">
          <View className="bg-cyan-500/10 p-2.5 rounded-xl mr-2.5">
            <Trophy color="#06b6d4" size={20} />
          </View>
          <View>
            <Text className="text-slate-400 text-[10px] uppercase font-bold">Puntos ELO</Text>
            <Text className="text-cyan-400 font-bold text-base">{elo}</Text>
          </View>
        </View>

        <View className="bg-slate-900/80 w-[48%] p-3.5 rounded-2xl border border-slate-800 flex-row items-center">
          <View className="bg-emerald-500/10 p-2.5 rounded-xl mr-2.5">
            <Zap color="#10b981" size={20} />
          </View>
          <View>
            <Text className="text-slate-400 text-[10px] uppercase font-bold">Efectividad</Text>
            <Text className="text-emerald-400 font-bold text-base">{winRate}% WR</Text>
          </View>
        </View>

        <View className="bg-slate-900/80 w-[48%] p-3.5 rounded-2xl border border-slate-800 flex-row items-center">
          <View className="bg-purple-500/10 p-2.5 rounded-xl mr-2.5">
            <Award color="#c084fc" size={20} />
          </View>
          <View>
            <Text className="text-slate-400 text-[10px] uppercase font-bold">Partidas</Text>
            <Text className="text-purple-400 font-bold text-base">
              {wins}W / {losses}L
            </Text>
          </View>
        </View>
      </View>

      {/* ── Vitrina de Trofeos ───────────────────────────────── */}
      <View className="bg-slate-900/80 border border-slate-800 p-4 rounded-3xl mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-1.5">
            <Trophy color="#fbbf24" size={16} />
            <Text className="text-white font-bold text-xs uppercase tracking-wider">
              Vitrina de Trofeos
            </Text>
          </View>
          <Text className="text-amber-400 text-xs font-bold">
            {tournamentsWon > 0
              ? `${tournamentsWon} ${tournamentsWon === 1 ? 'Trofeo' : 'Trofeos'}`
              : 'Sin trofeos'}
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2 pt-1">
          {tournamentsWon > 0 ? (
            Array.from({ length: Math.min(tournamentsWon, 4) }).map((_, idx) => (
              <View
                key={idx}
                className="flex-row items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl"
              >
                <Text className="text-base">🏆</Text>
                <View>
                  <Text className="text-[10px] font-black text-amber-400">Campeón</Text>
                  <Text className="text-[8px] text-slate-400 font-mono">Torneo #{idx + 1}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text className="text-slate-500 text-xs italic text-center w-full py-1">
              Participa en torneos semanales para desbloquear tus primeros trofeos.
            </Text>
          )}
        </View>
      </View>

      {/* ── Historial de Partidas Oficiales ──────────────────── */}
      <ProfileHistoryView />

      {/* ── Configuraciones de Audio y Pistas ────────────────── */}
      <Pressable
        onPress={() => {
          triggerHaptic('light');
          playSfx('cardPlay');
          openSettingsModal();
        }}
        className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl mb-3 flex-row items-center justify-between active:bg-slate-800/80"
      >
        <View className="flex-row items-center gap-3 flex-1 mr-2">
          <View
            className={`p-2.5 rounded-xl border ${
              musicStyle === 'classic'
                ? 'bg-amber-500/15 border-amber-500/30'
                : 'bg-cyan-500/15 border-cyan-500/30'
            }`}
          >
            <Settings
              color={musicStyle === 'classic' ? '#fbbf24' : '#22d3ee'}
              size={20}
            />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold text-sm">
              Configuraciones de Audio
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              {musicStyle === 'classic' ? 'Clásico 🎻' : 'Competitivo ⚡'} • Música{' '}
              {!musicEnabled || musicMuted ? 'Off' : `${Math.round(musicVolume * 100)}%`} • SFX{' '}
              {sfxMuted ? 'Off' : `${Math.round(sfxVolume * 100)}%`}
            </Text>
          </View>
        </View>

        <View className="bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl flex-row items-center gap-1.5">
          {(!musicEnabled || musicMuted) && sfxMuted ? (
            <VolumeX color="#f87171" size={14} />
          ) : (
            <Volume2
              color={musicStyle === 'classic' ? '#fbbf24' : '#22d3ee'}
              size={14}
            />
          )}
          <Text className="text-slate-200 font-bold text-xs">Ajustar</Text>
        </View>
      </Pressable>

      {/* ── Acciones de Cuenta ───────────────────────────────── */}
      <View className="flex-col gap-2.5 mt-2">
        {user ? (
          <>
            <Pressable
              onPress={handleSignOut}
              className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex-row items-center justify-center active:bg-slate-800"
            >
              <LogOut color="#94a3b8" size={18} className="mr-2" />
              <Text className="text-slate-300 font-bold text-sm">Cerrar Sesión</Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic('card_tap');
                setShowDeleteModal(true);
              }}
              className="bg-red-950/20 border border-red-500/30 p-3.5 rounded-2xl flex-row items-center justify-center active:bg-red-950/40"
            >
              <UserX color="#f87171" size={18} className="mr-2" />
              <Text className="text-red-400 font-bold text-sm">Darse de baja (Eliminar Cuenta)</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => router.push('/auth')}
            className="bg-amber-500 active:bg-amber-600 p-4 rounded-2xl flex-row items-center justify-center"
          >
            <LogIn color="#020617" size={18} className="mr-2" />
            <Text className="text-slate-950 font-bold text-sm">Iniciar Sesión / Registrarse</Text>
          </Pressable>
        )}
      </View>

      {/* Modal de Baja GDPR */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        username={profile?.username}
      />
    </ScrollView>
  );
}
