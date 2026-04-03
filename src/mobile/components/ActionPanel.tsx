import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Action, ActionType } from '../../application/action-validator';
import { Card } from '../../domain/card';

export interface ActionPanelProps {
  validActions: Action[];
  selectedHandCard: Card | null;
  selectedBoardCards: Card[];
  onActionSelect: (action: Action) => void;
  onCancel: () => void;
}

const ACTION_LABELS: Record<ActionType, string> = {
  colocar: 'Colocar',
  llevar: 'Llevar',
  formar: 'Formar',
  formarPar: 'Formar Par',
  aumentarFormacion: 'Aumentar Formación',
  cantar: 'Cantar',
};

const ActionPanel = React.memo<ActionPanelProps>(({
  validActions,
  onActionSelect,
  onCancel,
}) => {
  const actionButtons = useMemo(
    () =>
      validActions.map((action) => ({
        action,
        label: ACTION_LABELS[action.type] ?? action.type,
      })),
    [validActions],
  );

  return (
    <View style={styles.container}>
      {actionButtons.map(({ action, label }) => (
        <Pressable
          key={`${action.type}-${action.cardId}`}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => onActionSelect(action)}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
      ))}
      <Pressable
        style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.buttonPressed]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Cancelar"
      >
        <Text style={[styles.buttonText, styles.cancelText]}>Cancelar</Text>
      </Pressable>
    </View>
  );
});

ActionPanel.displayName = 'ActionPanel';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelText: {
    color: '#e5e7eb',
  },
});

export default ActionPanel;
