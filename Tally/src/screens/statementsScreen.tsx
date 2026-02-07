import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface StatementsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

interface Statement {
  id: number;
  name: string;
  period: string;
  uploadDate: string;
  totalTransactions: number;
  matchedTransactions: number;
  totalAmount: number;
  fileType: 'pdf' | 'csv' | 'qfx';
  status: 'processed' | 'processing' | 'error';
}

export default function StatementsScreen({ onBack, onNavigate }: StatementsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  
  // Check if selected month is current month or later
  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() || 
           (selectedMonth.getFullYear() === now.getFullYear() && 
            selectedMonth.getMonth() >= now.getMonth());
  };

  const statements: Statement[] = [
    {
      id: 1,
      name: 'January 2026 Statement',
      period: 'Jan 1 - Jan 31, 2026',
      uploadDate: 'Feb 1, 2026',
      totalTransactions: 92,
      matchedTransactions: 83,
      totalAmount: 12450.00,
      fileType: 'pdf',
      status: 'processed',
    },
    {
      id: 2,
      name: 'December 2025 Statement',
      period: 'Dec 1 - Dec 31, 2025',
      uploadDate: 'Jan 5, 2026',
      totalTransactions: 85,
      matchedTransactions: 78,
      totalAmount: 11230.50,
      fileType: 'csv',
      status: 'processed',
    },
    {
      id: 3,
      name: 'November 2025 Statement',
      period: 'Nov 1 - Nov 30, 2025',
      uploadDate: 'Dec 3, 2025',
      totalTransactions: 73,
      matchedTransactions: 68,
      totalAmount: 9845.75,
      fileType: 'pdf',
      status: 'processed',
    },
    {
      id: 4,
      name: 'October 2025 Statement',
      period: 'Oct 1 - Oct 31, 2025',
      uploadDate: 'Nov 2, 2025',
      totalTransactions: 81,
      matchedTransactions: 75,
      totalAmount: 10567.25,
      fileType: 'qfx',
      status: 'processed',
    },
  ];

  const filters = ['All', 'PDF', 'CSV', 'QFX'];

  const getFileIcon = (fileType: Statement['fileType']) => {
    switch (fileType) {
      case 'pdf':
        return 'document-text';
      case 'csv':
        return 'grid';
      case 'qfx':
        return 'code-working';
      default:
        return 'document';
    }
  };

  const getStatusColor = (status: Statement['status']) => {
    switch (status) {
      case 'processed':
        return colors.primary;
      case 'processing':
        return colors.orange;
      case 'error':
        return colors.red;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: Statement['status']) => {
    switch (status) {
      case 'processed':
        return 'Processed';
      case 'processing':
        return 'Processing...';
      case 'error':
        return 'Error';
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
          <Text style={styles.headerTitle}>{t('statements.title')}</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => onNavigate('uploadStatement')}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
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
          {/* Statements Grid */}
          <View style={styles.statementsGrid}>
            {statements.map((statement) => (
              <TouchableOpacity key={statement.id} style={styles.statementCard}>
                {/* Statement Image/Preview */}
                <View style={styles.statementImageContainer}>
                  <Ionicons 
                    name={getFileIcon(statement.fileType) as any} 
                    size={48} 
                    color={colors.primary} 
                  />
                  <View style={styles.fileTypeBadge}>
                    <Text style={styles.fileTypeText}>{statement.fileType.toUpperCase()}</Text>
                  </View>
                </View>
                
                {/* Statement Name */}
                <Text style={styles.statementName}>{statement.name}</Text>
                
                {/* Statement Info */}
                <Text style={styles.statementInfo}>
                  {statement.matchedTransactions}/{statement.totalTransactions} matched
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
  statementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingBottom: spacing.xl,
  },
  statementCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  statementImageContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  fileTypeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  fileTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },
  statementName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  statementInfo: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
