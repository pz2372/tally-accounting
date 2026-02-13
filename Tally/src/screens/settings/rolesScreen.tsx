import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../../styles/theme';
import { LanguageContext } from '../../contexts/LanguageContext';
import { useSwipeBack } from '../../hooks/useSwipeBack';

const ORG_MEMBERS_KEY = '@org_members';

interface RolesScreenProps {
  onBack: () => void;
}

export default function RolesScreen({ onBack }: RolesScreenProps) {
  const { t } = useContext(LanguageContext);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMemberId, setDeleteMemberId] = useState<number | null>(null);
  const [editMemberId, setEditMemberId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'Admin' | 'Employee'>('Employee');
  const [members, setMembers] = useState<Array<{
    id: number;
    name: string;
    role: 'Admin' | 'Employee';
    email: string;
    created: string;
  }>>([]);

  useEffect(() => {
    let isActive = true;

    const loadMembers = async () => {
      try {
        const raw = await AsyncStorage.getItem(ORG_MEMBERS_KEY);
        if (!raw || !isActive) return;

        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMembers(parsed);
        }
      } catch (error) {
        console.warn('Failed to load members cache:', error);
      }
    };

    loadMembers();

    return () => {
      isActive = false;
    };
  }, []);

  const saveMembersToCache = async (updatedMembers: typeof members) => {
    try {
      await AsyncStorage.setItem(ORG_MEMBERS_KEY, JSON.stringify(updatedMembers));
    } catch (error) {
      console.warn('Failed to save members cache:', error);
    }
  };

  const handleEditMember = (memberId: number) => {
    const target = members.find((member) => member.id === memberId);
    if (!target) return;
    setEditMemberId(memberId);
    setEditName(target.name);
    setEditEmail(target.email);
  };

  const handleCloseEdit = () => {
    setEditMemberId(null);
    setEditName('');
    setEditEmail('');
  };

  const handleSaveEdit = () => {
    if (editMemberId === null) return;
    const nextName = editName.trim();
    const nextEmail = editEmail.trim();
    if (!nextName || !nextEmail) return;

    const updatedMembers = members.map((member) =>
      member.id === editMemberId
        ? { ...member, name: nextName, email: nextEmail }
        : member
    );
    
    setMembers(updatedMembers);
    saveMembersToCache(updatedMembers);
    handleCloseEdit();
  };

  const handleShowDeleteConfirm = (memberId: number) => {
    setDeleteMemberId(memberId);
    setShowDeleteModal(true);
  };

  const handleDeleteMember = () => {
    if (deleteMemberId === null) return;
    const updatedMembers = members.filter((member) => member.id !== deleteMemberId);
    setMembers(updatedMembers);
    saveMembersToCache(updatedMembers);
    setShowDeleteModal(false);
    setDeleteMemberId(null);
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

  const handleAddMember = () => {
    const name = newMemberName.trim();
    const email = newMemberEmail.trim();
    if (!name || !email) return;

    // Get locale from language context
    const getLocale = () => {
      switch (t('nav.home')) {
        case 'Inicio': return 'es'; // Spanish
        case '\u4e3b\u9875': return 'zh'; // Chinese
        default: return 'en'; // English
      }
    };
    const locale = getLocale();
    
    const created = new Date().toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const updatedMembers = [
      ...members,
      {
        id: Date.now(),
        name,
        role: newMemberRole,
        email,
        created,
      },
    ];

    setMembers(updatedMembers);
    saveMembersToCache(updatedMembers);
    handleCloseAdd();
  };

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
          contentContainerStyle={members.length === 0 ? styles.emptyContainer : undefined}
          showsVerticalScrollIndicator={false}
        >
          {members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
              <Text style={styles.emptyTitle}>{t('roles.noMembersYet')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('roles.emptySubtitle')}
              </Text>
            </View>
          ) : (
            <View style={styles.memberList}>
              {members.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={[styles.roleBadge, member.role === 'Admin' ? styles.roleBadgeAdmin : styles.roleBadgeEmployee]}>
                    <Text style={[styles.roleBadgeText, member.role === 'Admin' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextEmployee]}>
                      {member.role === 'Admin' ? t('roles.admin') : t('roles.employee')}
                    </Text>
                  </View>
                  {member.role === 'Employee' && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleEditMember(member.id)}
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
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberMeta}>{member.email}</Text>
                  <Text style={styles.memberCreated}>{t('roles.created')} {member.created}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

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
                  (!newMemberName.trim() || !newMemberEmail.trim()) && styles.saveButtonDisabled,
                ]}
                onPress={handleAddMember}
                disabled={!newMemberName.trim() || !newMemberEmail.trim()}
              >
                <Text style={styles.saveButtonText}>{t('roles.addMemberButton')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                <Text style={styles.inputLabel}>{t('roles.name')}</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={t('roles.employeeNamePlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('roles.email')}</Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder={t('roles.emailPlaceholder')}
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>{t('roles.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                style={styles.modalDeleteButton}
                onPress={handleDeleteMember}
              >
                <Text style={styles.modalDeleteText}>{t('common.delete')}</Text>
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
    transform: [{ translateY: -12 }],
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
