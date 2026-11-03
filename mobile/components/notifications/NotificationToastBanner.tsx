import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ToastNotification } from '../../hooks/useNotifications';
import { appEvents } from '../../utils/events';
import { triggerHaptic } from '../../utils/haptics';

interface NotificationToastBannerProps {
  toast: ToastNotification | null;
  onDismiss: () => void;
  onFriendRequestAction?: (id: string, status: 'accepted' | 'rejected') => void;
}

export function NotificationToastBanner({
  toast,
  onDismiss,
  onFriendRequestAction,
}: NotificationToastBannerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  const borderColor = isSuccess
    ? 'rgba(16, 185, 129, 0.5)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.55)'
    : 'rgba(251, 191, 36, 0.45)';

  const badgeBg = isSuccess
    ? 'rgba(16, 185, 129, 0.15)'
    : isWarning
    ? 'rgba(245, 158, 11, 0.15)'
    : 'rgba(251, 191, 36, 0.15)';

  return (
    <View
      style={[
        styles.container,
        {
          top: Math.max(insets.top + 8, 16),
          borderColor,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Icono */}
        <View style={[styles.iconBox, { backgroundColor: badgeBg, borderColor }]}>
          <Text style={styles.iconEmoji}>
            {toast.friendRequestData
              ? '🤝'
              : isSuccess
              ? '✅'
              : isWarning
              ? '⚠️'
              : '🔔'}
          </Text>
        </View>

        {/* Contenido */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {toast.title}
            </Text>
            <Pressable
              onPress={() => {
                triggerHaptic('light');
                onDismiss();
              }}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {toast.message}
          </Text>

          {/* Acciones personalizadas (ej. presencia de amigos) */}
          {toast.actions && toast.actions.length > 0 && (
            <View style={styles.actionsRow}>
              {toast.actions.map((action, idx) => {
                const isPrimary = (action.variant || 'primary') === 'primary';
                const isDanger = action.variant === 'danger';
                return (
                  <Pressable
                    key={`${action.label}_${idx}`}
                    onPress={() => {
                      triggerHaptic('light');
                      action.onClick();
                      onDismiss();
                    }}
                    style={[
                      styles.actionBtn,
                      isPrimary
                        ? styles.actionPrimary
                        : isDanger
                        ? styles.actionDanger
                        : styles.actionSecondary,
                    ]}
                  >
                    <Text
                      style={
                        isPrimary
                          ? styles.actionTextPrimary
                          : isDanger
                          ? styles.actionTextDanger
                          : styles.actionTextSecondary
                      }
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Botones rápidos de Solicitud de Amistad */}
          {toast.friendRequestData && (
            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => {
                  triggerHaptic('card_tap');
                  onFriendRequestAction?.(toast.friendRequestData!.id, 'accepted');
                }}
                style={[styles.actionBtn, styles.actionAccept]}
              >
                <Text style={styles.actionTextAccept}>✓ Aceptar</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onFriendRequestAction?.(toast.friendRequestData!.id, 'rejected');
                }}
                style={[styles.actionBtn, styles.actionDanger]}
              >
                <Text style={styles.actionTextDanger}>✕ Rechazar</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  triggerHaptic('light');
                  onDismiss();
                  router.push('/(tabs)/social');
                  setTimeout(() => {
                    appEvents.emit('open_social_tab', { tab: 'requests' });
                  }, 100);
                }}
                style={[styles.actionBtn, styles.actionSecondary]}
              >
                <Text style={styles.actionTextSecondary}>Ver</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999998,
    elevation: 999998,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 19,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '900',
  },
  message: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionPrimary: {
    backgroundColor: '#fbbf24',
    borderColor: '#f59e0b',
  },
  actionTextPrimary: {
    color: '#020617',
    fontSize: 11,
    fontWeight: '900',
  },
  actionAccept: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
    flex: 1,
  },
  actionTextAccept: {
    color: '#020617',
    fontSize: 11,
    fontWeight: '900',
  },
  actionDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    flex: 1,
  },
  actionTextDanger: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  actionSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  actionTextSecondary: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
});
