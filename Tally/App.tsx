import { StatusBar } from 'expo-status-bar';
import { View, Animated, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState, useEffect, useRef } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import CategoryScreen from './src/screens/categoryScreen';
import HomeScreen from './src/screens/homeScreen';
import ExpensesScreen from './src/screens/expensesScreen';
import ScanScreen from './src/screens/scanScreen';
import ExpenseDetailsScreen from './src/screens/expenseDetailsScreen';
import SettingsScreen from './src/screens/settingsScreen';
import LoginScreen from './src/screens/loginScreen';
import LandingScreen from './src/screens/landingScreen';
import BottomNavigation from './src/components/BottomNavigation';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { checkAuth, getStoredUser } from './src/services/authService';

interface Expense {
  id: string;
  date: string;
  day: number;
  vendor: string;
  category: string;
  status: 'Approved' | 'Pending';
  amount: number;
  paymentMethod?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH';
  orgCategoryId?: string;
  notes?: string;
}

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'expenses' | 'capture' | 'category'>('home');
  const [previousTab, setPreviousTab] = useState<'home' | 'expenses' | 'category'>('home');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [homeHasOverlay, setHomeHasOverlay] = useState(false);
  const settingsSlideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  
  const handleLandingFinish = () => {
    console.log('Landing finished, moving to login');
    setShowLanding(false);
  };

  const handleLogin = (user: any) => {
    setIsAuthenticated(true);
    setCurrentUser(user || null);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('home');
    setSelectedExpense(null);
    setShowSettings(false);
    setCurrentUser(null);
  };

  const hasOrganization = !!currentUser?.organizations?.length;

  // Check for existing auth session on app start
  useEffect(() => {
    const checkAuthStatus = async () => {
      const isAuth = await checkAuth();
      if (isAuth) {
        setIsAuthenticated(true);
        const storedUser = await getStoredUser();
        setCurrentUser(storedUser);
      }
    };

    checkAuthStatus();
  }, []);
  
  useEffect(() => {
    if (showSettings) {
      Animated.timing(settingsSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      settingsSlideAnim.setValue(SCREEN_WIDTH);
    }
  }, [showSettings]);

  useEffect(() => {
    if (!hasOrganization) {
      setActiveTab('home');
      setPreviousTab('home');
    }
  }, [hasOrganization]);
  
  const handleSettingsBack = () => {
    Animated.timing(settingsSlideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowSettings(false);
    });
  };

  const handleTabPress = (tab: 'home' | 'expenses' | 'capture' | 'category') => {
    if (!hasOrganization && tab !== 'home') {
      return;
    }
    if (tab !== 'capture' && activeTab !== 'capture') {
      setPreviousTab(tab as 'home' | 'expenses' | 'category');
    }
    setActiveTab(tab);
  };

  const handleCaptureCancel = () => {
    setActiveTab(previousTab);
  };

  return (
    <LanguageProvider>
      <SafeAreaProvider>
        <View style={{ flex: 1 }}>
        {!isAuthenticated ? (
          <>
            <LoginScreen onLogin={handleLogin} />
            {showLanding && <LandingScreen onFinish={handleLandingFinish} />}
          </>
        ) : selectedExpense ? (
          <ExpenseDetailsScreen 
            expense={selectedExpense} 
            onBack={() => setSelectedExpense(null)} 
          />
        ) : (
          <>
            <View style={{ flex: 1, display: activeTab === 'home' ? 'flex' : 'none' }}>
              <HomeScreen
                onSettingsPress={() => setShowSettings(true)}
                onOverlayChange={setHomeHasOverlay}
                hasOrganization={hasOrganization}
                currentUser={currentUser}
              />
            </View>
            <View style={{ flex: 1, display: activeTab === 'expenses' ? 'flex' : 'none' }}>
              <ExpensesScreen onExpensePress={setSelectedExpense} />
            </View>
            {activeTab === 'capture' && (
              <View style={{ flex: 1 }}>
                <ScanScreen 
                  onCancel={handleCaptureCancel}
                  showReviewScreen={true}
                  onExpenseSaved={() => {
                    setActiveTab(previousTab);
                  }}
                />
              </View>
            )}
            <View style={{ flex: 1, display: activeTab === 'category' ? 'flex' : 'none' }}>
              <CategoryScreen onExpensePress={setSelectedExpense} />
            </View>
            {!homeHasOverlay && activeTab !== 'capture' && (
              <BottomNavigation
                activeTab={activeTab}
                onTabPress={handleTabPress}
                hasOrganization={hasOrganization}
              />
            )}
            {showSettings && (
              <Animated.View style={[{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }, { transform: [{ translateX: settingsSlideAnim }] }]}>
                <SettingsScreen
                  onBack={handleSettingsBack}
                  onLogout={handleLogout}
                  hasOrganization={hasOrganization}
                  currentUser={currentUser}
                />
              </Animated.View>
            )}
          </>
        )}
        <StatusBar style="auto" />
      </View>
    </SafeAreaProvider>
    </LanguageProvider>
  );
}
