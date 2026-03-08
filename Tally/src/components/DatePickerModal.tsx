import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

export type DateFilterMode = 'single' | 'range';

export interface DateRange {
  startDate: Date;
  endDate: Date;
  mode: DateFilterMode;
}

interface DatePickerModalProps {
  visible: boolean;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onClose: () => void;
  onReset?: () => void;
  onDateRangeChange?: (range: DateRange) => void;
}

export default function DatePickerModal({
  visible,
  selectedDate,
  onDateChange,
  onClose,
  onReset,
  onDateRangeChange,
}: DatePickerModalProps) {
  const { t } = useContext(LanguageContext);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleDayPress = (day: { dateString: string; timestamp: number }) => {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      // First tap or starting over: select start date
      setRangeStart(day.dateString);
      setRangeEnd(null);
    } else if (rangeStart === day.dateString) {
      // Tapped same date again: keep as single day
      return;
    } else {
      // Second tap on different date: create range
      const startTs = new Date(rangeStart).getTime();
      const endTs = day.timestamp;

      if (endTs < startTs) {
        setRangeEnd(rangeStart);
        setRangeStart(day.dateString);
      } else {
        setRangeEnd(day.dateString);
      }
    }
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const handleDone = () => {
    if (rangeStart && rangeEnd) {
      // Two dates selected: range filter
      const start = parseLocalDate(rangeStart);
      const end = parseLocalDate(rangeEnd);
      if (onDateRangeChange) {
        onDateRangeChange({ startDate: start, endDate: end, mode: 'range' });
      } else {
        onDateChange(start);
      }
    } else if (rangeStart) {
      // One date selected: single day filter
      onDateChange(parseLocalDate(rangeStart));
    }
    setRangeStart(null);
    setRangeEnd(null);
    onClose();
  };

  const handleReset = () => {
    setRangeStart(null);
    setRangeEnd(null);
    onReset?.();
    onClose();
  };

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};

    if (rangeStart && !rangeEnd) {
      // Single date selected
      marked[rangeStart] = {
        startingDay: true,
        endingDay: true,
        color: colors.primary,
        textColor: colors.surface,
      };
    } else if (rangeStart && rangeEnd) {
      // Range selected
      const start = new Date(rangeStart);
      const end = new Date(rangeEnd);
      const current = new Date(start);

      while (current <= end) {
        const key = formatDate(current);
        const isStart = key === rangeStart;
        const isEnd = key === rangeEnd;
        marked[key] = {
          startingDay: isStart,
          endingDay: isEnd,
          color: (isStart || isEnd) ? colors.primary : '#D1E4FF',
          textColor: (isStart || isEnd) ? colors.surface : colors.textPrimary,
        };
        current.setDate(current.getDate() + 1);
      }
    }

    return marked;
  };

  // Hint text showing selection state
  const getHintText = () => {
    if (!rangeStart) {
      return t('datePicker.selectStart') || 'Tap a date to select';
    }
    if (!rangeEnd) {
      const startFormatted = parseLocalDate(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startFormatted} — ${t('datePicker.selectEnd') || 'tap another for range'}`;
    }
    const startFormatted = parseLocalDate(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = parseLocalDate(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startFormatted} — ${endFormatted}`;
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
          {/* Selection hint */}
          <Text style={styles.rangeHint}>{getHintText()}</Text>

          <Calendar
            current={formatDate(selectedDate)}
            onDayPress={handleDayPress}
            maxDate={formatDate(new Date())}
            markingType="period"
            markedDates={getMarkedDates()}
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
                onPress={handleReset}
              >
                <Text style={styles.resetButtonText}>{t('datePicker.showAll')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.doneButton, !rangeStart && styles.doneButtonDisabled]}
              onPress={handleDone}
              disabled={!rangeStart}
            >
              <Text style={[styles.doneButtonText, !rangeStart && styles.doneButtonTextDisabled]}>
                {t('common.done')}
              </Text>
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
  rangeHint: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.md,
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
  doneButtonDisabled: {
    backgroundColor: colors.border,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.surface,
  },
  doneButtonTextDisabled: {
    color: colors.textTertiary,
  },
});
