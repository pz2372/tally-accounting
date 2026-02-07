import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface SalesReportScreenProps {
  onBack: () => void;
}

interface SalesReport {
  id: number;
  date: string;
  day: number;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  status: 'completed' | 'processing' | 'pending';
}

export default function SalesReportScreen({ onBack }: SalesReportScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Check if selected month is current month or later
  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() || 
           (selectedMonth.getFullYear() === now.getFullYear() && 
            selectedMonth.getMonth() >= now.getMonth());
  };

  const salesReports: SalesReport[] = [
    {
      id: 1,
      date: 'Feb 1, 2026',
      day: 1,
      totalSales: 1245.50,
      totalOrders: 23,
      averageOrderValue: 54.15,
      status: 'completed',
    },
    {
      id: 2,
      date: 'Jan 31, 2026',
      day: 31,
      totalSales: 1567.80,
      totalOrders: 31,
      averageOrderValue: 50.57,
      status: 'completed',
    },
    {
      id: 3,
      date: 'Jan 30, 2026',
      day: 30,
      totalSales: 987.25,
      totalOrders: 18,
      averageOrderValue: 54.85,
      status: 'completed',
    },
    {
      id: 4,
      date: 'Jan 29, 2026',
      day: 29,
      totalSales: 2134.90,
      totalOrders: 42,
      averageOrderValue: 50.83,
      status: 'completed',
    },
    {
      id: 5,
      date: 'Jan 28, 2026',
      day: 28,
      totalSales: 1456.75,
      totalOrders: 27,
      averageOrderValue: 53.95,
      status: 'completed',
    },
    {
      id: 6,
      date: 'Jan 27, 2026',
      day: 27,
      totalSales: 1789.40,
      totalOrders: 35,
      averageOrderValue: 51.13,
      status: 'completed',
    },
  ];

  const getStatusColor = (status: SalesReport['status']) => {
    switch (status) {
      case 'completed':
        return colors.primary;
      case 'processing':
        return colors.orange;
      case 'pending':
        return colors.textTertiary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: SalesReport['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing...';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('salesReport.title')}</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Month Toggle */}
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(newDate.getMonth() - 1);
              setSelectedMonth(newDate);
            }}
          >
            <Text style={styles.navButtonText}>‹</Text>
          </TouchableOpacity>
          
          <View style={styles.monthInfo}>
            <Text style={styles.monthText}>
              {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.navButton}
            onPress={() => {
              const newDate = new Date(selectedMonth);
              newDate.setMonth(newDate.getMonth() + 1);
              setSelectedMonth(newDate);
            }}
            disabled={isCurrentOrFutureMonth()}
          >
            <Text style={[styles.navButtonText, isCurrentOrFutureMonth() && styles.navButtonDisabled]}>›</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Sales Reports Grid */}
          <View style={styles.reportsGrid}>
            {salesReports.map((report) => (
              <TouchableOpacity key={report.id} style={styles.reportCard}>
                {/* Report Icon */}
                <View style={styles.reportImageContainer}>
                  <Ionicons 
                    name="stats-chart" 
                    size={48} 
                    color={colors.primary} 
                  />
                </View>
                
                {/* Report Date */}
                <Text style={styles.reportDate}>{report.date}</Text>
                
                {/* Sales Info */}
                <Text style={styles.reportSales}>
                  ${report.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </TouchableOpacity>
            ))}
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
  headerButton: {
    padding: spacing.xs,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  navButtonDisabled: {
    color: colors.borderLight,
    opacity: 0.5,
  },
  monthInfo: {
    alignItems: 'center',
    flex: 1,
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  reportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  reportCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  reportImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportDate: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  reportSales: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  reportOrders: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
