import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';

interface ExpenseDetailsScreenProps {
    expense: {
        id: string;
        date: string;
        day: number;
        vendor: string;
        category: string;
        status: 'Approved' | 'Pending';
        amount: number;
    };
    onBack: () => void;
}

const getCategoryColor = (category: string): string => {
    switch (category) {
        case 'Software & SaaS':
            return colors.purple;
        case 'Travel':
            return colors.blue;
        case 'Office Supplies':
            return colors.gray;
        case 'Meals & Drinks':
            return colors.red;
        case 'Miscellaneous':
            return colors.orange;
        default:
            return colors.gray;
    }
};

const formatDate = (dateStr: string, day: number): string => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = dateStr === 'JAN' ? 0 : dateStr === 'FEB' ? 1 : 0; // Simplified
    const date = new Date(2026, monthIndex, day);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return `${dayNames[date.getDay()]}, ${months[monthIndex]} ${day}`;
};

export default function ExpenseDetailsScreen({ expense, onBack }: ExpenseDetailsScreenProps) {
    const { t } = useContext(LanguageContext);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editCategory, setEditCategory] = useState(expense.category);
    const [editDescription, setEditDescription] = useState('Monthly Subscription');

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
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
                            <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(expense.category) }]}>
                                <Text style={styles.categoryTagText}>{expense.category}</Text>
                            </View>
                        </View>
                        <Text style={styles.vendorName}>{expense.vendor}</Text>
                        <Text style={styles.amount}>${expense.amount.toFixed(2)}</Text>

                        
                        <Text style={styles.description}>Monthly Subscription</Text>
                                                <Text style={styles.expenseDate}>{formatDate(expense.date, expense.day)}</Text>
                    </View>

                    {/* Receipt Section */}
                    <View style={styles.receiptSection}>
                        <Ionicons name="document-outline" size={64} color={colors.textTertiary} />
                        <Text style={styles.receiptText}>{t('details.noReceipt')}</Text>
                        <TouchableOpacity style={styles.uploadButton}>
                            <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                            <Text style={styles.uploadButtonText}>{t('details.uploadReceipt')}</Text>
                        </TouchableOpacity>
                    </View>

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
                            <Text style={styles.deleteButtonText}>Delete</Text>
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
                            <Text style={styles.modalTitle}>Delete Expense?</Text>
                            <Text style={styles.modalMessage}>Are you sure you want to delete this expense? This action cannot be undone.</Text>
                            <View style={styles.modalButtons}>
                                <TouchableOpacity 
                                    style={styles.modalCancelButton}
                                    onPress={() => setShowDeleteModal(false)}
                                >
                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.modalDeleteButton}
                                    onPress={() => {
                                        setShowDeleteModal(false);
                                        // Handle delete logic here
                                    }}
                                >
                                    <Text style={styles.modalDeleteText}>Delete</Text>
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
                        <View style={styles.editModalContent}>
                            <View style={styles.editModalHeader}>
                                <Text style={styles.modalTitle}>Edit Expense</Text>
                                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                                    <Ionicons name="close" size={24} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Category</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editCategory}
                                    onChangeText={setEditCategory}
                                    placeholder="Enter category"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    placeholder="Enter description"
                                />
                            </View>

                            <TouchableOpacity 
                                style={styles.saveButton}
                                onPress={() => {
                                    setShowEditModal(false);
                                    // Handle save logic here
                                }}
                            >
                                <Text style={styles.saveButtonText}>Save Changes</Text>
                            </TouchableOpacity>
                        </View>
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
        ...typography.title,
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
        padding: spacing.xxl,
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
});
