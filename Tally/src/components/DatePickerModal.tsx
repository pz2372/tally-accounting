import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius } from '../styles/theme';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (event: any, date?: Date) => void;
  onClose: () => void;
}

export default function DatePickerModal({ 
  visible, 
  selectedDate, 
  onDateChange, 
  onClose 
}: DatePickerModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          <View style={styles.datePickerHeader}>
            <Text style={styles.datePickerTitle}>Select Date</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onDateChange}
            maximumDate={new Date()}
          />
          {Platform.OS === 'ios' && (
            <View style={styles.datePickerActions}>
              <TouchableOpacity 
                style={styles.doneButton}
                onPress={onClose}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '90%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  doneButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
});
