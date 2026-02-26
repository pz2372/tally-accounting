import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Dimensions, Switch } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
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
import PrivacyPolicyScreen from './settings/PrivacyPolicyScreen';
import TermsConditionsScreen from './settings/TermsConditionsScreen';
import { Image } from 'react-native';
import { logout, isBiometricAvailable, isBiometricEnabled, setBiometricEnabled, getBiometricType } from '../services/authService';
import { useSwipeBack } from '../hooks/useSwipeBack';

interface SettingsScreenProps {
  onBack: () => void;
  onLogout?: () => void;
  hasOrganization: boolean;
  selectedOrgId?: string | null;
  currentUser?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
    organizations?: Array<{ id: string; name: string; role?: string }>;
  } | null;
}

export default function SettingsScreen({ onBack, onLogout, hasOrganization, currentUser, selectedOrgId }: SettingsScreenProps) {
  const { t } = useContext(LanguageContext);
  const [activeSubScreen, setActiveSubScreen] = useState<string | null>(null);
  const subScreenSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const selectedOrg = selectedOrgId
    ? currentUser?.organizations?.find(o => o.id === selectedOrgId)
    : currentUser?.organizations?.[0];
  const isEmployee = selectedOrg?.role === 'EMPLOYEE';

  const [biometricAvailable, setBiometricAvailableState] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [biometricType, setBiometricType] = useState('Face ID');

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

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabledState(value);
    await setBiometricEnabled(value);
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
      case 'contact':
        SubScreenComponent = <ContactSupportScreen onBack={handleSubScreenBack} />;
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

            {biometricAvailable && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons
                      name={biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline'}
                      size={22}
                      color="#0284C7"
                    />
                  </View>
                  <Text style={styles.settingLabel}>{biometricType}</Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                  thumbColor={biometricEnabled ? '#3B82F6' : '#F9FAFB'}
                  ios_backgroundColor="#E5E7EB"
                />
              </View>
            )}

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
          </View>

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
            <Text style={styles.footerText}>Version 1.0.0</Text>
            <Text style={styles.footerText}>© 2026 StrataLumen</Text>
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
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
