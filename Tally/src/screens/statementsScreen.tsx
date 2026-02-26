import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Dimensions, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getCachedData, CACHE_KEYS } from '../services/cacheService';
import { getAccessToken, refreshAccessToken } from '../services/authService';
import { useSwipeBack } from '../hooks/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface StatementsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  selectedOrgId?: string | null;
}

interface Statement {
  id: string;
  name: string;
  period: string;
  uploadDate: string;
  totalTransactions: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  totalAmount: number;
  type: 'statement' | 'sales';
  sourceType?: string;
  status: 'processed' | 'processing' | 'error';
  fileUrl?: string;
  grossSalesCents?: number;
  netSalesCents?: number;
  cashCents?: number;
  tipsCents?: number;
  taxCents?: number;
  discountsCents?: number;
  refundsCents?: number;
  notes?: string;
}

interface StatementTransactionItem {
  id: string;
  postedDate: string;
  merchantRaw: string;
  merchantNorm?: string;
  amountCents: number;
  currency: string;
  last4?: string;
  matches: any[];
}

export default function StatementsScreen({ onBack, onNavigate, selectedOrgId }: StatementsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'statement' | 'sales'>('all');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [selectedSalesReport, setSelectedSalesReport] = useState<Statement | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [statementTransactions, setStatementTransactions] = useState<StatementTransactionItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'unmatched'>('all');
  
  // Check if selected month is current month or later
  const isCurrentOrFutureMonth = () => {
    const now = new Date();
    return selectedMonth.getFullYear() > now.getFullYear() || 
           (selectedMonth.getFullYear() === now.getFullYear() && 
            selectedMonth.getMonth() >= now.getMonth());
  };

  useEffect(() => {
    loadStatements();
  }, [selectedMonth]);

  const loadStatements = async () => {
    try {
      setIsLoading(true);

      let firstOrgId = selectedOrgId;
      if (!firstOrgId) {
        const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
        if (!userDataStr) { setStatements([]); setIsLoading(false); return; }
        const userData = JSON.parse(userDataStr);
        firstOrgId = userData?.organizations?.[0]?.id;
      }
      if (!firstOrgId) { setStatements([]); setIsLoading(false); return; }

      // Format month for query (YYYY-MM)
      const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
      const cacheKey = `${CACHE_KEYS.ORG_STATEMENTS}${firstOrgId}_${monthKey}`;

      // Show cached data immediately, then always fetch fresh from server
      const cachedStatements = await getCachedData(cacheKey);

      if (cachedStatements && Array.isArray(cachedStatements) && cachedStatements.length > 0) {
        setStatements(cachedStatements);
        setIsLoading(false);
      }
      
      const token = await getAccessToken();
      if (!token) {
        setStatements([]);
        setIsLoading(false);
        return;
      }

      try {
        const [statementsResponse, salesResponse] = await Promise.all([
          axios.get(
            `${API_URL}/api/statements`,
            {
              params: { statementMonth: monthKey },
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Org-Id': firstOrgId
              }
            }
          ),
          axios.get(
            `${API_URL}/api/sales-reports`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'X-Org-Id': firstOrgId
              }
            }
          )
        ]);

        const transformedDocuments: Statement[] = [];

        // Transform statements
        if (statementsResponse.data.success && statementsResponse.data.statements) {
          const transformedStatements: Statement[] = statementsResponse.data.statements.map((stmt: any) => ({
            id: stmt.id,
            name: stmt.provider || 'Bank Statement',
            period: stmt.statementMonth || '',
            uploadDate: new Date(stmt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalTransactions: stmt._count?.transactions || 0,
            matchedTransactions: stmt.matchedTransactions || 0,
            unmatchedTransactions: stmt.unmatchedTransactions || 0,
            totalAmount: 0,
            type: 'statement' as const,
            sourceType: stmt.sourceType || 'csv',
            status: stmt.processingStatus === 'COMPLETED' ? 'processed' : stmt.processingStatus === 'FAILED' ? 'error' : 'processing'
          }));
          transformedDocuments.push(...transformedStatements);
        }

        // Transform sales reports
        if (salesResponse.data.success && salesResponse.data.reports) {
          const transformedSales: Statement[] = salesResponse.data.reports
            .filter((report: any) => {
              const reportDate = new Date(report.businessDate);
              return reportDate.getFullYear() === selectedMonth.getFullYear() && 
                     reportDate.getMonth() === selectedMonth.getMonth();
            })
            .map((report: any) => ({
              id: report.id,
              name: 'Daily Sales Report',
              period: new Date(report.businessDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              uploadDate: new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              totalTransactions: 0,
              matchedTransactions: 0,
              unmatchedTransactions: 0,
              totalAmount: report.netSales || 0,
              type: 'sales' as const,
              sourceType: 'sales',
              status: report.status === 'APPROVED' ? 'processed' : report.status === 'REJECTED' ? 'error' : 'processing',
              fileUrl: report.fileUrl || undefined,
              grossSalesCents: report.grossSalesCents ?? undefined,
              netSalesCents: report.netSalesCents ?? undefined,
              cashCents: report.cashCents ?? undefined,
              tipsCents: report.tipsCents ?? undefined,
              taxCents: report.taxCents ?? undefined,
              discountsCents: report.discountsCents ?? undefined,
              refundsCents: report.refundsCents ?? undefined,
              notes: report.notes || undefined,
            }));
          transformedDocuments.push(...transformedSales);
        }

        // Sort by upload date (most recent first)
        transformedDocuments.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

        // Save to cache
        await AsyncStorage.setItem(cacheKey, JSON.stringify(transformedDocuments));

        setStatements(transformedDocuments);
      } catch (apiError: any) {
        // If 401, try refreshing token and retry once
        if (apiError.response?.status === 401) {
          const newToken = await refreshAccessToken();
          
          if (newToken) {
            const [retryStatementsResponse, retrySalesResponse] = await Promise.all([
              axios.get(
                `${API_URL}/api/statements`,
                {
                  params: { statementMonth: monthKey },
                  headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'X-Org-Id': firstOrgId
                  }
                }
              ),
              axios.get(
                `${API_URL}/api/sales-reports`,
                {
                  headers: {
                    'Authorization': `Bearer ${newToken}`,
                    'X-Org-Id': firstOrgId
                  }
                }
              )
            ]);

            const transformedDocuments: Statement[] = [];

            if (retryStatementsResponse.data.success && retryStatementsResponse.data.statements) {
              const transformedStatements: Statement[] = retryStatementsResponse.data.statements.map((stmt: any) => ({
                id: stmt.id,
                name: stmt.provider || 'Bank Statement',
                period: stmt.statementMonth || '',
                uploadDate: new Date(stmt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                totalTransactions: stmt._count?.transactions || 0,
                matchedTransactions: stmt.matchedTransactions || 0,
                unmatchedTransactions: stmt.unmatchedTransactions || 0,
                totalAmount: 0,
                type: 'statement' as const,
                sourceType: stmt.sourceType || 'csv',
                status: stmt.processingStatus === 'COMPLETED' ? 'processed' : stmt.processingStatus === 'FAILED' ? 'error' : 'processing'
              }));
              transformedDocuments.push(...transformedStatements);
            }

            if (retrySalesResponse.data.success && retrySalesResponse.data.reports) {
              const transformedSales: Statement[] = retrySalesResponse.data.reports
                .filter((report: any) => {
                  const reportDate = new Date(report.businessDate);
                  return reportDate.getFullYear() === selectedMonth.getFullYear() &&
                         reportDate.getMonth() === selectedMonth.getMonth();
                })
                .map((report: any) => ({
                  id: report.id,
                  name: 'Daily Sales Report',
                  period: new Date(report.businessDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  uploadDate: new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                  totalTransactions: 0,
                  matchedTransactions: 0,
                  unmatchedTransactions: 0,
                  totalAmount: report.netSales || 0,
                  type: 'sales' as const,
                  sourceType: 'sales',
                  status: report.status === 'APPROVED' ? 'processed' : report.status === 'REJECTED' ? 'error' : 'processing',
                  fileUrl: report.fileUrl || undefined,
                  grossSalesCents: report.grossSalesCents ?? undefined,
                  netSalesCents: report.netSalesCents ?? undefined,
                  cashCents: report.cashCents ?? undefined,
                  tipsCents: report.tipsCents ?? undefined,
                  taxCents: report.taxCents ?? undefined,
                  discountsCents: report.discountsCents ?? undefined,
                  refundsCents: report.refundsCents ?? undefined,
                  notes: report.notes || undefined,
                }));
              transformedDocuments.push(...transformedSales);
            }

            transformedDocuments.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

            await AsyncStorage.setItem(cacheKey, JSON.stringify(transformedDocuments));
            setStatements(transformedDocuments);
          } else {
            throw apiError;
          }
        } else {
          throw apiError;
        }
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load statements. Please try again.');
      // If there's an error fetching, still show cached data if available
      let fallbackOrgId = selectedOrgId;
      if (!fallbackOrgId) {
        const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          fallbackOrgId = userData?.organizations?.[0]?.id;
        }
      }
      if (fallbackOrgId) {
        const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
        const cacheKey = `${CACHE_KEYS.ORG_STATEMENTS}${fallbackOrgId}_${monthKey}`;
        const cachedStatements = await getCachedData(cacheKey);
        setStatements(cachedStatements || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filters = ['All', 'PDF', 'CSV', 'QFX'];

  const getFileIcon = (type: Statement['type']) => {
    switch (type) {
      case 'statement':
        return 'document-text';
      case 'sales':
        return 'cash';
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
  // Filter statements based on selected type
  const filteredStatements = statements.filter(statement => {
    if (selectedFilter === 'all') return true;
    return statement.type === selectedFilter;
  });

  const loadStatementTransactions = async (statementId: string, filterUnmatched: boolean = false) => {
    try {
      setIsLoadingTransactions(true);
      const token = await getAccessToken();
      if (!token) return;

      let orgId = selectedOrgId;
      if (!orgId) {
        const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          orgId = userData?.organizations?.[0]?.id;
        }
      }
      if (!orgId) return;

      const params: any = {};
      if (filterUnmatched) params.hasMatch = 'false';

      const response = await axios.get(
        `${API_URL}/api/statements/${statementId}/transactions`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': orgId
          }
        }
      );

      if (response.data.success) {
        setStatementTransactions(response.data.transactions || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load transactions. Please try again.');
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleStatementPress = (statement: Statement) => {
    setSelectedStatement(statement);
    setTransactionFilter('all');
    loadStatementTransactions(statement.id);
  };

  const handleSalesReportPress = async (statement: Statement) => {
    // Build proxy image URL (server streams S3 privately)
    const token = await getAccessToken();
    let orgId = selectedOrgId;
    if (!orgId) {
      const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        orgId = userData?.organizations?.[0]?.id;
      }
    }
    setSelectedSalesReport({
      ...statement,
      fileUrl: statement.fileUrl ? `${API_URL}/api/sales-reports/${statement.id}/image` : undefined,
      _imageHeaders: token && orgId ? { Authorization: `Bearer ${token}`, 'X-Org-Id': orgId } : undefined,
    } as any);
  };

  const handleBackFromDetail = () => {
    setSelectedStatement(null);
    setSelectedSalesReport(null);
    setStatementTransactions([]);
  };

  const swipeHandlers = useSwipeBack(selectedStatement || selectedSalesReport ? handleBackFromDetail : onBack);

  // Statement detail view
  if (selectedStatement) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container} {...swipeHandlers}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackFromDetail} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedStatement.name}</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Statement summary */}
          <View style={styles.detailSummary}>
            <Text style={styles.detailPeriod}>{selectedStatement.period}</Text>
            <View style={styles.detailStats}>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{selectedStatement.totalTransactions}</Text>
                <Text style={styles.detailStatLabel}>Total</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatValue, { color: colors.primary }]}>{selectedStatement.matchedTransactions}</Text>
                <Text style={styles.detailStatLabel}>Matched</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatValue, { color: selectedStatement.unmatchedTransactions > 0 ? colors.red : colors.textPrimary }]}>
                  {selectedStatement.unmatchedTransactions}
                </Text>
                <Text style={styles.detailStatLabel}>Unmatched</Text>
              </View>
            </View>
          </View>

          {/* Filter toggle */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, transactionFilter === 'all' && styles.filterButtonActive]}
              onPress={() => {
                setTransactionFilter('all');
                loadStatementTransactions(selectedStatement.id, false);
              }}
            >
              <Text style={[styles.filterButtonText, transactionFilter === 'all' && styles.filterButtonTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, transactionFilter === 'unmatched' && styles.filterButtonActive]}
              onPress={() => {
                setTransactionFilter('unmatched');
                loadStatementTransactions(selectedStatement.id, true);
              }}
            >
              <Text style={[styles.filterButtonText, transactionFilter === 'unmatched' && styles.filterButtonTextActive]}>
                Unmatched
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoadingTransactions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : statementTransactions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={48} color={colors.primary} />
                <Text style={styles.emptyText}>
                  {transactionFilter === 'unmatched' ? 'All transactions matched!' : 'No transactions found'}
                </Text>
              </View>
            ) : (
              <View style={styles.statementsList}>
                {statementTransactions.map((txn) => {
                  const txnDate = new Date(txn.postedDate);
                  const hasMatch = txn.matches && txn.matches.length > 0;
                  return (
                    <View key={txn.id} style={styles.transactionCard}>
                      <View style={styles.transactionDate}>
                        <Text style={styles.transactionMonth}>
                          {txnDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                        </Text>
                        <Text style={styles.transactionDay}>{txnDate.getDate()}</Text>
                      </View>
                      <View style={styles.transactionContent}>
                        <Text style={styles.transactionMerchant} numberOfLines={1}>
                          {txn.merchantNorm || txn.merchantRaw}
                        </Text>
                        {txn.last4 && (
                          <Text style={styles.transactionLast4}>****{txn.last4}</Text>
                        )}
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={styles.transactionAmount}>
                          ${(txn.amountCents / 100).toFixed(2)}
                        </Text>
                        <View style={[styles.matchBadge, hasMatch ? styles.matchedBadge : styles.unmatchedBadge]}>
                          <Text style={[styles.matchBadgeText, hasMatch ? styles.matchedBadgeText : styles.unmatchedBadgeText]}>
                            {hasMatch ? 'Matched' : 'Unmatched'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Sales report detail view
  if (selectedSalesReport) {
    const formatCents = (cents?: number) => {
      if (cents === undefined || cents === null) return '-';
      return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const salesFields = [
      { label: 'Gross Sales', value: selectedSalesReport.grossSalesCents },
      { label: 'Net Sales', value: selectedSalesReport.netSalesCents },
      { label: 'Cash', value: selectedSalesReport.cashCents },
      { label: 'Tips', value: selectedSalesReport.tipsCents },
      { label: 'Tax', value: selectedSalesReport.taxCents },
      { label: 'Discounts', value: selectedSalesReport.discountsCents },
      { label: 'Refunds', value: selectedSalesReport.refundsCents },
    ].filter(f => f.value !== undefined && f.value !== null);

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container} {...swipeHandlers}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackFromDetail} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sales Report</Text>
            <View style={{ width: 32 }} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Image thumbnail — tap to view fullscreen */}
            {selectedSalesReport.fileUrl && (
              <TouchableOpacity
                style={styles.salesImageContainer}
                activeOpacity={0.8}
                onPress={() => setShowImageViewer(true)}
              >
                <Image
                  source={{
                    uri: selectedSalesReport.fileUrl,
                    headers: (selectedSalesReport as any)._imageHeaders,
                  }}
                  style={styles.salesImage}
                  resizeMode="contain"
                />
                <View style={styles.tapToZoomBadge}>
                  <Ionicons name="expand-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.tapToZoomText}>Tap to zoom</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Date */}
            <View style={styles.salesInfoCard}>
              <Text style={styles.salesInfoLabel}>Business Date</Text>
              <Text style={styles.salesInfoValue}>{selectedSalesReport.period}</Text>
            </View>

            {/* Financial breakdown */}
            {salesFields.length > 0 && (
              <View style={styles.salesBreakdownCard}>
                {salesFields.map((field, index) => (
                  <View key={field.label} style={[styles.salesBreakdownRow, index < salesFields.length - 1 && styles.salesBreakdownBorder]}>
                    <Text style={styles.salesBreakdownLabel}>{field.label}</Text>
                    <Text style={styles.salesBreakdownValue}>{formatCents(field.value)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Notes */}
            {selectedSalesReport.notes && (
              <View style={styles.salesInfoCard}>
                <Text style={styles.salesInfoLabel}>Notes</Text>
                <Text style={styles.salesInfoValue}>{selectedSalesReport.notes}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Fullscreen image viewer with pinch-to-zoom */}
        {selectedSalesReport.fileUrl && (
          <Modal
            visible={showImageViewer}
            transparent
            animationType="fade"
            onRequestClose={() => setShowImageViewer(false)}
          >
            <View style={styles.imageViewerOverlay}>
              <TouchableOpacity
                style={styles.imageViewerClose}
                onPress={() => setShowImageViewer(false)}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>

              <ScrollView
                style={styles.imageViewerScroll}
                contentContainerStyle={styles.imageViewerContent}
                maximumZoomScale={5}
                minimumZoomScale={1}
                bouncesZoom
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <Image
                  source={{
                    uri: selectedSalesReport.fileUrl,
                    headers: (selectedSalesReport as any)._imageHeaders,
                  }}
                  style={styles.imageViewerImage}
                  resizeMode="contain"
                />
              </ScrollView>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
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

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'all' && styles.filterButtonTextActive,
            ]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'statement' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter('statement')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'statement' && styles.filterButtonTextActive,
            ]}>
              Statements
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'sales' && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedFilter('sales')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'sales' && styles.filterButtonTextActive,
            ]}>
              Sales
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading statements...</Text>
            </View>
          ) : statements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No statements found</Text>
              <Text style={styles.emptySubtext}>Upload a statement to get started</Text>
            </View>
          ) : filteredStatements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No {selectedFilter === 'all' ? 'documents' : selectedFilter === 'statement' ? 'statements' : 'sales reports'} found</Text>
              <Text style={styles.emptySubtext}>Try selecting a different filter or month.</Text>
            </View>
          ) : (
            <View style={styles.statementsList}>
              {filteredStatements
                .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())
                .map((statement) => (
                <TouchableOpacity
                  key={statement.id}
                  style={styles.statementCard}
                  onPress={() => {
                    if (statement.type === 'statement') {
                      handleStatementPress(statement);
                    } else if (statement.type === 'sales') {
                      handleSalesReportPress(statement);
                    }
                  }}
                >
                  <View style={styles.statementIconContainer}>
                    <Ionicons
                      name={getFileIcon(statement.type) as any}
                      size={28}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.statementContent}>
                    <Text style={styles.statementName}>{statement.name}</Text>
                    <Text style={styles.statementDate}>{statement.uploadDate}</Text>
                  </View>
                  <View style={styles.statementRight}>
                    <View style={[styles.fileTypeBadge, statement.sourceType === 'plaid' && styles.plaidBadge]}>
                      <Text style={styles.fileTypeText}>
                        {statement.sourceType === 'plaid' ? 'PLAID' : statement.type === 'statement' ? 'STATEMENT' : 'SALES'}
                      </Text>
                    </View>
                    {statement.type === 'statement' && (
                      <View>
                        <Text style={styles.statementInfo}>
                          {statement.matchedTransactions}/{statement.totalTransactions} matched
                        </Text>
                        {statement.unmatchedTransactions > 0 && (
                          <Text style={[styles.statementInfo, { color: colors.red }]}>
                            {statement.unmatchedTransactions} unmatched
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterButtonTextActive: {
    color: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  statementsList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  statementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  statementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementContent: {
    flex: 1,
  },
  statementRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  fileTypeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  fileTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.surface,
  },
  statementName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statementDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  statementInfo: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  plaidBadge: {
    backgroundColor: '#6366F1',
  },
  detailSummary: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailPeriod: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  detailStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  transactionDate: {
    alignItems: 'center',
    minWidth: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  transactionMonth: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  transactionDay: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  transactionContent: {
    flex: 1,
    gap: 2,
  },
  transactionMerchant: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  transactionLast4: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  matchBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  matchedBadge: {
    backgroundColor: '#DCFCE7',
  },
  unmatchedBadge: {
    backgroundColor: '#FEE2E2',
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  matchedBadgeText: {
    color: '#16A34A',
  },
  unmatchedBadgeText: {
    color: '#DC2626',
  },
  salesImageContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  salesImage: {
    width: Dimensions.get('window').width - spacing.xl * 2 - spacing.md * 2,
    height: 300,
    borderRadius: borderRadius.md,
  },
  salesInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  salesInfoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  salesInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  salesBreakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  salesBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  salesBreakdownBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  salesBreakdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  salesBreakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  tapToZoomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  tapToZoomText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 54,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageViewerScroll: {
    flex: 1,
  },
  imageViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
