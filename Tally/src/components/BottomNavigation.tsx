import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LanguageContext } from '../contexts/LanguageContext';

interface BottomNavigationProps {
  activeTab: 'home' | 'expenses' | 'capture' | 'category';
  onTabPress: (tab: 'home' | 'expenses' | 'capture' | 'category') => void;
  hasOrganization: boolean;
}

export default function BottomNavigation({ activeTab, onTabPress, hasOrganization }: BottomNavigationProps) {
  const { t } = useContext(LanguageContext);
  const isDisabled = !hasOrganization;
  const isTabDisabled = (tab: 'expenses' | 'capture' | 'category') => isDisabled;
  
  return (
    <View style={styles.bottomNav}>
      <TouchableOpacity style={styles.navItem} onPress={() => onTabPress('home')}>
        <View style={[styles.iconContainer, activeTab === 'home' && styles.activeIconContainer]}>
          <Ionicons name="home-outline" size={24} color={activeTab === 'home' ? '#3B82F6' : '#9CA3AF'} />
        </View>
        <Text style={activeTab === 'home' ? styles.navLabelActive : styles.navLabelInactive}>
          {t('nav.home')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.navItem, isTabDisabled('category') && styles.navItemDisabled]}
        onPress={() => !isTabDisabled('category') && onTabPress('category')}
        disabled={isTabDisabled('category')}
      >
        <View style={[styles.iconContainer, activeTab === 'category' && styles.activeIconContainer]}>
          <Ionicons
            name="folder"
            size={24}
            color={activeTab === 'category' ? '#3B82F6' : '#9CA3AF'}
          />
        </View>
        <Text style={activeTab === 'category' ? styles.navLabelActive : styles.navLabelInactive}>
          {t('nav.category')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.navItem, isTabDisabled('capture') && styles.navItemDisabled]}
        onPress={() => !isTabDisabled('capture') && onTabPress('capture')}
        disabled={isTabDisabled('capture')}
      >
        <View style={[styles.iconContainer, activeTab === 'capture' && styles.activeIconContainer]}>
          <Ionicons
            name="camera-outline"
            size={24}
            color={activeTab === 'capture' ? '#3B82F6' : '#9CA3AF'}
          />
        </View>
        <Text style={activeTab === 'capture' ? styles.navLabelActive : styles.navLabelInactive}>
          {t('nav.scan')}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.navItem, isTabDisabled('expenses') && styles.navItemDisabled]}
        onPress={() => !isTabDisabled('expenses') && onTabPress('expenses')}
        disabled={isTabDisabled('expenses')}
      >
        <View style={[styles.iconContainer, activeTab === 'expenses' && styles.activeIconContainer]}>
          <Ionicons
            name="list-outline"
            size={24}
            color={activeTab === 'expenses' ? '#3B82F6' : '#9CA3AF'}
          />
        </View>
        <Text style={activeTab === 'expenses' ? styles.navLabelActive : styles.navLabelInactive}>
          {t('nav.expenses')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 8,
    paddingBottom: 24,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  navItemDisabled: {
    opacity: 0.4,
  },
  iconContainer: {
    borderRadius: 10,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    backgroundColor: '#e9f4ff',
  },
  navLabelActive: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  navLabelInactive: {
    fontSize: 10,
    color: '#9CA3AF',
  },
});
