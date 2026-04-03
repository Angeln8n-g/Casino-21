// Feature: react-native-game-migration
// Requirements: 10.3, 10.4, 10.5
import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useSocial } from '../hooks/useSocial';
import type { DirectMessage } from '../services/socialService';

export interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationCenter = React.memo<NotificationCenterProps>(({ visible, onClose }) => {
  const { gameInvitations, acceptGameInvitation, rejectGameInvitation, friends } = useSocial();

  // Collect recent DMs: last message per friend (simplified — friends list used as proxy)
  const recentDMs: DirectMessage[] = [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Notificaciones</Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Text style={styles.closeBtn}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Game Invitations */}
          <Text style={styles.sectionTitle}>Invitaciones de juego</Text>
          {gameInvitations.length === 0 ? (
            <Text style={styles.empty}>Sin invitaciones pendientes</Text>
          ) : (
            gameInvitations.map((inv) => (
              <View key={inv.id} style={styles.invitationRow}>
                <Text style={styles.invitationText}>
                  {inv.sender_username} te invita a jugar
                </Text>
                <View style={styles.invitationActions}>
                  <Pressable
                    style={[styles.actionBtn, styles.joinBtn]}
                    onPress={() => acceptGameInvitation(inv.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Unirse"
                  >
                    <Text style={styles.actionBtnText}>Unirse</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => rejectGameInvitation(inv.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Rechazar"
                  >
                    <Text style={styles.actionBtnText}>Rechazar</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          {/* Direct Messages */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Mensajes directos</Text>
          {friends.length === 0 ? (
            <Text style={styles.empty}>Sin mensajes recientes</Text>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.dmRow}>
                <View style={[styles.statusDot, friend.status === 'online' ? styles.online : styles.offline]} />
                <Text style={styles.dmText}>{friend.username}</Text>
              </View>
            ))
          )}

          {/* System Notifications */}
          <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Notificaciones del sistema</Text>
          <Text style={styles.empty}>Sin notificaciones nuevas</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
});

NotificationCenter.displayName = 'NotificationCenter';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#6b7280',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    color: '#9ca3af',
    fontSize: 18,
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionSpacing: {
    marginTop: 20,
  },
  empty: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
  },
  invitationRow: {
    backgroundColor: '#374151',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  invitationText: {
    color: '#f3f4f6',
    fontSize: 14,
    marginBottom: 10,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinBtn: {
    backgroundColor: '#2563eb',
  },
  rejectBtn: {
    backgroundColor: '#6b7280',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  dmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  online: {
    backgroundColor: '#22c55e',
  },
  offline: {
    backgroundColor: '#6b7280',
  },
  dmText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
});

export default NotificationCenter;
