import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { colors } from '../styles/theme';

const { width, height } = Dimensions.get('window');

interface LandingScreenProps {
  onFinish: () => void;
}

export default function LandingScreen({ onFinish }: LandingScreenProps) {
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log('LandingScreen mounted');
    // Auto-play animation on mount
    setTimeout(() => {
      animationRef.current?.play();
    }, 100);

    // Start fade out after 3 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        // Navigate to next screen when fade completes
        console.log('Fade complete - moving to login');
        onFinish();
      });
    }, 3000);

    return () => {};
  }, []);

  const handleAnimationFinish = () => {
    // Navigate to next screen after animation completes
    console.log('Animation finished');
    onFinish();
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo-white.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <LottieView
        ref={animationRef}
        source={require('../../assets/landing.lottie.json')}
        style={styles.animation}
        autoPlay={false}
        loop={false}
        onAnimationFinish={handleAnimationFinish}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -75 }],
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
  },
  animation: {
    width: width * 0.8,
    height: height * 0.6,
  },
});
