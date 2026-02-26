import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import { CATEGORIES, getCategoryColor as getColorFromCategories } from '../components/categories';
import { createAuthenticatedAxios, getAccessToken } from '../services/authService';
import { CACHE_KEYS } from '../services/cacheService';
import ScanScreen from './scanScreen';
import { useSwipeBack } from '../hooks/useSwipeBack';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ExpenseDetailsScreenProps {
    expense: {
        id: string;
        date: string;
        day: number;
        vendor: string;
        category: string;
        status: 'Approved' | 'Pending';
        amount: number;
        paymentMethod?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CHECK';
        orgCategoryId?: string;
        notes?: string;
    };
    onBack: () => void;
    onExpenseDeleted?: () => void;
    onExpenseUpdated?: () => void;
    selectedOrgId?: string | null;
}

const getCategoryColor = (category: string): string => {
    switch (category) {
        case 'Miscellaneous':
            return '#6B7280';
        case 'Labor':
            return '#9333EA';
        case 'Inventory':
            return '#10B981';
        case 'Operations':
            return '#F59E0B';
        case 'Tax':
            return '#EF4444';
        case 'Transportation':
            return '#3B82F6';
        default:
            return colors.gray;
    }
};

export default function ExpenseDetailsScreen({ expense, onBack, onExpenseDeleted, onExpenseUpdated, selectedOrgId }: ExpenseDetailsScreenProps) {
    const { t } = useContext(LanguageContext);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [showPaymentPicker, setShowPaymentPicker] = useState(false);
    const [editCategory, setEditCategory] = useState(expense.category);
    const [editPaymentMethod, setEditPaymentMethod] = useState<'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CHECK'>(expense.paymentMethod || 'CREDIT_CARD');
    const [editDescription, setEditDescription] = useState(expense.notes || '');
    const savedValues = useRef({ category: expense.category, paymentMethod: expense.paymentMethod || 'CREDIT_CARD', notes: expense.notes || '' });
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [showScanScreen, setShowScanScreen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
    const [imageHeaders, setImageHeaders] = useState<Record<string, string>>({});
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);

    useEffect(() => {
        const loadReceiptImage = async () => {
            try {
                const orgId = await getOrgId();
                if (!orgId) return;

                const token = await getAccessToken();
                if (!token) return;

                // Check if expense has a receipt by fetching from server
                const res = await fetch(`${API_URL}/api/expenses/${expense.id}`, {
                    headers: { Authorization: `Bearer ${token}`, 'x-org-id': orgId },
                });
                const data = await res.json();

                if (data.success && data.expense?.receiptUrl) {
                    setReceiptImageUrl(`${API_URL}/api/expenses/${expense.id}/image`);
                    setImageHeaders({ Authorization: `Bearer ${token}`, 'x-org-id': orgId });
                }
            } catch { }
        };
        loadReceiptImage();
    }, [expense.id]);

    const hasChanges = editCategory !== savedValues.current.category ||
        editPaymentMethod !== savedValues.current.paymentMethod ||
        editDescription !== savedValues.current.notes;

    const formatDate = (dateStr: string, day: number): string => {
        const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = dateStr === 'JAN' ? 0 : dateStr === 'FEB' ? 1 : 0; // Simplified
        const date = new Date(2026, monthIndex, day);
        return `${t('month.' + monthKeys[monthIndex])} ${day}, ${date.getFullYear()}`;
    };

    const getPaymentMethodDisplay = (method: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH' | 'CHECK' | undefined): { label: string; icon: string } => {
        switch (method) {
            case 'CREDIT_CARD':
                return { label: t('details.creditCard'), icon: 'card-outline' };
            case 'DEBIT_CARD':
                return { label: t('details.debitCard'), icon: 'card-outline' };
            case 'CASH':
                return { label: t('details.cash'), icon: 'cash-outline' };
            case 'CHECK':
                return { label: t('details.check'), icon: 'document-text-outline' };
            default:
                return { label: t('details.creditCard'), icon: 'card-outline' };
        }
    };

    const getOrgId = async (): Promise<string | null> => {
        if (selectedOrgId) return selectedOrgId;
        try {
            const userStr = await AsyncStorage.getItem('@current_user');
            if (!userStr) return null;
            const user = JSON.parse(userStr);
            return user.organizations?.[0]?.id || null;
        } catch {
            return null;
        }
    };

    const updateExpenseCache = async (orgId: string, updater: (expenses: any[]) => any[]) => {
        const key = `${CACHE_KEYS.ORG_EXPENSES}${orgId}`;
        const raw = await AsyncStorage.getItem(key);
        if (!raw) return;
        const expenses = JSON.parse(raw);
        const updated = updater(expenses);
        await AsyncStorage.setItem(key, JSON.stringify(updated));
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);
            const orgId = await getOrgId();
            if (!orgId) throw new Error('No org');

            const api = await createAuthenticatedAxios();
            await api.delete(`/api/expenses/${expense.id}`, {
                headers: { 'x-org-id': orgId }
            });

            // Remove from cache
            await updateExpenseCache(orgId, (expenses) =>
                expenses.filter((e: any) => e.id !== expense.id)
            );

            setShowDeleteModal(false);
            Alert.alert(t('common.success'), t('details.deleteSuccess'));
            onExpenseDeleted?.();
            onBack();
        } catch (error) {
            // Alert is shown below
            Alert.alert(t('common.error') || 'Error', t('details.deleteError'));
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSaveEdit = async () => {
        try {
            setIsSaving(true);
            const orgId = await getOrgId();
            if (!orgId) throw new Error('No org');

            const api = await createAuthenticatedAxios();
            const updatePayload: any = {
                paymentMethod: editPaymentMethod,
                notes: editDescription,
            };

            // If category changed, find the matching orgCategory
            if (editCategory !== expense.category) {
                // Load org categories from cache to find the orgCategoryId
                const orgCatsRaw = await AsyncStorage.getItem(`${CACHE_KEYS.ORG_CATEGORIES}${orgId}`);
                if (orgCatsRaw) {
                    const orgCats = JSON.parse(orgCatsRaw);
                    // Find org category whose preset name or custom name matches
                    const matchingOrgCat = orgCats.find((oc: any) => {
                        const name = oc.customName || oc.preset?.name;
                        return name === editCategory;
                    });
                    if (matchingOrgCat) {
                        updatePayload.orgCategoryId = matchingOrgCat.id;
                    }
                }
            }

            const response = await api.put(`/api/expenses/${expense.id}`, updatePayload, {
                headers: { 'x-org-id': orgId }
            });

            // Update cache
            if (response.data.success) {
                await updateExpenseCache(orgId, (expenses) =>
                    expenses.map((e: any) => {
                        if (e.id !== expense.id) return e;
                        return {
                            ...e,
                            paymentMethod: editPaymentMethod,
                            notes: editDescription,
                            ...(response.data.expense?.orgCategoryId && {
                                orgCategoryId: response.data.expense.orgCategoryId,
                                categoryNameSnapshot: response.data.expense.categoryNameSnapshot,
                            }),
                        };
                    })
                );
            }

            savedValues.current = { category: editCategory, paymentMethod: editPaymentMethod, notes: editDescription };
            setShowEditModal(false);
            setShowCategoryPicker(false);
            setShowPaymentPicker(false);
            Alert.alert(t('common.success'), t('details.editSuccess'));
            onExpenseUpdated?.();
        } catch (error) {
            // Alert is shown below
            Alert.alert(t('common.error') || 'Error', t('details.editError'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleTakePhoto = () => {
        setShowScanScreen(true);
    };
    
    const handleCaptureComplete = (imageUri: string) => {
        setSelectedReceipt(imageUri);
        setShowScanScreen(false);
    };
    
    const handleChooseFromLibrary = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (permissionResult.granted === false) {
            Alert.alert(t('alertDetail.permissionRequired'), t('alertDetail.photoLibraryPermission'));
            return;
        }
        
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });
        
        if (!result.canceled) {
            setSelectedReceipt(result.assets[0].uri);
        }
    };

    const swipeHandlers = useSwipeBack(onBack);

    if (showScanScreen) {
        return (
            <ScanScreen
                onCancel={() => setShowScanScreen(false)}
                onExpenseSaved={() => {
                    setShowScanScreen(false);
                    onExpenseUpdated?.();
                }}
                selectedOrgId={selectedOrgId}
            />
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
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>{t('details.title')}</Text>
                    </View>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Details Card */}
                    <View style={styles.detailsCard}>
                                                <View style={styles.tagsContainer}>
                            <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(editCategory) }]}>
                                <Text style={styles.categoryTagText}>
                                    {CATEGORIES.includes(editCategory)
                                        ? t('categories.' + editCategory.toLowerCase())
                                        : editCategory}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.vendorName}>{expense.vendor}</Text>
                        <Text style={styles.amount}>${expense.amount.toFixed(2)}</Text>

                        {/* Payment Method */}
                        <View style={styles.paymentMethodRow}>
                            <Ionicons
                                name={getPaymentMethodDisplay(editPaymentMethod).icon as any}
                                size={16}
                                color={colors.textSecondary}
                                style={{ marginRight: spacing.xs }}
                            />
                            <Text style={styles.paymentMethodText}>
                                {getPaymentMethodDisplay(editPaymentMethod).label}
                            </Text>
                        </View>


                        <Text style={styles.description}>{editDescription}</Text>
                                                <Text style={styles.expenseDate}>{formatDate(expense.date, expense.day)}</Text>
                    </View>

                    {/* Receipt Section */}
                    {receiptImageUrl ? (
                        <View style={styles.receiptImageSection}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => setShowImageViewer(true)}
                            >
                                {imageLoading && (
                                    <View style={styles.imageLoadingOverlay}>
                                        <ActivityIndicator size="small" color={colors.primary} />
                                    </View>
                                )}
                                <Image
                                    source={{ uri: receiptImageUrl, headers: imageHeaders }}
                                    style={styles.receiptImage}
                                    resizeMode="contain"
                                    onLoadStart={() => setImageLoading(true)}
                                    onLoadEnd={() => setImageLoading(false)}
                                />
                                <View style={styles.tapToZoomBadge}>
                                    <Ionicons name="expand-outline" size={14} color={colors.surface} />
                                    <Text style={styles.tapToZoomText}>{t('details.tapToZoom') || 'Tap to zoom'}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.receiptSection}>
                            <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
                            <Text style={styles.receiptText}>{t('details.noReceipt')}</Text>
                            <TouchableOpacity style={styles.uploadButton} onPress={() => {
                                Alert.alert(
                                    t('details.uploadReceipt'),
                                    '',
                                    [
                                        { text: t('newExpense.takePhoto'), onPress: handleTakePhoto },
                                        { text: t('newExpense.chooseFromLibrary'), onPress: handleChooseFromLibrary },
                                        { text: t('common.cancel'), style: 'cancel' },
                                    ],
                                    { cancelable: true }
                                );
                            }}>
                                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                                <Text style={styles.uploadButtonText}>{t('details.uploadReceipt')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                        <TouchableOpacity 
                            style={styles.editButtonLarge}
                            onPress={() => setShowEditModal(true)}
                        >
                            <Ionicons name="pencil-outline" size={20} color="#10B981" />
                            <Text style={styles.editButtonText}>{t('details.editExpense')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => setShowDeleteModal(true)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            <Text style={styles.deleteButtonText}>{t('details.deleteExpense')}</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>

                {/* Delete Confirmation Modal */}
                <Modal
                    visible={showDeleteModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowDeleteModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Ionicons name="warning" size={48} color="#EF4444" style={{ marginBottom: spacing.lg }} />
                            <Text style={styles.modalTitle}>{t('details.deleteTitle')}</Text>
                            <Text style={styles.modalMessage}>{t('details.deleteMessage')}</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowDeleteModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.modalDeleteButton, isDeleting && { opacity: 0.6 }]}
                                    onPress={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <Text style={styles.modalDeleteText}>{isDeleting ? t('details.deleting') : t('common.delete')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Edit Expense Modal */}
                <Modal
                    visible={showEditModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowEditModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <Pressable 
                            style={styles.editModalContent}
                            onPress={() => {
                                if (showCategoryPicker) setShowCategoryPicker(false);
                                if (showPaymentPicker) setShowPaymentPicker(false);
                            }}
                        >
                            <View style={styles.editModalHeader}>
                                <Text style={styles.modalTitle}>{t('details.editTitle')}</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={[styles.inputGroup, showCategoryPicker && styles.inputGroupActive]}>
                                <Text style={styles.inputLabel}>{t('details.category')}</Text>
                                <TouchableOpacity
                                    style={styles.categoryPickerButton}
                                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                                >
                                    <View style={styles.categoryPickerContent}>
                                        <View style={[
                                            styles.categoryColorDot,
                                            { backgroundColor: getColorFromCategories(editCategory) }
                                        ]} />
                                        <Text style={styles.categoryPickerText}>
                                            {CATEGORIES.includes(editCategory)
                                                ? t('categories.' + editCategory.toLowerCase())
                                                : editCategory}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {showCategoryPicker && (
                                    <Pressable
                                        style={styles.categoryDropdown}
                                        onPress={(e) => e.stopPropagation()}
                                    >
                                        <ScrollView style={styles.categoryDropdownScroll} nestedScrollEnabled>
                                            {CATEGORIES.map((category) => (
                                                <TouchableOpacity
                                                    key={category}
                                                    style={[
                                                        styles.categoryDropdownItem,
                                                        editCategory === category && styles.categoryDropdownItemSelected
                                                    ]}
                                                    onPress={() => {
                                                        setEditCategory(category);
                                                        setShowCategoryPicker(false);
                                                    }}
                                                >
                                                    <View style={styles.categoryDropdownItemContent}>
                                                        <View style={[
                                                            styles.categoryColorDot,
                                                            { backgroundColor: getColorFromCategories(category) }
                                                        ]} />
                                                        <Text style={[
                                                            styles.categoryDropdownItemText,
                                                            editCategory === category && styles.categoryDropdownItemTextSelected
                                                        ]}>{t('categories.' + category.toLowerCase())}</Text>
                                                    </View>
                                                    {editCategory === category && (
                                                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                                                    )}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </Pressable>
                                )}
                            </View>

                            {/* Payment Method Picker */}
                            <View style={[styles.inputGroup, showPaymentPicker && styles.inputGroupActive]}>
                                <Text style={styles.inputLabel}>{t('details.paymentMethod')}</Text>
                                <TouchableOpacity
                                    style={styles.categoryPickerButton}
                                    onPress={() => setShowPaymentPicker(!showPaymentPicker)}
                                >
                                    <View style={styles.categoryPickerContent}>
                                        <Ionicons 
                                            name={getPaymentMethodDisplay(editPaymentMethod).icon as any} 
                                            size={20} 
                                            color={colors.textPrimary}
                                            style={{ marginRight: spacing.xs }}
                                        />
                                        <Text style={styles.categoryPickerText}>
                                            {getPaymentMethodDisplay(editPaymentMethod).label}
                                        </Text>
                                    </View>
                                    <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>

                                {showPaymentPicker && (
                                    <Pressable
                                        style={styles.categoryDropdown}
                                        onPress={(e) => e.stopPropagation()}
                                    >
                                        <TouchableOpacity
                                            style={[
                                                styles.categoryDropdownItem,
                                                editPaymentMethod === 'CREDIT_CARD' && styles.categoryDropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setEditPaymentMethod('CREDIT_CARD');
                                                setShowPaymentPicker(false);
                                            }}
                                        >
                                            <View style={styles.categoryDropdownItemContent}>
                                                <Ionicons name="card-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                                                <Text style={[
                                                    styles.categoryDropdownItemText,
                                                    editPaymentMethod === 'CREDIT_CARD' && styles.categoryDropdownItemTextSelected
                                                ]}>{t('details.creditCard')}</Text>
                                            </View>
                                            {editPaymentMethod === 'CREDIT_CARD' && (
                                                <Ionicons name="checkmark" size={18} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.categoryDropdownItem,
                                                editPaymentMethod === 'DEBIT_CARD' && styles.categoryDropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setEditPaymentMethod('DEBIT_CARD');
                                                setShowPaymentPicker(false);
                                            }}
                                        >
                                            <View style={styles.categoryDropdownItemContent}>
                                                <Ionicons name="card-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                                                <Text style={[
                                                    styles.categoryDropdownItemText,
                                                    editPaymentMethod === 'DEBIT_CARD' && styles.categoryDropdownItemTextSelected
                                                ]}>{t('details.debitCard')}</Text>
                                            </View>
                                            {editPaymentMethod === 'DEBIT_CARD' && (
                                                <Ionicons name="checkmark" size={18} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.categoryDropdownItem,
                                                editPaymentMethod === 'CASH' && styles.categoryDropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setEditPaymentMethod('CASH');
                                                setShowPaymentPicker(false);
                                            }}
                                        >
                                            <View style={styles.categoryDropdownItemContent}>
                                                <Ionicons name="cash-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                                                <Text style={[
                                                    styles.categoryDropdownItemText,
                                                    editPaymentMethod === 'CASH' && styles.categoryDropdownItemTextSelected
                                                ]}>{t('details.cash')}</Text>
                                            </View>
                                            {editPaymentMethod === 'CASH' && (
                                                <Ionicons name="checkmark" size={18} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.categoryDropdownItem,
                                                editPaymentMethod === 'CHECK' && styles.categoryDropdownItemSelected
                                            ]}
                                            onPress={() => {
                                                setEditPaymentMethod('CHECK');
                                                setShowPaymentPicker(false);
                                            }}
                                        >
                                            <View style={styles.categoryDropdownItemContent}>
                                                <Ionicons name="document-text-outline" size={20} color={colors.textPrimary} style={{ marginRight: spacing.xs }} />
                                                <Text style={[
                                                    styles.categoryDropdownItemText,
                                                    editPaymentMethod === 'CHECK' && styles.categoryDropdownItemTextSelected
                                                ]}>{t('details.check')}</Text>
                                            </View>
                                            {editPaymentMethod === 'CHECK' && (
                                                <Ionicons name="checkmark" size={18} color={colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    </Pressable>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>{t('details.note')}</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    placeholder={t('details.notePlaceholder')}
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.saveButton, (isSaving || !hasChanges) && { opacity: 0.6 }]}
                                onPress={handleSaveEdit}
                                disabled={isSaving || !hasChanges}
                            >
                                <Text style={styles.saveButtonText}>{isSaving ? t('details.saving') : t('common.saveChanges')}</Text>
                            </TouchableOpacity>
                        </Pressable>
                    </View>
                </Modal>

                {/* Fullscreen Image Viewer */}
                <Modal
                    visible={showImageViewer}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowImageViewer(false)}
                >
                    <View style={styles.imageViewerOverlay}>
                        <TouchableOpacity
                            style={styles.imageViewerClose}
                            onPress={() => setShowImageViewer(false)}
                        >
                            <Ionicons name="close-circle" size={36} color="white" />
                        </TouchableOpacity>
                        <ScrollView
                            style={styles.imageViewerScroll}
                            contentContainerStyle={styles.imageViewerContent}
                            maximumZoomScale={5}
                            minimumZoomScale={1}
                            showsVerticalScrollIndicator={false}
                            showsHorizontalScrollIndicator={false}
                            bouncesZoom={true}
                        >
                            {receiptImageUrl && (
                                <Image
                                    source={{ uri: receiptImageUrl, headers: imageHeaders }}
                                    style={styles.fullscreenImage}
                                    resizeMode="contain"
                                />
                            )}
                        </ScrollView>
                    </View>
                </Modal>

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
        ...typography.heading,
        textAlign: 'center',
    },
    placeholder: {
        width: 32,
    },
    content: {
        flex: 1,
    },
    receiptSection: {
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxxl * 2,
        marginTop: spacing.lg,
        marginHorizontal: spacing.xxl,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    receiptText: {
        fontSize: 15,
        color: colors.textTertiary,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary + '10',
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    uploadButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.primary,
    },
    expenseInfo: {
        backgroundColor: colors.background,
        paddingHorizontal: spacing.xxl,
        paddingVertical: spacing.xl,
    },
    expenseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    detailsCard: {
        backgroundColor: colors.surface,
        marginHorizontal: spacing.xxl,
        marginTop: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.xxl,
        alignItems: 'center',
    },
    vendorName: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    expenseDate: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    amount: {
        fontSize: 36,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    tagsContainer: {
        marginBottom: spacing.md,
    },

    categoryTag: {
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
        borderRadius: borderRadius.sm,
    },
    categoryTagText: {
        fontSize: 13,
        color: colors.surface,
        fontWeight: '500',
    },
    description: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    paymentMethodRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.sm,
    },
    paymentMethodText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        marginHorizontal: spacing.xxl,
        marginTop: spacing.lg,
        marginBottom: spacing.xxl,
    },
    editButtonLarge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: '#D1FAE5',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    editButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#10B981',
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: '#FEE2E2',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: '#EF4444',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#EF4444',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        padding: spacing.xxl,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.md,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    modalDeleteButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: '#EF4444',
        alignItems: 'center',
    },
    modalDeleteText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.surface,
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
    inputGroup: {
        marginBottom: spacing.lg,
        position: 'relative',
        zIndex: 1,
    },
    inputGroupActive: {
        zIndex: 1000,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        fontSize: 15,
        color: colors.textPrimary,
    },
    categoryPickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    categoryPickerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    categoryPickerText: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    categoryColorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    categoryDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: spacing.xs,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        maxHeight: 250,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        overflow: 'hidden',
    },
    categoryDropdownScroll: {
        maxHeight: 250,
    },
    categoryDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    categoryDropdownItemSelected: {
        backgroundColor: colors.background,
    },
    categoryDropdownItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    categoryDropdownItemText: {
        fontSize: 15,
        color: colors.textPrimary,
    },
    categoryDropdownItemTextSelected: {
        fontWeight: '600',
        color: colors.primary,
    },
    saveButton: {
        backgroundColor: '#10B981',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.surface,
    },
    receiptImageSection: {
        marginTop: spacing.lg,
        marginHorizontal: spacing.xxl,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    receiptImage: {
        width: '100%',
        height: 300,
    },
    imageLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    tapToZoomBadge: {
        position: 'absolute',
        bottom: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    tapToZoomText: {
        fontSize: 11,
        color: colors.surface,
        fontWeight: '500',
    },
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.95)',
    },
    imageViewerClose: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
    },
    imageViewerScroll: {
        flex: 1,
    },
    imageViewerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullscreenImage: {
        width: '100%',
        height: '100%',
    },
});
