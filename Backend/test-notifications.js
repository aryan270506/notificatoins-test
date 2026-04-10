// Test script for push notifications
// Run with: node test-notifications.js

const { sendPushNotification } = require('./utils/pushNotificationService');

// Test notification data
const testToken = 'ExponentPushToken[YOUR_TEST_TOKEN_HERE]';

const testNotification = {
  title: '🔔 Test Notification',
  body: 'This is a test notification. If you see this, notifications are working!',
  data: {
    screen: 'Dashboard',
    test: true
  },
  priority: 'high',
  sound: 'default'
};

async function testNotifications() {
  console.log('🧪 Testing Push Notifications...');
  console.log('');
  
  try {
    console.log('📤 Sending test notification...');
    const result = await sendPushNotification(testToken, testNotification);
    
    if (result.success) {
      console.log('✅ Notification sent successfully!');
      console.log('📊 Result:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Failed to send notification');
      console.error('Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  console.log('');
  console.log('📝 Note: Replace testToken with a real Expo push token from your device');
  console.log('To get your token, check the app console logs after granting permissions');
}

// Run test
testNotifications();
