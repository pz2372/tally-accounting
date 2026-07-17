import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Dimensions, Modal, StatusBar, TextInput, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { getCachedData, CACHE_KEYS } from '../services/cacheService';
import { getAccessToken, refreshAccessToken } from '../services/authService';
import { useSwipeBack } from '../hooks/useSwipeBack';
import DatePickerModal from '../components/DatePickerModal';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://tally-accounting.onrender.com';

interface StatementsScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
  selectedOrgId?: string | null;
  onDataChanged?: () => void;
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
  creditCardCents?: number;
  takeoutCents?: number;
  tipsCents?: number;
  taxCents?: number;
  discountsCents?: number;
  refundsCents?: number;
  notes?: string;
  businessDate?: string; // Raw ISO date string for sales reports
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

export default function StatementsScreen({ onBack, onNavigate, selectedOrgId, onDataChanged }: StatementsScreenProps) {
  const { t, language } = useContext(LanguageContext);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const getLocale = () => {
    switch (language) {
      case 'es': return 'es-ES';
      case 'zh': return 'zh-CN';
      case 'id': return 'id-ID';
      default: return 'en-US';
    }
  };
  const [statements, setStatements] = useState<Statement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'statement' | 'sales'>('all');
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null);
  const [selectedSalesReport, setSelectedSalesReport] = useState<Statement | null>(null);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [statementTransactions, setStatementTransactions] = useState<StatementTransactionItem[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'unmatched'>('all');
  const [isDeletingSalesReport, setIsDeletingSalesReport] = useState(false);
  const [isDeletingStatement, setIsDeletingStatement] = useState(false);
  const [listImageHeaders, setListImageHeaders] = useState<Record<string, string> | null>(null);
  const [listImageViewerUri, setListImageViewerUri] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editDate, setEditDate] = useState(new Date());
  const [editGrossSales, setEditGrossSales] = useState('');
  const [editNetSales, setEditNetSales] = useState('');
  const [editCash, setEditCash] = useState('');
  const [editCreditCard, setEditCreditCard] = useState('');
  const [editTakeout, setEditTakeout] = useState('');
  const [editTips, setEditTips] = useState('');
  const [editTax, setEditTax] = useState('');
  const [editDiscounts, setEditDiscounts] = useState('');
  
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

      // Store headers for list thumbnail images
      if (token && firstOrgId) {
        setListImageHeaders({ Authorization: `Bearer ${token}`, 'X-Org-Id': firstOrgId });
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
            period: stmt.statementMonth ? stmt.statementMonth.split('-').reverse().join('-') : '',
            uploadDate: new Date(stmt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            totalTransactions: stmt._count?.transactions || 0,
            matchedTransactions: stmt.matchedTransactions || 0,
            unmatchedTransactions: stmt.unmatchedTransactions || 0,
            totalAmount: 0,
            type: 'statement' as const,
            sourceType: stmt.sourceType || 'csv',
            status: stmt.processingStatus === 'COMPLETED' ? 'processed' : stmt.processingStatus === 'FAILED' ? 'error' : 'processing',
            fileUrl: stmt.fileUrl || undefined,
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
              name: t('statements.dailySalesReport'),
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
              creditCardCents: report.creditCardCents ?? undefined,
              takeoutCents: report.takeoutCents ?? undefined,
              tipsCents: report.tipsCents ?? undefined,
              taxCents: report.taxCents ?? undefined,
              discountsCents: report.discountsCents ?? undefined,
              refundsCents: report.refundsCents ?? undefined,
              notes: report.notes || undefined,
              businessDate: report.businessDate,
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
                period: stmt.statementMonth ? stmt.statementMonth.split('-').reverse().join('-') : '',
                uploadDate: new Date(stmt.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                totalTransactions: stmt._count?.transactions || 0,
                matchedTransactions: stmt.matchedTransactions || 0,
                unmatchedTransactions: stmt.unmatchedTransactions || 0,
                totalAmount: 0,
                type: 'statement' as const,
                sourceType: stmt.sourceType || 'csv',
                status: stmt.processingStatus === 'COMPLETED' ? 'processed' : stmt.processingStatus === 'FAILED' ? 'error' : 'processing',
                fileUrl: stmt.fileUrl || undefined,
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
                  name: t('statements.dailySalesReport'),
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
                  creditCardCents: report.creditCardCents ?? undefined,
                  takeoutCents: report.takeoutCents ?? undefined,
                  tipsCents: report.tipsCents ?? undefined,
                  taxCents: report.taxCents ?? undefined,
                  discountsCents: report.discountsCents ?? undefined,
                  refundsCents: report.refundsCents ?? undefined,
                  notes: report.notes || undefined,
                  businessDate: report.businessDate,
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
      Alert.alert(t('common.error') || 'Error', t('statements.loadError'));
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
        return t('statements.processed');
      case 'processing':
        return t('statements.processing');
      case 'error':
        return t('statements.error');
      default:
        return t('statements.unknown');
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
      Alert.alert(t('common.error') || 'Error', t('statements.transactionLoadError'));
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleStatementPress = (statement: Statement) => {
    setSelectedStatement(statement);
    setTransactionFilter('all');
    loadStatementTransactions(statement.id);
  };

  const handleOpenStatementFile = async (statementId: string) => {
    try {
      const token = await getAccessToken();
      let orgId = selectedOrgId;
      if (!orgId) {
        const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          orgId = userData?.organizations?.[0]?.id;
        }
      }
      const response = await axios.get(`${API_URL}/api/statements/${statementId}/file-url`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Org-Id': orgId || '',
        },
      });
      if (response.data.success && response.data.url) {
        await Linking.openURL(response.data.url);
      }
    } catch {
      Alert.alert(t('common.error') || 'Error', t('statements.fileNotAvailable') || 'File not available');
    }
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

  const handleDeleteSalesReport = () => {
    if (!selectedSalesReport) return;
    Alert.alert(
      t('salesReport.deleteTitle'),
      t('salesReport.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeletingSalesReport(true);
            try {
              const token = await getAccessToken();
              let orgId = selectedOrgId;
              if (!orgId) {
                const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
                if (userDataStr) {
                  const userData = JSON.parse(userDataStr);
                  orgId = userData?.organizations?.[0]?.id;
                }
              }
              await axios.delete(
                `${API_URL}/api/sales-reports/${selectedSalesReport.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Org-Id': orgId || '',
                  },
                }
              );

              // Update sales reports cache
              if (orgId) {
                try {
                  const salesCacheKey = `${CACHE_KEYS.ORG_SALES_REPORTS}${orgId}`;
                  const raw = await AsyncStorage.getItem(salesCacheKey);
                  if (raw) {
                    const reports = JSON.parse(raw);
                    const updated = reports.filter((r: any) => r.id !== selectedSalesReport.id);
                    await AsyncStorage.setItem(salesCacheKey, JSON.stringify(updated));
                  }
                  // Clear statements cache for this month so it refetches
                  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
                  await AsyncStorage.removeItem(`${CACHE_KEYS.ORG_STATEMENTS}${orgId}_${monthKey}`);
                  // Clear home metrics so they recompute
                  await AsyncStorage.removeItem('@home_metrics');
                } catch {
                  // non-critical cache update
                }
              }

              handleBackFromDetail();
              loadStatements();
              onDataChanged?.();
            } catch {
              Alert.alert(t('common.error'), t('salesReport.deleteError'));
            } finally {
              setIsDeletingSalesReport(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteStatement = () => {
    if (!selectedStatement) return;
    Alert.alert(
      t('statements.deleteTitle') || 'Delete Statement',
      t('statements.deleteConfirm') || 'Are you sure you want to delete this statement and all its transactions?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setIsDeletingStatement(true);
            try {
              const token = await getAccessToken();
              let orgId = selectedOrgId;
              if (!orgId) {
                const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
                if (userDataStr) {
                  const userData = JSON.parse(userDataStr);
                  orgId = userData?.organizations?.[0]?.id;
                }
              }
              await axios.delete(
                `${API_URL}/api/statements/${selectedStatement.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'X-Org-Id': orgId || '',
                  },
                }
              );

              // Clear statements cache for this month
              if (orgId) {
                try {
                  const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
                  await AsyncStorage.removeItem(`${CACHE_KEYS.ORG_STATEMENTS}${orgId}_${monthKey}`);
                  await AsyncStorage.removeItem('@home_metrics');
                } catch {
                  // non-critical
                }
              }

              handleBackFromDetail();
              loadStatements();
              onDataChanged?.();
            } catch {
              Alert.alert(t('common.error'), t('statements.deleteError') || 'Failed to delete statement');
            } finally {
              setIsDeletingStatement(false);
            }
          },
        },
      ]
    );
  };

  const centsToDollarStr = (cents?: number) => {
    if (cents === undefined || cents === null) return '';
    return (cents / 100).toFixed(2);
  };

  const handleOpenEdit = () => {
    if (!selectedSalesReport) return;
    // Use raw businessDate ISO string for accurate date
    if (selectedSalesReport.businessDate) {
      const [y, m, d] = selectedSalesReport.businessDate.split('T')[0].split('-').map(Number);
      setEditDate(new Date(y, m - 1, d));
    } else {
      setEditDate(new Date());
    }
    setEditGrossSales(centsToDollarStr(selectedSalesReport.grossSalesCents));
    setEditNetSales(centsToDollarStr(selectedSalesReport.netSalesCents));
    setEditCash(centsToDollarStr(selectedSalesReport.cashCents));
    setEditCreditCard(centsToDollarStr(selectedSalesReport.creditCardCents));
    setEditTakeout(centsToDollarStr(selectedSalesReport.takeoutCents));
    setEditTips(centsToDollarStr(selectedSalesReport.tipsCents));
    setEditTax(centsToDollarStr(selectedSalesReport.taxCents));
    setEditDiscounts(centsToDollarStr(selectedSalesReport.discountsCents));
    setShowEditModal(true);
  };

  const dollarsToCents = (val: string): number | undefined => {
    if (!val || val.trim() === '') return undefined;
    const num = parseFloat(val);
    if (isNaN(num)) return undefined;
    return Math.round(num * 100);
  };

  const handleSaveEdit = async () => {
    if (!selectedSalesReport) return;
    setIsSavingEdit(true);
    try {
      const token = await getAccessToken();
      let orgId = selectedOrgId;
      if (!orgId) {
        const userDataStr = await AsyncStorage.getItem(CACHE_KEYS.USER);
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          orgId = userData?.organizations?.[0]?.id;
        }
      }

      const body: any = {};
      const grossCents = dollarsToCents(editGrossSales);
      const netCents = dollarsToCents(editNetSales);
      const cashCents = dollarsToCents(editCash);
      const creditCardCents = dollarsToCents(editCreditCard);
      const takeoutCents = dollarsToCents(editTakeout);
      const tipsCents = dollarsToCents(editTips);
      const taxCents = dollarsToCents(editTax);
      const discountsCents = dollarsToCents(editDiscounts);

      if (grossCents !== undefined) body.grossSalesCents = grossCents;
      if (netCents !== undefined) body.netSalesCents = netCents;
      if (cashCents !== undefined) body.cashCents = cashCents;
      if (creditCardCents !== undefined) body.creditCardCents = creditCardCents;
      if (takeoutCents !== undefined) body.takeoutCents = takeoutCents;
      if (tipsCents !== undefined) body.tipsCents = tipsCents;
      if (taxCents !== undefined) body.taxCents = taxCents;
      if (discountsCents !== undefined) body.discountsCents = discountsCents;

      // Send business date
      body.businessDate = editDate.toISOString();

      await axios.put(
        `${API_URL}/api/sales-reports/${selectedSalesReport.id}`,
        body,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Org-Id': orgId || '',
          },
        }
      );

      // Update cache
      if (orgId) {
        try {
          const salesCacheKey = `${CACHE_KEYS.ORG_SALES_REPORTS}${orgId}`;
          const raw = await AsyncStorage.getItem(salesCacheKey);
          if (raw) {
            const reports = JSON.parse(raw);
            const updated = reports.map((r: any) =>
              r.id === selectedSalesReport.id
                ? { ...r, ...body }
                : r
            );
            await AsyncStorage.setItem(salesCacheKey, JSON.stringify(updated));
          }
          const monthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;
          await AsyncStorage.removeItem(`${CACHE_KEYS.ORG_STATEMENTS}${orgId}_${monthKey}`);
          await AsyncStorage.removeItem('@home_metrics');
        } catch {
          // non-critical
        }
      }

      setShowEditModal(false);
      handleBackFromDetail();
      loadStatements();
      onDataChanged?.();
    } catch {
      Alert.alert(t('common.error'), t('salesReport.editError'));
    } finally {
      setIsSavingEdit(false);
    }
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
            <TouchableOpacity onPress={handleDeleteStatement} style={styles.headerActionButton} disabled={isDeletingStatement}>
              {isDeletingStatement ? (
                <ActivityIndicator size="small" color={colors.red} />
              ) : (
                <Ionicons name="trash-outline" size={22} color={colors.red} />
              )}
            </TouchableOpacity>
          </View>

          {/* Statement summary */}
          <View style={styles.detailSummary}>
            <Text style={styles.detailPeriod}>{selectedStatement.period}</Text>
            <View style={styles.detailStats}>
              <View style={styles.detailStat}>
                <Text style={styles.detailStatValue}>{selectedStatement.totalTransactions}</Text>
                <Text style={styles.detailStatLabel}>{t('statements.total')}</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatValue, { color: colors.primary }]}>{selectedStatement.matchedTransactions}</Text>
                <Text style={styles.detailStatLabel}>{t('statements.matchedLabel')}</Text>
              </View>
              <View style={styles.detailStat}>
                <Text style={[styles.detailStatValue, { color: selectedStatement.unmatchedTransactions > 0 ? colors.red : colors.textPrimary }]}>
                  {selectedStatement.unmatchedTransactions}
                </Text>
                <Text style={styles.detailStatLabel}>{t('statements.unmatched')}</Text>
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
                {t('statements.all')}
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
                {t('statements.unmatched')}
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
                  {transactionFilter === 'unmatched' ? t('statements.allMatched') : t('statements.noTransactions')}
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
      { label: t('salesReport.grossSales'), value: selectedSalesReport.grossSalesCents },
      { label: t('salesReport.netSales'), value: selectedSalesReport.netSalesCents },
      { label: t('statements.cash'), value: selectedSalesReport.cashCents },
      { label: t('salesReport.creditCard'), value: selectedSalesReport.creditCardCents },
      { label: t('salesReport.takeout'), value: selectedSalesReport.takeoutCents },
      { label: t('salesReport.tips'), value: selectedSalesReport.tipsCents },
      { label: t('salesReport.tax'), value: selectedSalesReport.taxCents },
      { label: t('salesReport.discounts'), value: selectedSalesReport.discountsCents },
      { label: t('salesReport.refunds'), value: selectedSalesReport.refundsCents },
    ].filter(f => f.value !== undefined && f.value !== null);

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.container} {...swipeHandlers}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackFromDetail} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('statements.salesReport')}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleOpenEdit} style={styles.headerActionButton}>
                <Ionicons name="create-outline" size={22} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSalesReport} style={styles.headerActionButton} disabled={isDeletingSalesReport}>
                {isDeletingSalesReport ? (
                  <ActivityIndicator size="small" color={colors.red} />
                ) : (
                  <Ionicons name="trash-outline" size={22} color={colors.red} />
                )}
              </TouchableOpacity>
            </View>
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
                  <Text style={styles.tapToZoomText}>{t('statements.tapToZoom')}</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Date */}
            <View style={styles.salesInfoCard}>
              <Text style={styles.salesInfoLabel}>{t('salesReport.businessDate')}</Text>
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
                <Text style={styles.salesInfoLabel}>{t('statements.notes')}</Text>
                <Text style={styles.salesInfoValue}>{selectedSalesReport.notes}</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Edit modal */}
        <Modal
          visible={showEditModal && !showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={styles.editModalOverlay}>
            <Pressable style={styles.editModalContent}>
              <View style={styles.editModalHeader}>
                <Text style={styles.editModalTitle}>{t('salesReport.editReport')}</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Date Picker */}
                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.businessDate')}</Text>
                  <TouchableOpacity
                    style={styles.editDateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.editDateButtonText}>
                      {(() => {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        return `${months[editDate.getMonth()]} ${editDate.getDate()}, ${editDate.getFullYear()}`;
                      })()}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.grossSales')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editGrossSales}
                    onChangeText={setEditGrossSales}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.netSales')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editNetSales}
                    onChangeText={setEditNetSales}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.cashRevenue')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editCash}
                    onChangeText={setEditCash}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.creditCard')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editCreditCard}
                    onChangeText={setEditCreditCard}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.takeout')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editTakeout}
                    onChangeText={setEditTakeout}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.tips')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editTips}
                    onChangeText={setEditTips}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.tax')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editTax}
                    onChangeText={setEditTax}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <View style={styles.editInputGroup}>
                  <Text style={styles.editInputLabel}>{t('salesReport.discounts')}</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editDiscounts}
                    onChangeText={setEditDiscounts}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.editSaveButton, isSavingEdit && { opacity: 0.6 }]}
                  onPress={handleSaveEdit}
                  disabled={isSavingEdit}
                >
                  <Text style={styles.editSaveButtonText}>
                    {isSavingEdit ? t('details.saving') || 'Saving...' : t('common.saveChanges') || 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </View>
        </Modal>

        <DatePickerModal
          visible={showDatePicker}
          selectedDate={editDate}
          onDateChange={(date) => setEditDate(date)}
          onClose={() => setShowDatePicker(false)}
        />

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
              {selectedMonth.toLocaleDateString(getLocale(), { month: 'long', year: 'numeric' })}
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
              {t('statements.all')}
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
              {t('statements.statementsFilter')}
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
              {t('statements.salesFilter')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('statements.loading')}</Text>
            </View>
          ) : statements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>{t('statements.noStatements')}</Text>
              <Text style={styles.emptySubtext}>{t('statements.uploadToStart')}</Text>
            </View>
          ) : filteredStatements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>{selectedFilter === 'all' ? t('statements.noDocuments') : selectedFilter === 'statement' ? t('statements.noStatements') : t('statements.noSalesReports')}</Text>
              <Text style={styles.emptySubtext}>{t('statements.tryDifferentFilter')}</Text>
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
                  {statement.type === 'sales' && listImageHeaders ? (
                    <TouchableOpacity
                      style={styles.statementThumbnailContainer}
                      onPress={(e) => {
                        e.stopPropagation();
                        setListImageViewerUri(`${API_URL}/api/sales-reports/${statement.id}/image`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{
                          uri: `${API_URL}/api/sales-reports/${statement.id}/image`,
                          headers: listImageHeaders,
                        }}
                        style={styles.statementThumbnail}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : statement.type === 'statement' && statement.fileUrl ? (
                    <TouchableOpacity
                      style={styles.statementFileThumbnail}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenStatementFile(statement.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={statement.sourceType === 'pdf' ? 'document-text' : 'document'}
                        size={24}
                        color={colors.primary}
                      />
                      <Text style={styles.statementFileLabel}>
                        {(statement.sourceType || 'pdf').toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.statementIconContainer}>
                      <Ionicons
                        name={getFileIcon(statement.type) as any}
                        size={28}
                        color={colors.primary}
                      />
                    </View>
                  )}
                  <View style={styles.statementContent}>
                    <Text style={styles.statementName}>{statement.name}</Text>
                    <Text style={styles.statementDate}>
                      {statement.type === 'sales' ? statement.period : statement.uploadDate}
                    </Text>
                  </View>
                  <View style={styles.statementRight}>
                    {statement.type === 'sales' && statement.netSalesCents !== undefined ? (
                      <Text style={styles.netSalesText}>
                        ${(statement.netSalesCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    ) : (
                      <View style={[styles.fileTypeBadge, statement.sourceType === 'plaid' && styles.plaidBadge]}>
                        <Text style={styles.fileTypeText}>
                          {statement.sourceType === 'plaid' ? 'PLAID' : 'STATEMENT'}
                        </Text>
                      </View>
                    )}
                    {statement.type === 'statement' && (
                      <View>
                        <Text style={styles.statementInfo}>
                          {statement.matchedTransactions}/{statement.totalTransactions} {t('statements.matched')}
                        </Text>
                        {statement.unmatchedTransactions > 0 && (
                          <Text style={[styles.statementInfo, { color: colors.red }]}>
                            {statement.unmatchedTransactions} {t('statements.unmatched').toLowerCase()}
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

      {/* List-level fullscreen image viewer */}
      {listImageViewerUri && listImageHeaders && (
        <Modal
          visible={!!listImageViewerUri}
          transparent
          animationType="fade"
          onRequestClose={() => setListImageViewerUri(null)}
        >
          <View style={styles.imageViewerOverlay}>
            <TouchableOpacity
              style={styles.imageViewerClose}
              onPress={() => setListImageViewerUri(null)}
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
                  uri: listImageViewerUri,
                  headers: listImageHeaders,
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
  statementThumbnailContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#EFF6FF',
  },
  statementThumbnail: {
    width: 48,
    height: 48,
  },
  statementFileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statementFileLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2,
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
  netSalesText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
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
    justifyContent: 'center',
  },
  detailStat: {
    width: '33.33%',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionButton: {
    padding: spacing.xs,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  editModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editInputGroup: {
    marginBottom: spacing.lg,
  },
  editInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  editInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  editDateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  editDateButtonText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  editSaveButton: {
    backgroundColor: '#10B981',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  editSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
});
