import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';

/**
 * Handle user logout
 * Clears all user-related data from AsyncStorage
 */
export const handleLogout = async (navigation) => {
  try {
    // Remove all auth-related data
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userRole');
    await AsyncStorage.removeItem('userName');
    await AsyncStorage.removeItem('teacherId');
    await AsyncStorage.removeItem('parentId');

    console.log('✅ User logged out successfully');

    // Navigate to login screen
    if (navigation) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Logout error:', error);
    return false;
  }
};

/**
 * Get the stored JWT token
 */
export const getAuthToken = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch (error) {
    console.error('Error retrieving auth token:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isUserAuthenticated = async () => {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return !!token;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

/**
 * Get current user info from AsyncStorage
 */
export const getCurrentUser = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    const userRole = await AsyncStorage.getItem('userRole');
    const userName = await AsyncStorage.getItem('userName');

    if (userId && userRole) {
      return {
        userId,
        userRole,
        userName,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};
