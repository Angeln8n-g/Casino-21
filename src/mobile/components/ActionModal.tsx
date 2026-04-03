import React, { useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Action } from '../../application/action-validator';
import { Card } from '../../domain/card';
import ActionPanel from './ActionPanel';

export interface ActionModalProps {
  visible: boolean;
  validActions: Action[];
  selectedHandCard: Card | null;
  selectedBoardCards: Card[];
  onActionSelect: (action: Action) => void;
  onClose: () => void;
}

const ActionModal = React.memo<ActionModalProps>(({
  visible,
  validActions,
  selectedHandCard,
  selectedBoardCards,
  onActionSelect,
  onClose,
}) => {
  const handleActionSelect = useCallback(
    (action: Action) => {
      onActionSelect(action);
      onClose();
    },
    [onActionSelect, onClose],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <Text style={styles.title}>Selecciona una acción</Text>
          <ActionPanel
            validActions={validActions}
            selectedHandCard={selectedHandCard}
            selectedBoardCards={selectedBoardCards}
            onActionSelect={handleActionSelect}
            onCancel={onClose}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
});

ActionModal.displayName = 'ActionModal';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#6b7280',
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
});

export default ActionModal;
