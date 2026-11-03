import React from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';

interface AbandonConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AbandonConfirmModal({ visible, onConfirm, onCancel }: AbandonConfirmModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (!visible) return null;

  const cardWidth = Math.min(Math.max(windowWidth - 32, 280), 360);

  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        {
          width: windowWidth,
          height: windowHeight,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          zIndex: 999999,
          elevation: 999999,
        },
      ]}
    >
      {/* Fondo táctil para cerrar al tocar fuera */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={onCancel}
      />

      {/* Tarjeta central idéntica a la versión Web */}
      <View
        style={{
          width: cardWidth,
          backgroundColor: '#111827',
          borderWidth: 1.5,
          borderColor: 'rgba(239, 68, 68, 0.6)',
          borderRadius: 24,
          padding: 24,
          alignItems: 'center',
          shadowColor: '#ef4444',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 25,
          elevation: 30,
        }}
      >
        <Text style={{ fontSize: 44, marginBottom: 10 }}>⚠️</Text>

        <Text
          style={{
            color: '#f87171',
            fontWeight: '900',
            fontSize: 20,
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 10,
            textAlign: 'center',
          }}
        >
          ¿Abandonar Partida?
        </Text>

        <Text
          style={{
            color: '#d1d5db',
            fontWeight: '600',
            fontSize: 13,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: 22,
          }}
        >
          Si sales ahora, la partida terminará y perderás todas tus monedas apostadas y puntos ELO. El jugador oponente obtendrá la victoria.
        </Text>

        <View style={{ width: '100%', gap: 10 }}>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => ({
              width: '100%',
              backgroundColor: pressed ? '#b91c1c' : '#dc2626',
              paddingVertical: 13,
              borderRadius: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#f87171',
            })}
          >
            <Text
              style={{
                color: '#ffffff',
                fontWeight: '900',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Sí, Abandonar
            </Text>
          </Pressable>

          <Pressable
            onPress={onCancel}
            style={({ pressed }) => ({
              width: '100%',
              backgroundColor: pressed ? '#374151' : '#1f2937',
              paddingVertical: 13,
              borderRadius: 14,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#374151',
            })}
          >
            <Text
              style={{
                color: '#d1d5db',
                fontWeight: '700',
                fontSize: 14,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Cancelar
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
