import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Switch, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../styles/theme';
import { LanguageContext } from '../contexts/LanguageContext';
import AccountInfoScreen from './settings/AccountInfoScreen';
import BusinessDetailsScreen from './settings/BusinessDetailsScreen';
import LanguageScreen from './settings/LanguageScreen';
import ContactSupportScreen from './settings/ContactSupportScreen';
import CategoriesScreen from './settings/CategoriesScreen';
import ExportDataScreen from './settings/ExportDataScreen';
import RolesScreen from './settings/RolesScreen';
import AccountingReportScreen from './settings/AccountingReportScreen';
import BusinessReportScreen from './settings/BusinessReportScreen';
import PrivacyPolicyScreen from './settings/PrivacyPolicyScreen';
import TermsConditionsScreen from './settings/TermsConditionsScreen';
import { logout, isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, getBiometricType, createAuthenticatedAxios } from '../services/authService';
import { useSwipeBack } from '../hooks/useSwipeBack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CURRENT_USER_CACHE_KEY = '@current_user';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout?: () => void;
  hasOrganization: boolean;
  selectedOrgId?: string | null;
  currentUser?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    organizations?: Array<{ id: string; name: string; role?: string; inventoryItemizedTrackerEnabled?: boolean }>;
  } | null;
}

const getInventoryTrackerCacheKey = (orgId: string) => `@org_inventory_itemized_tracker_${orgId}`;

export default function SettingsScreen({ onBack, onLogout, hasOrganization, currentUser, selectedOrgId }: SettingsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const subScreenSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const selectedOrg = selectedOrgId
    ? currentUser?.organizations?.find(o => o.id === selectedOrgId)
    : currentUser?.organizations?.[0];
  const orgId = selectedOrgId || selectedOrg?.id;
  const isEmployee = selectedOrg?.role === 'EMPLOYEE';

  const [biometricAvailable, setBiometricAvailableState] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricType, setBiometricType] = useState('Face ID');
  const [inventoryItemizedTrackerEnabled, setInventoryItemizedTrackerEnabled] = useState(false);

  const cacheInventoryTrackerState = async (nextOrgId: string, value: boolean) => {
    await AsyncStorage.setItem(getInventoryTrackerCacheKey(nextOrgId), JSON.stringify(value)).catch(() => {
      // Non-critical cache update
    });

    const userRaw = await AsyncStorage.getItem(CURRENT_USER_CACHE_KEY).catch(() => null);
    if (!userRaw) return;

    try {
      const cachedUser = JSON.parse(userRaw);
      const organizations = Array.isArray(cachedUser?.organizations)
        ? cachedUser.organizations.map((org: any) =>
            org.id === nextOrgId ? { ...org, inventoryItemizedTrackerEnabled: value } : org
          )
        : cachedUser?.organizations;

      await AsyncStorage.setItem(CURRENT_USER_CACHE_KEY, JSON.stringify({ ...cachedUser, organizations })).catch(() => {
        // Non-critical cache update
      });
    } catch {
      // Ignore malformed user cache
    }
  };

  useEffect(() => {
    const loadBiometricState = async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailableState(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBiometricEnabledState(enabled);
        const type = await getBiometricType();
        setBiometricType(type);
      }
    };
    loadBiometricState();
  }, []);

  useEffect(() => {
    const loadInventoryTrackerState = async () => {
      if (!orgId || isEmployee) {
        setInventoryItemizedTrackerEnabled(false);
        return;
      }

      const cachedValue = await AsyncStorage.getItem(getInventoryTrackerCacheKey(orgId)).catch(() => null);
      if (cachedValue !== null) {
        setInventoryItemizedTrackerEnabled(cachedValue === 'true');
      } else if (selectedOrg?.inventoryItemizedTrackerEnabled !== undefined) {
        setInventoryItemizedTrackerEnabled(Boolean(selectedOrg.inventoryItemizedTrackerEnabled));
      }

      try {
        const api = await createAuthenticatedAxios();
        const res = await api.get('/api/organizations', {
          headers: { 'x-org-id': orgId },
        });
        const serverValue = Boolean(res.data?.organization?.inventoryItemizedTrackerEnabled);
        setInventoryItemizedTrackerEnabled(serverValue);
        await cacheInventoryTrackerState(orgId, serverValue);
      } catch {
        if (cachedValue === null && selectedOrg?.inventoryItemizedTrackerEnabled === undefined) {
          setInventoryItemizedTrackerEnabled(false);
        }
      }
    };
    loadInventoryTrackerState();
  }, [orgId, isEmployee]);

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabledState(value);
    await setBiometricEnabled(value);
  };

  const handleInventoryTrackerToggle = async (value: boolean) => {
    if (!orgId) return;

    const previousValue = inventoryItemizedTrackerEnabled;
    setInventoryItemizedTrackerEnabled(value);
    try {
      const api = await createAuthenticatedAxios();
      const res = await api.put('/api/organizations',
        { inventoryItemizedTrackerEnabled: value },
        { headers: { 'x-org-id': orgId } }
      );
      const savedValue = Boolean(res.data?.organization?.inventoryItemizedTrackerEnabled ?? value);
      setInventoryItemizedTrackerEnabled(savedValue);
      await cacheInventoryTrackerState(orgId, savedValue);
    } catch {
      setInventoryItemizedTrackerEnabled(previousValue);
      await cacheInventoryTrackerState(orgId, previousValue);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (onLogout) {
      onLogout();
    }
  };
  
  useEffect(() => {
    if (activeSubScreen) {
      Animated.timing(subScreenSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      subScreenSlideAnim.setValue(SCREEN_WIDTH);
    }
  }, [activeSubScreen]);

  const handleSubScreenBack = () => {
    Animated.timing(subScreenSlideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveSubScreen(null);
    });
  };

  const renderSubScreen = () => {
    if (!activeSubScreen) return null;
    
    let SubScreenComponent;
    switch (activeSubScreen) {
      case 'account':
        SubScreenComponent = <AccountInfoScreen onBack={handleSubScreenBack} currentUser={currentUser} />;
        break;
      case 'business':
        SubScreenComponent = <BusinessDetailsScreen onBack={handleSubScreenBack} currentUser={currentUser} selectedOrgId={selectedOrgId} />;
        break;
      case 'language':
        SubScreenComponent = <LanguageScreen onBack={handleSubScreenBack} />;
        break;
      case 'categories':
        SubScreenComponent = <CategoriesScreen onBack={handleSubScreenBack} selectedOrgId={selectedOrgId} />;
        break;
      case 'export':
        SubScreenComponent = <ExportDataScreen onBack={handleSubScreenBack} selectedOrgId={selectedOrgId} />;
        break;
      case 'roles':
        SubScreenComponent = <RolesScreen onBack={handleSubScreenBack} currentUser={currentUser} selectedOrgId={selectedOrgId} />;
        break;
      case 'accountingReports':
        SubScreenComponent = <AccountingReportScreen onBack={handleSubScreenBack} selectedOrgId={selectedOrgId} />;
        break;
      case 'businessReports':
        SubScreenComponent = <BusinessReportScreen onBack={handleSubScreenBack} selectedOrgId={selectedOrgId} />;
        break;
      case 'contact':
        SubScreenComponent = (
          <ContactSupportScreen
            onBack={handleSubScreenBack}
            onLogout={onLogout}
            currentUser={currentUser}
          />
        );
        break;
      case 'privacy':
        SubScreenComponent = <PrivacyPolicyScreen onBack={handleSubScreenBack} />;
        break;
      case 'terms':
        SubScreenComponent = <TermsConditionsScreen onBack={handleSubScreenBack} />;
        break;
      default:
        return null;
    }
    
    return (
      <Animated.View style={[styles.overlayScreen, { transform: [{ translateX: subScreenSlideAnim }] }]}>
        {SubScreenComponent}
      </Animated.View>
    );
  };

  const swipeHandlers = useSwipeBack(onBack);

  return (
    <>
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container} {...swipeHandlers}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>{t('settings.title')}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('account')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>
                <Text style={styles.settingLabel}>{t('settings.accountInfo')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {hasOrganization && !isEmployee && (
              <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('business')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="business-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.settingLabel}>{t('settings.businessDetails')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Utility Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

            <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('language')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="globe-outline" size={22} color="#D97706" />
                </View>
                <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.settingItem, !biometricAvailable && styles.settingItemDisabled]}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons
                    name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                    size={22}
                    color="#0284C7"
                  />
                </View>
                <Text style={styles.settingLabel}>{biometricType} Login</Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                thumbColor={biometricEnabled ? '#3B82F6' : '#F9FAFB'}
                ios_backgroundColor="#E5E7EB"
              />
            </View>

            {hasOrganization && !isEmployee && (
              <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('categories')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="pricetags-outline" size={22} color="#9333EA" />
                  </View>
                  <Text style={styles.settingLabel}>{t('settings.categories')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {hasOrganization && !isEmployee && (
              <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('roles')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="people-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.settingLabel}>{t('settings.roles')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Export Data hidden
            {hasOrganization && !isEmployee && (
              <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('export')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#DBEAFE' }]}>
                    <Ionicons name="download-outline" size={22} color={colors.primary} />
                  </View>
                  <Text style={styles.settingLabel}>{t('settings.exportData')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            */}
          </View>

          {hasOrganization && !isEmployee && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings.reports')}</Text>

              <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('accountingReports')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="document-text-outline" size={22} color="#0284C7" />
                  </View>
                  <View style={styles.settingTextBlock}>
                    <Text style={styles.settingLabel}>{t('settings.accountingReports')}</Text>
                    <Text style={styles.settingSubtitle}>{t('settings.accountingReportsSubtitle')}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('businessReports')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#DCFCE7' }]}>
                    <Ionicons name="bar-chart-outline" size={22} color="#16A34A" />
                  </View>
                  <View style={styles.settingTextBlock}>
                    <Text style={styles.settingLabel}>{t('settings.businessReports')}</Text>
                    <Text style={styles.settingSubtitle}>{t('settings.businessReportsSubtitle')}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#F0FDFA' }]}>
                    <Ionicons name="cube-outline" size={22} color="#0F766E" />
                  </View>
                  <View style={styles.settingTextBlock}>
                    <Text style={styles.settingLabel}>{t('settings.inventoryItemizedTracker')}</Text>
                    <Text style={styles.settingSubtitle}>{t('settings.inventoryItemizedTrackerSubtitle')}</Text>
                  </View>
                </View>
                <Switch
                  value={inventoryItemizedTrackerEnabled}
                  onValueChange={handleInventoryTrackerToggle}
                  trackColor={{ false: '#E5E7EB', true: '#99F6E4' }}
                  thumbColor={inventoryItemizedTrackerEnabled ? '#0F766E' : '#F9FAFB'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            </View>
          )}

          {/* Support Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.support')}</Text>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('contact')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="mail-outline" size={22} color="#4F46E5" />
                </View>
                <Text style={styles.settingLabel}>{t('settings.contactSupport')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Legal Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.legal')}</Text>
            
            <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('privacy')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={colors.textPrimary} />
                </View>
                <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={() => setActiveSubScreen('terms')}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="document-text-outline" size={22} color={colors.textPrimary} />
                </View>
                <Text style={styles.settingLabel}>{t('settings.terms')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.dangerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color="#EF4444" />
              <Text style={styles.dangerButtonText}>{t('settings.signOut')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.footerText}>Version 2.0.0</Text>
            <Text style={styles.footerText}>© 2026 StrataLumen Labs</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
    {renderSubScreen()}
    </>
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
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  backButton: {
    padding: spacing.xs,
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
  section: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingItemDisabled: {
    opacity: 0.55,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  settingTextBlock: {
    flex: 1,
    gap: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  footer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  footerText: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  overlayScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
});
