import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';
import { getAccessToken } from '../../services/authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface RolesScreenProps {
  onBack: () => void;
  selectedOrgId?: string | null;
  currentUser?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    organizations?: Array<{ id: string; name: string; role?: string }>;
  } | null;
}

interface OrgMember {
  id: string;
  role: 'ADMIN' | 'EMPLOYEE';
  createdAt: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export default function RolesScreen({ onBack, currentUser, selectedOrgId }: RolesScreenProps) {
  const { t } = useContext(LanguageContext);
  const orgId = selectedOrgId || currentUser?.organizations?.[0]?.id;
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'Admin' | 'Employee'>('Employee');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Employee'>('Employee');
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const authHeaders = async () => {
    const token = await getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(orgId ? { 'x-org-id': orgId } : {}),
    };
  };

  const fetchMembers = async () => {
    if (!orgId) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/organizations/members`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.members)) {
        setMembers(data.members);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load members. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMembers([]);
    setIsLoading(true);
    fetchMembers();
  }, [orgId]);

  const handleInviteMember = async () => {
    const email = newMemberEmail.trim();
    if (!email) return;

    setIsSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/organizations/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          name: newMemberName.trim() || undefined,
          role: newMemberRole === 'Admin' ? 'ADMIN' : 'EMPLOYEE',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(t('uploadStatement.error'), data.error || 'Failed to invite member');
        return;
      }

      Alert.alert(t('common.success'), `Invite sent to ${email}`);
      handleCloseAdd();
      fetchMembers();
    } catch (error: any) {
      Alert.alert(t('uploadStatement.error'), error.message || 'Failed to invite member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMember = (member: OrgMember) => {
    setEditMemberId(member.id);
    setEditRole(member.role === 'ADMIN' ? 'Admin' : 'Employee');
  };

  const handleCloseEdit = () => {
    setEditMemberId(null);
  };

  const handleSaveEdit = async () => {
    if (!editMemberId) return;

    setIsSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/organizations/members/${editMemberId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          role: editRole === 'Admin' ? 'ADMIN' : 'EMPLOYEE',
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(t('uploadStatement.error'), data.error || 'Failed to update member');
        return;
      }

      handleCloseEdit();
      fetchMembers();
    } catch (error: any) {
      Alert.alert(t('uploadStatement.error'), error.message || 'Failed to update member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShowDeleteConfirm = (memberId: string) => {
    setDeleteMemberId(memberId);
    setShowDeleteModal(true);
  };

  const handleDeleteMember = async () => {
    if (!deleteMemberId) return;

    setIsSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/api/organizations/members/${deleteMemberId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(t('uploadStatement.error'), data.error || 'Failed to remove member');
        return;
      }

      setShowDeleteModal(false);
      setDeleteMemberId(null);
      fetchMembers();
    } catch (error: any) {
      Alert.alert(t('uploadStatement.error'), error.message || 'Failed to remove member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseDelete = () => {
    setShowDeleteModal(false);
    setDeleteMemberId(null);
  };

  const handleCloseAdd = () => {
    setShowAddModal(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberRole('Employee');
  };

  const isCurrentUser = (member: OrgMember) => member.user.email === currentUser?.email;

  const swipeHandlers = useSwipeBack(onBack);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('roles.title')}</Text>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={!isLoading && members.length === 0 ? styles.emptyContainer : undefined}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : members.length > 0 ? (
            <View style={styles.memberList}>
              {members.map((member) => {
                const isSelf = isCurrentUser(member);
                const isAdmin = member.role === 'ADMIN';
                return (
                  <View key={member.id} style={styles.memberCard}>
                    <View style={[styles.roleBadge, isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeEmployee]}>
                      <Text style={[styles.roleBadgeText, isAdmin ? styles.roleBadgeTextAdmin : styles.roleBadgeTextEmployee]}>
                        {isAdmin ? t('roles.admin') : t('roles.employee')}
                      </Text>
                    </View>
                    {!isSelf && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleEditMember(member)}
                        >
                          <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleShowDeleteConfirm(member.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.red} />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text style={styles.memberName}>
                      {member.user.name || member.user.email}
                    </Text>
                    <Text style={styles.memberMeta}>{member.user.email}</Text>
                    <Text style={styles.memberCreated}>
                      {t('roles.created')} {new Date(member.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyTitle}>{t('roles.noMembersYet')}</Text>
              <Text style={styles.emptySubtitle}>{t('roles.emptySubtitle')}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Invite Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseAdd}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('roles.addMember')}</Text>
              <TouchableOpacity onPress={handleCloseAdd}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('roles.name')}</Text>
                <TextInput
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  placeholder={t('roles.employeeNamePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('roles.email')}</Text>
                <TextInput
                  value={newMemberEmail}
                  onChangeText={setNewMemberEmail}
                  placeholder={t('roles.emailPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('roles.role')}</Text>
                <View style={styles.rolePicker}>
                  {(['Admin', 'Employee'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        newMemberRole === role && styles.roleOptionActive,
                      ]}
                      onPress={() => setNewMemberRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          newMemberRole === role && styles.roleOptionTextActive,
                        ]}
                      >
                        {role === 'Admin' ? t('roles.admin') : t('roles.employee')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!newMemberEmail.trim() || isSaving) && styles.saveButtonDisabled,
                ]}
                onPress={handleInviteMember}
                disabled={!newMemberEmail.trim() || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('roles.addMemberButton')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        visible={editMemberId !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('roles.editEmployee')}</Text>
              <TouchableOpacity onPress={handleCloseEdit}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('roles.role')}</Text>
                <View style={styles.rolePicker}>
                  {(['Admin', 'Employee'] as const).map((role) => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleOption,
                        editRole === role && styles.roleOptionActive,
                      ]}
                      onPress={() => setEditRole(role)}
                    >
                      <Text
                        style={[
                          styles.roleOptionText,
                          editRole === role && styles.roleOptionTextActive,
                        ]}
                      >
                        {role === 'Admin' ? t('roles.admin') : t('roles.employee')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={handleSaveEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>{t('roles.save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContent}>
            <Ionicons name="warning" size={48} color="#EF4444" style={{ marginBottom: spacing.lg }} />
            <Text style={styles.modalTitle}>{t('roles.deleteMember')}</Text>
            <Text style={styles.modalMessage}>{t('roles.deleteConfirm')}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCloseDelete}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDeleteButton, isSaving && { opacity: 0.5 }]}
                onPress={handleDeleteMember}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={styles.modalDeleteText}>{t('common.delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: spacing.lg,
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    paddingTop: spacing.xxxl,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    marginTop: '50%',
  },
  memberList: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  memberCard: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 100,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  roleBadgeAdmin: {
    backgroundColor: '#EFF6FF',
  },
  roleBadgeEmployee: {
    backgroundColor: '#F0FDF4',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadgeTextAdmin: {
    color: '#3B82F6',
  },
  roleBadgeTextEmployee: {
    color: '#22C55E',
  },
  memberMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  memberCreated: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  memberActions: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -1 }],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalScrollContent: {
    flexGrow: 0,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  rolePicker: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  roleOption: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  roleOptionTextActive: {
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.surface,
  },
  deleteModalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
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
});
