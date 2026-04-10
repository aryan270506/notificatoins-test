const express = require('express');
const router = express.Router();
const Notification = require('../Models/Notification');
const Student = require('../Models/Student');
const auth = require("../Middleware/auth");

// Register/Update Expo Push Token
router.post('/register-token', auth, async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const userId = req.user.id;

    console.log('🔔 [NotificationRoutes] register-token request');
    console.log('   userId:', userId);
    console.log('   expoPushToken:', expoPushToken);

    if (!expoPushToken) {
      console.log('❌ [NotificationRoutes] No token provided');
      return res.status(400).json({ message: 'Push token is required' });
    }

    // Update user's push token based on role
    let UserModel;
    switch (req.user.role) {
      case 'student':
        UserModel = Student;
        break;
      case 'teacher':
        UserModel = require('../Models/Teacher');
        break;
      case 'parent':
        UserModel = require('../Models/Parent');
        break;
      case 'admin':
        UserModel = require('../Models/Admin');
        break;
      default:
        console.log('❌ Invalid role:', req.user.role);
        return res.status(400).json({ message: 'Invalid user role' });
    }

    const updateResult = await UserModel.findByIdAndUpdate(userId, {
      expoPushToken,
      lastTokenUpdate: new Date()
    }, { new: true });

    console.log('✅ [NotificationRoutes] Token updated');
    console.log('   Updated user:', updateResult);

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });

  } catch (error) {
    console.error('❌ [NotificationRoutes] Error registering push token:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all notifications for logged-in user
router.get('/my-notifications', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user.id;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, read: false });

    res.json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      },
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get unread notification count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await Notification.countDocuments({ 
      userId, 
      read: false 
    });

    res.json({
      success: true,
      unreadCount
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { 
        read: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      notification
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.updateMany(
      { userId, read: false },
      { 
        read: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`
    });

  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete notification
router.delete('/:notificationId', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all notifications
router.delete('/all/clear', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Notification.deleteMany({ userId });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} notifications`
    });

  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test notification (for development/testing)
router.post('/test', auth, async (req, res) => {
  try {
    const { sendNotificationToUsers } = require('../utils/pushNotificationService');
    
    const result = await sendNotificationToUsers(
      req.user.id,
      req.user.role === 'student' ? 'Student' : 'Teacher',
      {
        type: 'announcement',
        title: '🔔 Test Notification',
        body: 'This is a test notification. If you see this, notifications are working!',
        data: { test: true },
        priority: 'high'
      }
    );

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
