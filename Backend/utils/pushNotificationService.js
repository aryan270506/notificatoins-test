const { Expo } = require('expo-server-sdk');
const Notification = require('../Models/Notification');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification to single or multiple users
 * @param {Array|String} tokens - Expo push token(s)
 * @param {Object} notification - Notification data
 * @param {String} notification.title - Notification title
 * @param {String} notification.body - Notification body
 * @param {Object} notification.data - Additional data
 * @param {String} notification.priority - Priority level (default, normal, high)
 * @param {String} notification.sound - Sound to play
 * @returns {Promise<Object>} Result of push notification
 */
const sendPushNotification = async (tokens, notification) => {
  try {
    // Ensure tokens is an array
    const tokenArray = Array.isArray(tokens) ? tokens : [tokens];
    
    // Filter out invalid tokens
    const validTokens = tokenArray.filter(token => 
      token && Expo.isExpoPushToken(token)
    );

    if (validTokens.length === 0) {
      console.log('No valid Expo push tokens provided');
      return { success: false, message: 'No valid tokens' };
    }

    // Create messages array
    const messages = validTokens.map(token => ({
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      priority: notification.priority || 'high',
      badge: notification.badge,
      channelId: notification.channelId || 'default'
    }));

    // Chunk messages (Expo recommends max 100 per request)
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    // Send chunks
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('Error sending push notification chunk:', error);
      }
    }

    return {
      success: true,
      tickets,
      sentCount: validTokens.length
    };

  } catch (error) {
    console.error('Error in sendPushNotification:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send notification to specific user(s) and save to database
 * @param {Array|String} userIds - User ID(s)
 * @param {String} userType - Type of user (Student, Teacher, etc.)
 * @param {Object} notificationData - Notification details
 * @returns {Promise<Object>} Result
 */
const sendNotificationToUsers = async (userIds, userType, notificationData) => {
  try {
    console.log('🔔 [pushNotificationService] sendNotificationToUsers called');
    console.log('   userIds:', userIds);
    console.log('   userType:', userType);
    console.log('   notificationData:', notificationData);

    // Ensure userIds is an array
    const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
    
    console.log('📋 [pushNotificationService] Processing', userIdArray.length, 'user(s)');

    // Get users' push tokens
    let UserModel;
    switch(userType) {
      case 'Student':
        UserModel = require('../Models/Student');
        break;
      case 'Teacher':
        UserModel = require('../Models/Teacher');
        break;
      case 'Parent':
        UserModel = require('../Models/Parent');
        break;
      default:
        UserModel = require('../Models/Student');
    }

    const users = await UserModel.find({ _id: { $in: userIdArray } });
    console.log('✅ [pushNotificationService] Found', users.length, 'user(s) in database');
    
    // Get valid tokens
    const pushTokens = users
      .filter(user => user.expoPushToken)
      .map(user => user.expoPushToken);
    
    console.log('🎟️  [pushNotificationService] Found', pushTokens.length, 'valid push token(s)');
    
    if (pushTokens.length === 0) {
      console.warn('⚠️  [pushNotificationService] No valid push tokens found!');
      return { success: false, error: 'No valid push tokens' };
    }

    // Prepare messages for Expo
    const messages = pushTokens.map(token => ({
      to: token,
      sound: 'default',
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data,
      priority: notificationData.priority || 'default',
      badge: 1,
      ttl: 86400, // 24 hours
    }));

    console.log('📤 [pushNotificationService] Sending', messages.length, 'message(s) to Expo...');

    // Send to Expo
    let tickets = [];
    try {
      tickets = await expo.sendPushNotificationsAsync(messages);
      console.log('✅ [pushNotificationService] Expo returned', tickets.length, 'ticket(s)');
    } catch (expoError) {
      console.error('❌ [pushNotificationService] Expo error:', expoError);
      throw expoError;
    }

    // Save notifications to database
    const notificationsToCreate = users.map(user => ({
      userId: user._id,
      userType: userType,
      type: notificationData.type,
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data,
      read: false,
      priority: notificationData.priority,
      deliveryStatus: 'pending',
      createdAt: new Date()
    }));

    console.log('💾 [pushNotificationService] Saving', notificationsToCreate.length, 'notification(s) to database...');
    
    const savedNotifications = await Notification.insertMany(notificationsToCreate);
    console.log('✅ [pushNotificationService] Saved', savedNotifications.length, 'notification(s) to database');

    return {
      success: true,
      message: `Sent ${pushTokens.length} notifications`,
      sentCount: pushTokens.length,
      savedCount: savedNotifications.length,
      tickets
    };

  } catch (error) {
    console.error('❌ [pushNotificationService] Error:', error);
    console.error('   Stack:', error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send notification to all students in a class/division
 */
const sendNotificationToClass = async (year, division, notificationData) => {
  try {
    const Student = require('../Models/Student');
    
    const students = await Student.find({
      year,
      division
    }).select('_id expoPushToken');

    const studentIds = students.map(s => s._id);
    
    return await sendNotificationToUsers(studentIds, 'Student', notificationData);
  } catch (error) {
    console.error('Error in sendNotificationToClass:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check delivery receipts for sent notifications
 */
const checkNotificationReceipts = async (tickets) => {
  try {
    const receiptIds = tickets
      .filter(ticket => ticket.id)
      .map(ticket => ticket.id);

    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    
    for (const chunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        
        // Process receipts
        for (const receiptId in receipts) {
          const receipt = receipts[receiptId];
          
          if (receipt.status === 'error') {
            console.error(`Error with notification ${receiptId}:`, receipt.message);
            
            // Update notification status in database if needed
            await Notification.updateOne(
              { expoTicketId: receiptId },
              { deliveryStatus: 'failed' }
            );
          } else if (receipt.status === 'ok') {
            await Notification.updateOne(
              { expoTicketId: receiptId },
              { deliveryStatus: 'delivered' }
            );
          }
        }
      } catch (error) {
        console.error('Error checking receipts chunk:', error);
      }
    }
  } catch (error) {
    console.error('Error in checkNotificationReceipts:', error);
  }
};

module.exports = {
  sendPushNotification,
  sendNotificationToUsers,
  sendNotificationToClass,
  checkNotificationReceipts
};
