import { StyleSheet } from 'react-native';

// Color Palette
export const colors = {
  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceDark: '#0f1b2e',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  textOnDark: '#FFFFFF',
  
  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Accent Colors
  primary: '#6378f1f1',
  primaryLight: '#DBEAFE',
  
  // Category Colors
  purple: '#6366F1',
  blue: '#3B82F6',
  gray: '#6B7280',
  red: '#EF4444',
  orange: '#F97316',
};

// Typography
export const typography = {
  // Large Titles
  largeTitle: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  
  // Titles
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  
  // Section Headers
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: colors.textPrimary,
  },
  
  // Headings
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  
  // Body Text
  body: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  
  bodyRegular: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  
  // Small Text
  small: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.textSecondary,
  },
  
  caption: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  
  // Labels
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  
  tiny: {
    fontSize: 10,
    color: colors.textSecondary,
  },
};

// Spacing
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border Radius
export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  full: 9999,
};

// Common Styles
export const commonStyles = StyleSheet.create({
  // Containers
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  cardDark: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
  },
  
  // Buttons
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  buttonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  
  // Headers
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  
  // Sections
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  
  // Centered Content
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Shadow Styles (if needed in future)
export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};
