import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Trophy, Shield, UserPlus, Trash2, CheckCheck, X } from 'lucide-react-native';
import { AppNotification, GameInviteToastData } from '../../hooks/useNotifications';
import { appEvents } from '../../utils/events';
import { triggerHaptic } from '../../utils/haptics';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  appNotifications: AppNotification[];
  unreadCount: number;
  pendingFriendRequests: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteRead: () => void;
  onDeleteNotification: (id: string) => void;
  onChallengeClick: (invite: GameInviteToastData) => void;
}

export function NotificationsModal({
  visible,
  onClose,
  appNotifications,
  unreadCount,
  pendingFriendRequests,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteRead,
  onDeleteNotification,
  onChallengeClick,
}: NotificationsModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const router = useRouter();

  if (!visible) return null;

  const hasReadNotifications = appNotifications.some((n) => n.is_read);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          zIndex: 999997,
          elevation: 999997,
          backgroundColor: 'rgba(2, 6, 23, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 18,
        },
      ]}
    >
      <View
        style={{
          width: Math.min(windowWidth - 28, 420),
          maxHeight: Math.min(windowHeight * 0.8, 560),
          backgroundColor: '#0f172a',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: 'rgba(251, 191, 36, 0.3)',
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.65,
          shadowRadius: 24,
        }}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 18,
            paddingVertical: 15,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Bell color="#fbbf24" size={18} />
            <Text
              style={{
                color: '#ffffff',
                fontSize: 13,
                fontWeight: '900',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              Avisos Recientes
            </Text>
            {unreadCount > 0 && (
              <View
                style={{
                  backgroundColor: '#ef4444',
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                }}
              >
                <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onClose();
            }}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X color="#94a3b8" size={16} />
          </Pressable>
        </View>

        {/* Barra de acciones rápidas (Limpiar todo / Borrar leídas) */}
        {(unreadCount > 0 || hasReadNotifications) && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 14,
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.05)',
              backgroundColor: 'rgba(2, 6, 23, 0.4)',
            }}
          >
            {unreadCount > 0 && (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onMarkAllAsRead();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <CheckCheck color="#fbbf24" size={13} />
                <Text
                  style={{
                    color: '#fbbf24',
                    fontSize: 10,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Limpiar todo
                </Text>
              </Pressable>
            )}

            {hasReadNotifications && (
              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onDeleteRead();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
              >
                <Trash2 color="#f87171" size={13} />
                <Text
                  style={{
                    color: '#f87171',
                    fontSize: 10,
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                  }}
                >
                  Borrar leídas
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/*Acceso directo si hay solicitudes de amistad pendientes */}
        {pendingFriendRequests > 0 && (
          <Pressable
            onPress={() => {
              triggerHaptic('light');
              onClose();
              router.push('/(tabs)/social');
              setTimeout(() => {
                appEvents.emit('open_social_tab', { tab: 'requests' });
              }, 100);
            }}
            style={{
              marginHorizontal: 14,
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderWidth: 1,
              borderColor: 'rgba(16, 185, 129, 0.35)',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserPlus color="#34d399" size={17} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#34d399', fontSize: 12, fontWeight: '900' }}>
                  {pendingFriendRequests}{' '}
                  {pendingFriendRequests === 1
                    ? 'Solicitud de amistad pendiente'
                    : 'Solicitudes de amistad pendientes'}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                  Toca para revisar y responder en Social
                </Text>
              </View>
            </View>
            <Text style={{ color: '#34d399', fontSize: 11, fontWeight: '900' }}>VER →</Text>
          </Pressable>
        )}

        {/* Lista de Notificaciones */}
        <ScrollView
          style={{ paddingHorizontal: 14, paddingVertical: 12 }}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {appNotifications.length === 0 ? (
            <View style={{ paddingVertical: 44, alignItems: 'center', opacity: 0.45 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <Bell color="#64748b" size={24} />
              </View>
              <Text
                style={{
                  color: '#94a3b8',
                  fontSize: 11,
                  fontWeight: '900',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                Bandeja vacía
              </Text>
            </View>
          ) : (
            appNotifications.map((n) => {
              const isGameInvite = n.type === 'game_invitation';
              const isFriendReq = n.type === 'friend_request';

              return (
                <Pressable
                  key={n.id}
                  onPress={() => {
                    triggerHaptic('light');
                    if (!n.is_read) {
                      onMarkAsRead(n.id);
                    }
                    onClose();

                    if (isFriendReq) {
                      router.push('/(tabs)/social');
                      setTimeout(() => {
                        appEvents.emit('open_social_tab', { tab: 'requests' });
                      }, 100);
                    } else if (isGameInvite && n.metadata) {
                      onChallengeClick({
                        invitationId: String(n.metadata.invitation_id || ''),
                        senderId: String(n.metadata.sender_id || ''),
                        username: String(
                          n.metadata.senderName || n.metadata.sender_username || 'Amigo'
                        ),
                        elo: Number(n.metadata.sender_elo || 1000),
                        level: Number(n.metadata.sender_level || 1),
                        wins: Number(n.metadata.sender_wins || 0),
                        losses: Number(n.metadata.sender_losses || 0),
                        xp: Number(n.metadata.sender_xp || 0),
                        roomId: String(n.metadata.roomId || n.metadata.room_id || '????'),
                        expiresAt: String(
                          n.metadata.expiresAt ||
                            n.metadata.expires_at ||
                            new Date(Date.now() + 60000).toISOString()
                        ),
                      });
                    }
                  }}
                  style={{
                    padding: 13,
                    borderRadius: 16,
                    marginBottom: 8,
                    backgroundColor: !n.is_read
                      ? 'rgba(255, 255, 255, 0.06)'
                      : 'rgba(255, 255, 255, 0.02)',
                    borderWidth: 1,
                    borderColor: !n.is_read
                      ? 'rgba(251, 191, 36, 0.25)'
                      : 'rgba(255, 255, 255, 0.05)',
                    opacity: !n.is_read ? 1 : 0.55,
                    position: 'relative',
                  }}
                >
                  {/* Botón Eliminar Individual */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      onDeleteNotification(n.id);
                    }}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: 'rgba(255, 255, 255, 0.07)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 2,
                    }}
                  >
                    <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '900' }}>×</Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: isGameInvite
                          ? 'rgba(251, 191, 36, 0.18)'
                          : isFriendReq
                          ? 'rgba(16, 185, 129, 0.18)'
                          : 'rgba(59, 130, 246, 0.18)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isGameInvite ? (
                        <Trophy color="#fbbf24" size={18} />
                      ) : isFriendReq ? (
                        <UserPlus color="#34d399" size={18} />
                      ) : (
                        <Shield color="#60a5fa" size={18} />
                      )}
                    </View>

                    <View style={{ flex: 1, paddingRight: 18 }}>
                      <Text
                        style={{
                          color: 'rgba(255, 255, 255, 0.5)',
                          fontSize: 9,
                          fontWeight: '900',
                          letterSpacing: 1.2,
                          textTransform: 'uppercase',
                          marginBottom: 3,
                        }}
                      >
                        {isGameInvite
                          ? 'Desafío Real'
                          : isFriendReq
                          ? 'Solicitud de Amistad'
                          : 'Sistema'}
                      </Text>
                      <Text
                        style={{
                          color: '#ffffff',
                          fontSize: 12,
                          fontWeight: '700',
                          lineHeight: 17,
                          marginBottom: 4,
                        }}
                      >
                        {n.content}
                      </Text>
                      <Text
                        style={{
                          color: '#64748b',
                          fontSize: 9,
                          fontWeight: '800',
                          textTransform: 'uppercase',
                        }}
                      >
                        {new Date(n.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    {!n.is_read && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#fbbf24',
                          marginTop: 14,
                          marginRight: 16,
                        }}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
}
