import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axiosInstance from '../Src/Axios';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Configure notification channels for Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: 'default',
  });
}

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotificationsAsync() {
  console.log('🔔 Starting push notification registration...');
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Notification permission denied');
      return null;
    }
    
    try {
      console.log('📱 Getting Expo Push Token...');
      const tokenData = await Notifications.getExpoPushTokenAsync();
      token = tokenData.data;
      console.log('✅ Expo Push Token obtained:', token);
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  } else {
    console.log('⚠️  Running on emulator/simulator - push notifications not available');
  }

  return token;
}

/**
 * Send push token to backend
 */
export async function sendTokenToBackend(token) {
  try {
    console.log('📤 Sending token to backend...');
    const response = await axiosInstance.post('/notifications/register-token', {
      expoPushToken: token,
    });
    
    console.log('✅ Token registered with backend:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error registering token:', error.message);
    throw error;
  }
}

/**
 * Setup notification listeners (returns cleanup function)
 */
export function setupNotificationListeners() {
  console.log('🔔 Setting up notification listeners...');
  
  // Listener for when notification is received while app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('🔔 Notification received in foreground:', notification.request.content.title);
  });

  // Listener for when user taps notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('👆 Notification tapped:', response.notification.request.content.data);
  });

  // Return cleanup function
  return () => {
    console.log('🧹 Cleaning up notification listeners');
    try {
      if (notificationListener) {
        Notifications.removeNotificationSubscription(notificationListener);
      }
    } catch (e) {
      // Silently fail if method doesn't exist
    }
    try {
      if (responseListener) {
        Notifications.removeNotificationSubscription(responseListener);
      }
    } catch (e) {
      // Silently fail if method doesn't exist
    }
  };
}

/**
 * Show local notification (for testing)
 */
export async function showLocalNotification(title, body, data = {}) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}

export default {
  registerForPushNotificationsAsync,
  sendTokenToBackend,
  setupNotificationListeners,
  showLocalNotification,
};
