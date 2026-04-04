// Feature: react-native-game-migration
// Requirements: 16.1, 16.2, 16.3, 16.4
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { persistenceService, UserPreferences } from '../services/persistenceService';

const BG = '#0f0f1a';
const CARD = '#1a1a2e';
const BORDER = '#2a2a40';
const PURPLE = '#7c3aed';

export function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const [prefs, setPrefs] = useState<UserPreferences>({
    soundEnabled: true,
    hapticsEnabled: true,
    volume: 1.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    persistenceService.getPreferences().then((loaded) => {
      if (!cancelled) { setPrefs(loaded); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const savePrefs = useCallback(async (updated: UserPreferences) => {
    setSaving(true);
    try { await persistenceService.savePreferences(updated); }
    finally { setSaving(false); }
  }, []);

  const handleSoundToggle = useCallback((value: boolean) => {
    const updated = { ...prefs, soundEnabled: value };
    setPrefs(updated);
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleHapticsToggle = useCallback((value: boolean) => {
    const updated = { ...prefs, hapticsEnabled: value };
    setPrefs(updated);
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleVolumeDecrease = useCallback(() => {
    const newVolume = Math.max(0, Math.round((prefs.volume - 0.1) * 10) / 10);
    const updated = { ...prefs, volume: newVolume };
    setPrefs(updated);
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleVolumeIncrease = useCallback(() => {
    const newVolume = Math.min(1.0, Math.round((prefs.volume + 0.1) * 10) / 10);
    const updated = { ...prefs, volume: newVolume };
    setPrefs(updated);
    savePrefs(updated);
  }, [prefs, savePrefs]);

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
  }, [navigation]);

  const volumePercent = Math.round(prefs.volume * 100);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator color={PURPLE} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>⚙️ Configuración</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Sound */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔊 SONIDO</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Sonido activado</Text>
              <Text style={styles.rowSubtitle}>Efectos de sonido del juego</Text>
            </View>
            <Switch
              value={prefs.soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: BORDER, true: PURPLE }}
              thumbColor={prefs.soundEnabled ? '#a78bfa' : '#9ca3af'}
              testID="sound-toggle"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Volumen</Text>
              <Text style={styles.rowSubtitle}>{volumePercent}%</Text>
            </View>
            <View style={styles.volumeControls}>
              <Pressable
                onPress={handleVolumeDecrease}
                style={({ pressed }) => [styles.volumeButton, prefs.volume <= 0 && styles.volumeButtonDisabled, pressed && styles.pressed]}
                disabled={prefs.volume <= 0}
                testID="volume-decrease"
              >
                <Text style={styles.volumeButtonText}>−</Text>
              </Pressable>
              <View style={styles.volumeBar}>
                <View style={[styles.volumeFill, { width: `${volumePercent}%` as any }]} />
              </View>
              <Pressable
                onPress={handleVolumeIncrease}
                style={({ pressed }) => [styles.volumeButton, prefs.volume >= 1.0 && styles.volumeButtonDisabled, pressed && styles.pressed]}
                disabled={prefs.volume >= 1.0}
                testID="volume-increase"
              >
                <Text style={styles.volumeButtonText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Haptics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📳 VIBRACIÓN</Text>

          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Vibración activada</Text>
              <Text style={styles.rowSubtitle}>Retroalimentación háptica al jugar</Text>
            </View>
            <Switch
              value={prefs.hapticsEnabled}
              onValueChange={handleHapticsToggle}
              trackColor={{ false: BORDER, true: PURPLE }}
              thumbColor={prefs.hapticsEnabled ? '#a78bfa' : '#9ca3af'}
              testID="haptics-toggle"
            />
          </View>
        </View>

        {saving && (
          <View style={styles.savingRow}>
            <ActivityIndicator color={PURPLE} size="small" />
            <Text style={styles.savingText}>Guardando...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backButton: { paddingVertical: 4, paddingRight: 8 },
  backButtonText: { color: '#9ca3af', fontSize: 14 },
  headerTitle: { flex: 1, color: '#f9fafb', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 56 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionLabel: {
    color: '#6b7280', fontSize: 11, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    marginBottom: 10, gap: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  rowInfo: { flex: 1 },
  rowTitle: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  rowSubtitle: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  volumeControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volumeButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center',
  },
  volumeButtonDisabled: { opacity: 0.4 },
  volumeButtonText: { color: '#f9fafb', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  volumeBar: { width: 80, height: 6, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden' },
  volumeFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 3 },
  pressed: { opacity: 0.75 },
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  savingText: { color: '#9ca3af', fontSize: 13 },
});

export default SettingsScreen;
