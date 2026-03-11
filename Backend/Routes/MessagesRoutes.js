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

module.exports = router;
