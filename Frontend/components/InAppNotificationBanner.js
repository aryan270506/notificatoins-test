import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InAppNotificationBanner = ({ visible, notification, onPress, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        dismissBanner();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (onDismiss) onDismiss();
    });
  };

  if (!notification) return null;

  const getIcon = () => {
    const icons = {
      message: 'chatbubble',
      assignment: 'document-text',
      quiz: 'help-circle',
      attendance: 'checkmark-circle',
      timetable: 'calendar',
      doubt_reply: 'bulb',
      notes: 'book',
      exam_result: 'trophy',
      finance: 'cash',
      announcement: 'megaphone',
    };
    return icons[notification.type] || 'notifications';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        onPress={() => {
          dismissBanner();
          if (onPress) onPress(notification);
        }}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={getIcon()} size={24} color="#FFF" />
        </View>
        
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>

        <TouchableOpacity onPress={dismissBanner} style={styles.closeButton}>
          <Ionicons name="close" size={20} color="#FFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: 40,
    paddingHorizontal: 10,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    color: '#FFF',
    fontSize: 14,
    opacity: 0.9,
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
});

export default InAppNotificationBanner;
