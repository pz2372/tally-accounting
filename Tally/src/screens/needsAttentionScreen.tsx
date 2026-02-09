import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import AlertDetailScreen from './alertDetailScreen';

interface NeedsAttentionScreenProps {
  onBack: () => void;
  alerts?: Alert[];
  onAlertsChange?: (alerts: Alert[]) => void;
}

interface Alert {
  id: number;
  type: 'missing-receipt' | 'unmatched-receipt' | 'duplicate' | 'review';
  title: string;
  description: string;
  date: string;
  day: number;
  amount?: number;
  vendor?: string;
}

// Swipeable Alert Card Component
const SwipeableAlertCard = React.forwardRef<{ close: () => void }, { 
  alert: Alert; 
  icon: any; 
  onPress: () => void; 
  onDismiss: () => void;
  dismissLabel: string;
}>(({ alert, icon, onPress, onDismiss, dismissLabel }, ref) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = React.useState(false);

  const closeSwipe = React.useCallback(() => {
    setIsOpen(false);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [translateX]);

  React.useImperativeHandle(ref, () => ({
    close: closeSwipe
  }), [closeSwipe]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0 && gestureState.dx <= 80) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 40) {
          // Open
          setIsOpen(true);
          Animated.spring(translateX, {
            toValue: 80,
            useNativeDriver: true,
            friction: 8,
          }).start();
        } else {
          // Close
          setIsOpen(false);
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeContainer}>
      {/* Dismiss Button (Hidden behind) */}
      <View style={styles.dismissButtonContainer}>
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={() => {
            closeSwipe();
            onDismiss();
          }}
        >
          <Ionicons name="close-circle" size={24} color={colors.surface} />
          <Text style={styles.dismissButtonText}>{dismissLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Alert Card */}
      <Animated.View
        style={[
          styles.swipeableCard,
          { transform: [{ translateX }] }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={styles.alertCard} 
          onPress={() => {
            if (isOpen) {
              closeSwipe();
            } else {
              onPress();
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.alertContainer}>
            <Text style={[styles.alertTitle, { color: icon.color }]}>{alert.title || icon.title}</Text>
            
            <View style={styles.alertBody}>
              <View style={styles.alertDate}>
                <Text style={styles.alertMonth}>{alert.date}</Text>
                <Text style={styles.alertDay}>{alert.day}</Text>
              </View>
              
              <View style={styles.alertContent}>
                {alert.vendor ? (
                  <View style={styles.alertDetails}>
                    <Text style={styles.alertVendor}>{alert.vendor}</Text>
                    {alert.amount !== undefined && (
                      <Text style={styles.alertAmount}>
                        ${alert.amount.toFixed(2)}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.alertDescription}>{alert.description}</Text>
                )}
              </View>
              
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

export default function NeedsAttentionScreen({ onBack, alerts: incomingAlerts, onAlertsChange }: NeedsAttentionScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedAlert, setSelectedAlert] = React.useState<Alert | null>(null);
  const swipeRefs = React.useRef<{ [key: number]: { close: () => void } | null }>({});
  const [alerts, setAlerts] = React.useState<Alert[]>([]);

  React.useEffect(() => {
    if (incomingAlerts !== undefined) {
      setAlerts(incomingAlerts);
    }
  }, [incomingAlerts]);

  const getAlertTitle = (type: Alert['type']) => {
    switch (type) {
      case 'missing-receipt':
        return t('alertDetail.missingReceipt');
      case 'unmatched-receipt':
        return t('alertDetail.unmatchedReceipt');
      case 'duplicate':
        return t('alertDetail.duplicate');
      case 'review':
        return t('alertDetail.review');
      default:
        return t('alertDetail.review');
    }
  };

  const updateAlerts = React.useCallback(
    (updater: (current: Alert[]) => Alert[]) => {
      setAlerts((current) => {
        const next = updater(current);
        onAlertsChange?.(next);
        return next;
      });
    },
    [onAlertsChange]
  );

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'missing-receipt':
        return { name: 'receipt-outline' as const, color: colors.red, title: getAlertTitle(type) };
      case 'unmatched-receipt':
        return { name: 'link-outline' as const, color: colors.orange, title: getAlertTitle(type) };
      case 'duplicate':
        return { name: 'copy-outline' as const, color: colors.purple, title: getAlertTitle(type) };
      case 'review':
        return { name: 'eye-outline' as const, color: colors.blue, title: getAlertTitle(type) };
      default:
        return { name: 'alert-circle-outline' as const, color: colors.red, title: getAlertTitle(type) };
    }
  };

  const handleDismiss = (alertId: number) => {
    updateAlerts((current) => current.filter((alert) => alert.id !== alertId));
  };

  const handleResolve = (alertId: number) => {
    updateAlerts((current) => current.filter((alert) => alert.id !== alertId));
  };

  // Show detail screen if an alert is selected
  if (selectedAlert) {
    return (
      <AlertDetailScreen
        alert={selectedAlert}
        onBack={() => setSelectedAlert(null)}
        onResolve={() => {
          handleResolve(selectedAlert.id);
          setSelectedAlert(null);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('needsAttention.title')}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{alerts.length}</Text>
              <Text style={styles.summaryLabel}>{t('needsAttention.totalIssues')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.red }]}>
                {alerts.filter(a => a.type === 'missing-receipt').length}
              </Text>
              <Text style={styles.summaryLabel}>{t('needsAttention.missingReceipts')}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.orange }]}>
                {alerts.filter(a => a.type === 'unmatched-receipt').length}
              </Text>
              <Text style={styles.summaryLabel}>{t('needsAttention.unmatched')}</Text>
            </View>
          </View>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => {
            // Close all swipes immediately when scroll begins
            Object.values(swipeRefs.current).forEach(ref => ref?.close());
          }}
        >
          {/* Alerts List */}
          <View style={styles.alertsList}>
            {alerts.map((alert) => {
              const icon = getAlertIcon(alert.type);
              
              return (
                <SwipeableAlertCard
                  key={alert.id}
                  ref={(ref) => {
                    swipeRefs.current[alert.id] = ref;
                  }}
                  alert={alert}
                  icon={icon}
                  onPress={() => setSelectedAlert(alert)}
                  onDismiss={() => handleDismiss(alert.id)}
                  dismissLabel={t('needsAttention.dismiss')}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.xl,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  alertsList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  swipeContainer: {
    position: 'relative',
  },
  dismissButtonContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dismissButton: {
    flex: 1,
    backgroundColor: colors.red,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dismissButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.surface,
  },
  swipeableCard: {
    backgroundColor: colors.background,
  },
  alertCard: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertContainer: {
    gap: spacing.md,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertDate: {
    alignItems: 'center',
    minWidth: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.sm,
  },
  alertMonth: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray,
    letterSpacing: 0.5,
  },
  alertDay: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  alertContent: {
    flex: 1,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  alertDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertVendor: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  alertAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
