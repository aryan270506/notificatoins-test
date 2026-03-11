// Screens/Teacher/Messages.js
// Always navigates to SelectionScreen — classroom inbox removed.

import React, { useEffect, useRef, useContext } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from './TeacherStack';

export default function Messages() {
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    // Tiny delay lets the navigator fully mount before replace fires
    const timer = setTimeout(() => {
      navigation.replace('SelectionScreen');
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[s.root, { opacity: fade, backgroundColor: isDark ? '#060912' : '#F1F4FD' }]}>
      <ActivityIndicator color="#3B82F6" size="large" />
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060912',
    alignItems: 'center',
    justifyContent: 'center',
  },
});