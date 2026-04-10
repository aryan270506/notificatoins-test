// ============================================================
// MessagesRoutes.js - Simple Messages Routes
// Handle save, retrieve, and delete messages
// ============================================================

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Message = require("../Models/Messages");
const auth = require("../Middleware/auth"); 
const { sendNotificationToUsers } = require('../utils/pushNotificationService');

// ─── Multer config for message attachments ───────────────
const MSG_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "messages");
if (!fs.existsSync(MSG_UPLOAD_DIR)) {
  fs.mkdirSync(MSG_UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MSG_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `msg_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ─── POST: Send message with notification ─────────────────
router.post('/send', auth, async (req, res) => {
  try {
    const { recipientId, message, recipientType } = req.body;
    
    console.log('📧 [MessagesRoutes] /send request received');
    console.log('   Sender:', req.user.id);
    console.log('   Recipient:', recipientId);
    console.log('   RecipientType:', recipientType);
    
    if (!recipientId || !message) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'recipientId and message are required' });
    }

    // Save message to database
    const newMessage = await Message.create({
      messageId: Date.now().toString(),
      content: message,
      messageType: "text",
      senderId: req.user.id,
      senderName: req.user.name || 'Unknown',
      senderRole: req.user.role,
      recipientRole: recipientType || 'Student',
      academicYear: req.user.academicYear || '1',
      division: req.user.division || 'A',
      status: 'sent',
    });

    console.log('✅ Message saved:', newMessage._id);

    // Prepare notification data
    const notificationData = {
      type: 'message',
      title: '💬 New Message',
      body: message.substring(0, 100),
      data: {
        screen: 'StudentChat',
        senderId: req.user.id.toString(),
        messageId: newMessage._id.toString()
      },
      priority: 'high',
      sound: 'default'
    };

    console.log('🔔 Sending notification...');
    console.log('   To recipient:', recipientId);
    console.log('   Type:', recipientType || 'Student');
    
    // Send push notification
    const notifResult = await sendNotificationToUsers(
      recipientId,
      recipientType || 'Student',
      notificationData
    );
    
    console.log('✅ Notification sent:', notifResult.success);

    res.json({
      success: true,
      message: 'Message sent',
      messageId: newMessage._id,
      notificationSent: notifResult.success
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST: Upload attachment file ────────────────────────
router.post("/upload-attachment", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const fileUrl = `/uploads/messages/${req.file.filename}`;
    res.status(201).json({
      success: true,
      data: {
        url: fileUrl,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Upload failed: " + error.message,
    });
  }
});

// ─── POST: Save a new message ────────────────────────────
router.post("/save", async (req, res) => {
  try {
    const {
      messageId,
      content,
      messageType,
      senderId,
      senderName,
      senderRole,
      recipientRole,
      academicYear,
      division,
      attachmentUrl,
      attachmentName,
      attachmentSize,
    } = req.body;

    // Validate required fields
    if (!messageId || !content || !senderId || !recipientRole || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Create new message
    const newMessage = new Message({
      messageId,
      content,
      messageType: messageType || "text",
      senderId,
      senderName,
      senderRole,
      recipientRole,
      academicYear,
      division: division || "all",
      attachmentUrl,
      attachmentName,
      attachmentSize,
      status: "sent",
    });

    // Save to database
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: "Message saved successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error saving message: " + error.message,
    });
  }
});

// ─── POST: Send a new message and notification ───────────
router.post('/send-message', auth, async (req, res) => {
  try {
    const { recipientId, message, messageType } = req.body;
    
    console.log('📧 [MessagesRoutes] /send-message request received');
    console.log('   Sender:', req.user.id);
    console.log('   Recipient:', recipientId);
    console.log('   Message:', message.substring(0, 50) + '...');
    
    // Save message (existing code)
    const newMessage = new Message({
      messageId: Date.now().toString(),
      content: message,
      messageType: messageType || "text",
      senderId: req.user.id,
      senderName: req.user.name,
      senderRole: req.user.role,
      recipientRole: 'student', // assuming recipientRole is student
      academicYear: req.user.academicYear,
      division: req.user.division,
      status: 'sent',
    });

    await newMessage.save();
    console.log('✅ [MessagesRoutes] Message saved to database');

    // Send notification to recipient
    console.log('🔔 [MessagesRoutes] Calling sendNotificationToUsers...');
    
    const notificationData = {
      type: 'message',
      title: '💬 New Message',
      body: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
      data: {
        screen: 'StudentChat',
        senderId: req.user.id,
        messageId: newMessage._id.toString()
      },
      priority: 'high',
      sound: 'default'
    };

    console.log('📤 [MessagesRoutes] Notification data:', notificationData);

    const notifResult = await sendNotificationToUsers(recipientId, 'Student', notificationData);
    
    console.log('✅ [MessagesRoutes] Notification result:', notifResult);

    res.json({
      success: true,
      message: 'Message sent and notification delivered',
      notificationResult: notifResult
    });

  } catch (error) {
    console.error('❌ [MessagesRoutes] Error in /send-message:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── POST: Broadcast message to multiple students ─────────
router.post('/broadcast', auth, async (req, res) => {
  try {
    const { studentIds, message, title } = req.body;
    
    if (!studentIds || !message) {
      return res.status(400).json({ error: 'studentIds and message are required' });
    }

    // Send notifications to all students
    const notificationData = {
      type: 'message',
      title: `📢 ${title || 'Announcement'}`,
      body: message.substring(0, 100),
      data: {
        screen: 'Message',
        messageType: 'broadcast'
      },
      priority: 'high'
    };

    console.log('📢 Broadcasting to', studentIds.length, 'students');
    
    const result = await sendNotificationToUsers(studentIds, 'Student', notificationData);

    res.json({
      success: true,
      message: `Broadcast sent to ${studentIds.length} students`,
      result
    });

  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ─── GET: Retrieve all messages ──────────────────────────
router.get("/", async (req, res) => {
  try {
    const messages = await Message.find({ isDeleted: false })
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching messages: " + error.message,
    });
  }
});

// ─── GET: Admin notifications (messages NOT from admin) ──
router.get("/notifications/admin", async (req, res) => {
  try {
    const { since } = req.query; // optional ISO timestamp
    const filter = {
      isDeleted: false,
      senderRole: { $ne: "admin" },
    };
    if (since) {
      filter.timestamp = { $gt: new Date(since) };
    }

    const messages = await Message.find(filter)
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching notifications: " + error.message,
    });
  }
});

// ─── GET: Get message by ID ──────────────────────────────
router.get("/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({ messageId, isDeleted: false });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching message: " + error.message,
    });
  }
});

// ─── GET: Get messages by recipient role, year, division ──
router.get("/filter/by-recipient", async (req, res) => {
  try {
    const { recipientRole, academicYear, division } = req.query;

    const filter = {
      isDeleted: false,
      recipientRole,
      academicYear,
    };

    if (division && division !== "all") {
      filter.division = { $in: [division, "all"] };
    }

    const messages = await Message.find(filter)
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error filtering messages: " + error.message,
    });
  }
});

// ─── GET: Get messages by sender ID ──────────────────────
router.get("/sender/:senderId", async (req, res) => {
  try {
    const { senderId } = req.params;

    const messages = await Message.find({ senderId, isDeleted: false })
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error fetching sender messages: " + error.message,
    });
  }
});

// ─── PUT: Update message status ──────────────────────────
router.put("/status/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status, deliveredCount, readCount, failedCount } = req.body;

    const updatedMessage = await Message.findOneAndUpdate(
      { messageId },
      {
        status,
        ...(deliveredCount !== undefined && { deliveredCount }),
        ...(readCount !== undefined && { readCount }),
        ...(failedCount !== undefined && { failedCount }),
      },
      { new: true }
    );

    if (!updatedMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Message status updated",
      data: updatedMessage,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error updating message: " + error.message,
    });
  }
});

// ─── DELETE: Soft delete a message ───────────────────────
router.delete("/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;

    const deletedMessage = await Message.findOneAndUpdate(
      { messageId },
      { isDeleted: true },
      { new: true }
    );

    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error deleting message: " + error.message,
    });
  }
});

// ─── TEST: Test sending notification ──────────────────────
router.post('/test-notification', auth, async (req, res) => {
  try {
    console.log('🧪 Test notification endpoint called');
    console.log('   User ID:', req.user.id);
    console.log('   User Role:', req.user.role);
    
    const notificationData = {
      type: 'test',
      title: '🧪 Test Notification',
      body: 'This is a test notification from MessagesRoutes',
      data: { test: true },
      priority: 'high',
      sound: 'default'
    };

    console.log('📤 Sending test notification...');
    
    const result = await sendNotificationToUsers(
      req.user.id,
      'Student',
      notificationData
    );

    console.log('✅ Test notification result:', result);

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });

  } catch (error) {
    console.error('❌ Test notification error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
