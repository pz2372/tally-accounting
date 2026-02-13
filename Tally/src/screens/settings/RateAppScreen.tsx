import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

interface RateAppScreenProps {
  onBack: () => void;
}

export default function RateAppScreen({ onBack }: RateAppScreenProps) {
  const { t } = useContext(LanguageContext);
  const [rating, setRating] = React.useState(0);

  const getRatingText = (stars: number) => {
    switch(stars) {
      case 5: return t('rateApp.amazing');
      case 4: return t('rateApp.great');
      case 3: return t('rateApp.good');
      case 2: return t('rateApp.fair');
      case 1: return t('rateApp.poor');
      default: return '';
    }
  };

  const handleRate = (stars: number) => {
    setRating(stars);
    if (stars >= 4) {
      Alert.alert(
        t('rateApp.thankYou'),
        t('rateApp.rateAppStore'),
        [
          { text: t('rateApp.notNow'), style: 'cancel' },
          { 
            text: t('rateApp.rateButton'),
            onPress: () => {
              // Open App Store
              Alert.alert(t('rateApp.success'), t('rateApp.thanksSupport'));
              onBack();
            }
          },
        ]
      );
    } else {
      Alert.alert(
        t('rateApp.feedback'),
        t('rateApp.notSatisfied'),
        [
          { text: t('rateApp.notNow'), style: 'cancel' },
          { text: t('rateApp.contactSupport'), onPress: () => {} },
        ]
      );
    }
  };

  const swipeHandlers = useSwipeBack(onBack);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('rateApp.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.ratingSection}>
            <View style={styles.iconCircle}>
              <Ionicons name="heart" size={48} color="#EF4444" />
            </View>
            
            <Text style={styles.ratingTitle}>{t('rateApp.enjoying')}</Text>
            <Text style={styles.ratingSubtitle}>
              {t('rateApp.feedbackHelps')}
            </Text>

            {/* Star Rating */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRate(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={48}
                    color={star <= rating ? '#F59E0B' : colors.textTertiary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {rating > 0 && (
              <Text style={styles.ratingText}>
                {getRatingText(rating)}
              </Text>
            )}
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
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
    marginTop: 2,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  ratingSection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.xxl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ratingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  ratingSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  starButton: {
    padding: spacing.xs,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  benefits: {
    marginHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
});
