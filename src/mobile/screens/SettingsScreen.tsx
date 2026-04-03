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
  const [prefs, setPrefs] = useState<UserPreferences>({ soundEnabled: true, hapticsEnabled: true, volume: 1.0 });
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
    try { await persistenceService.savePreferences(updated); } finally { setSaving(false); }
  }, []);

  const handleSoundToggle = useCallback((value: boolean) => {
    const u = { ...prefs, soundEnabled: value }; setPrefs(u); savePrefs(u);
  }, [prefs, savePrefs]);

  const handleHapticsToggle = useCallback((value: boolean) => {
    const u = { ...prefs, hapticsEnabled: value }; setPrefs(u); savePrefs(u);
  }, [prefs, savePrefs]);

  const handleVolumeDecrease = useCallback(() => {
    const v = Math.max(0, Math.round((prefs.volume - 0.1) * 10) / 10);
    const u = { ...prefs, volume: v }; setPrefs(u); savePrefs(u);
  }, [prefs, savePrefs]);

  const handleVolumeIncrease = useCallback(() => {
    const v = Math.min(1.0, Math.round((prefs.volume + 0.1) * 10) / 10);
    const u = { ...prefs, volume: v }; setPrefs(u); savePrefs(u);
  }, [prefs, savePrefs]);

  const handleBack = useCallback(() => { if (navigation.canGoBack()) navigation.goBack(); }, [navigation]);
  const volumePercent = Math.round(prefs.volume * 100);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}><ActivityIndicator color={PURPLE} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </Pressable>
        <Text style={styles.headerTitle}>⚙️ Configuración</Text>
        <View style={{ width: 56 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>🔊 SONIDO</Text>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Sonido activado</Text>
              <Text style={styles.rowSub}>Efectos de sonido del juego</Text>
            </View>
            <Switch value={prefs.soundEnabled} onValueChange={handleSoundToggle}
              trackColor={{ false: BORDER, true: PURPLE }} thumbColor={prefs.soundEnabled ? '#a78bfa' : '#9ca3af'} testID="sound-toggle" />
          </View>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Volumen</Text>
              <Text style={styles.rowSub}>{volumePercent}%</Text>
            </View>
            <View style={styles.volRow}>
              <Pressable onPress={handleVolumeDecrease} disabled={prefs.volume <= 0}
                style={({ pressed }) => [styles.volBtn, prefs.volume <= 0 && styles.disabled, pressed && styles.pressed]}>
                <Text style={styles.volBtnText}>−</Text>
              </Pressable>
              <View style={styles.volBar}>
                <View style={[styles.volFill, { width: (volumePercent + '%') as any }]} />
              </View>
              <Pressable onPress={handleVolumeIncrease} disabled={prefs.volume >= 1.0}
                style={({ pressed }) => [styles.volBtn, prefs.volume >= 1.0 && styles.disabled, pressed && styles.pressed]}>
                <Text style={styles.volBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>📳 VIBRACIÓN</Text>
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowTitle}>Vibración activada</Text>
              <Text style={styles.rowSub}>Retroalimentación háptica al jugar</Text>
            </View>
            <Switch value={prefs.hapticsEnabled} onValueChange={handleHapticsToggle}
              trackColor={{ false: BORDER, true: PURPLE }} thumbColor={prefs.hapticsEnabled ? '#a78bfa' : '#9ca3af'} testID="haptics-toggle" />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backBtnText: { color: '#9ca3af', fontSize: 14 },
  headerTitle: { flex: 1, color: '#f9fafb', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10, gap: 12, borderWidth: 1, borderColor: BORDER },
  rowInfo: { flex: 1 },
  rowTitle: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  rowSub: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  volBtnText: { color: '#f9fafb', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  volBar: { width: 80, height: 6, backgroundColor: BORDER, borderRadius: 3, overflow: 'hidden' },
  volFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 3 },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.75 },
  savingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  savingText: { color: '#9ca3af', fontSize: 13 },
});

export default SettingsScreen;
