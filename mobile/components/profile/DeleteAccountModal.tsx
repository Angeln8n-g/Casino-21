import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { ShieldAlert, Trash2, X, CheckCircle2 } from 'lucide-react-native';
import { requestAccountDeletion } from '../../services/accountService';
import { triggerHaptic } from '../../utils/haptics';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

const FEEDBACK_REASONS = [
  'No me gustó la dinámica o reglas del juego',
  'Es demasiado difícil o competitivo',
  'Problemas de conexión o rendimiento',
  'Falta de tiempo para jugar',
  'Solo estaba probando el juego',
  'Otro motivo',
];

export function DeleteAccountModal({
  isOpen,
  onClose,
  username = 'jugador',
}: DeleteAccountModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);
    triggerHaptic('card_tap');

    const result = await requestAccountDeletion(selectedReason || undefined);

    if (result.success) {
      triggerHaptic('success');
      setIsDone(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    } else {
      setIsDeleting(false);
      setErrorMessage(result.error || 'No se pudo completar la baja. Inténtalo de nuevo.');
      triggerHaptic('error');
    }
  };

  const cardWidth = Math.min(Math.max(windowWidth - 32, 280), 370);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => !isDeleting && onClose()}
      />

      <View
        style={{
          width: cardWidth,
          backgroundColor: '#0f172a',
          borderWidth: 1.5,
          borderColor: 'rgba(239, 68, 68, 0.45)',
          borderRadius: 24,
          padding: 20,
          overflow: 'hidden',
        }}
      >
        {isDone ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderWidth: 1,
                borderColor: 'rgba(16, 185, 129, 0.4)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <CheckCircle2 color="#34d399" size={36} />
            </View>
            <Text
              style={{
                color: '#ffffff',
                fontWeight: '800',
                fontSize: 20,
                textAlign: 'center',
                marginBottom: 8,
              }}
            >
              Baja completada
            </Text>
            <Text
              style={{
                color: '#cbd5e1',
                fontSize: 12,
                textAlign: 'center',
                lineHeight: 18,
                marginBottom: 12,
              }}
            >
              Tu cuenta y datos han sido eliminados de KASINO21 de forma permanente. Gracias por haber jugado con nosotros.
            </Text>
            <Text style={{ color: '#64748b', fontSize: 10 }}>Cerrando sesión...</Text>
          </View>
        ) : (
          <View>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.4)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldAlert color="#f87171" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>
                    Darse de baja
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 10 }}>
                    Eliminación permanente (GDPR)
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => !isDeleting && onClose()} style={{ padding: 4 }}>
                <X color="#94a3b8" size={18} />
              </Pressable>
            </View>

            <Text style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
              Hola <Text style={{ color: '#fbbf24', fontWeight: '800' }}>{username}</Text>, esta acción es irreversible. Se borrarán tus fichas, nivel, ELO, inventario y registros de partidas.
            </Text>

            {/* Motivo de salida */}
            <Text
              style={{
                color: '#94a3b8',
                fontSize: 11,
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              ¿Por qué deseas marcharte? (opcional)
            </Text>

            <ScrollView style={{ maxHeight: 176, marginBottom: 12 }}>
              {FEEDBACK_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <Pressable
                    key={reason}
                    onPress={() => {
                      triggerHaptic('light');
                      setSelectedReason(isSelected ? '' : reason);
                    }}
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      borderWidth: 1,
                      marginBottom: 6,
                      backgroundColor: isSelected
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(30, 41, 59, 0.85)',
                      borderColor: isSelected
                        ? 'rgba(239, 68, 68, 0.5)'
                        : 'rgba(51, 65, 85, 0.6)',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: isSelected ? '#fca5a5' : '#cbd5e1',
                        fontWeight: isSelected ? '700' : '400',
                      }}
                    >
                      {reason}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {errorMessage && (
              <Text
                style={{
                  color: '#f87171',
                  fontSize: 12,
                  textAlign: 'center',
                  marginBottom: 12,
                  fontWeight: '700',
                }}
              >
                {errorMessage}
              </Text>
            )}

            {/* Botones de acción */}
            <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
              <Pressable
                disabled={isDeleting}
                onPress={onClose}
                style={{
                  flex: 1,
                  backgroundColor: '#1e293b',
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#334155',
                }}
              >
                <Text style={{ color: '#cbd5e1', fontWeight: '700', fontSize: 12 }}>
                  Cancelar
                </Text>
              </Pressable>

              <Pressable
                disabled={isDeleting}
                onPress={handleDelete}
                style={{
                  flex: 1,
                  backgroundColor: '#dc2626',
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Trash2 color="#ffffff" size={14} />
                    <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 12 }}>
                      Eliminar Cuenta
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
