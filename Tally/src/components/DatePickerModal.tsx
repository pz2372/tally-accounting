import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
  onReset?: () => void;
}

export default function DatePickerModal({ 
  visible, 
  selectedDate, 
  onDateChange, 
  onClose,
  onReset
}: DatePickerModalProps) {
  const { t } = useContext(LanguageContext);
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

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
          <Calendar
            current={formatDate(selectedDate)}
            onDayPress={(day) => {
              onDateChange(new Date(day.timestamp));
            }}
            maxDate={formatDate(new Date())}
            markedDates={{
              [formatDate(selectedDate)]: {
                selected: true,
                selectedColor: colors.primary,
                selectedTextColor: colors.surface,
              }
            }}
            theme={{
              backgroundColor: colors.surface,
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textSecondary,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.surface,
              todayTextColor: colors.primary,
              dayTextColor: colors.textPrimary,
              textDisabledColor: colors.textTertiary,
              monthTextColor: colors.textPrimary,
              textMonthFontWeight: '700',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              arrowColor: colors.primary,
            }}
          />

          <View style={styles.datePickerActions}>
            {onReset && (
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => {
                  onReset();
                  onClose();
                }}
              >
                <Text style={styles.resetButtonText}>{t('datePicker.showAll')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={onClose}
            >
              <Text style={styles.doneButtonText}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
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
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  resetButton: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
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
