// ============================================================
// Messages.js - Simple Message Model
// Saves broadcast messages to database
// ============================================================

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      unique: true,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    messageType: {
      type: String,
      enum: ["text", "image", "document"],
      default: "text",
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: String,
    senderRole: {
      type: String,
      enum: ["admin", "teacher", "parent", "committee"],
      required: true,
    },
    recipientRole: {
      type: String,
      enum: ["teacher", "student", "parent", "committee"],
      required: true,
    },
    academicYear: {
      type: String,
      enum: ["1", "2", "3", "4"],
      required: true,
    },
    division: {
      type: String,
      enum: ["A", "B", "C", "all"],
      default: "all",
    },
    attachmentUrl: String,
    attachmentName: String,
    attachmentSize: String,
    status: {
      type: String,
      enum: ["pending", "sent", "delivered", "read"],
      default: "sent",
    },
    deliveredCount: {
      type: Number,
      default: 0,
    },
    readCount: {
      type: Number,
      default: 0,
    },
    failedCount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for faster queries
messageSchema.index({ senderId: 1, timestamp: -1 });
messageSchema.index({ recipientRole: 1, academicYear: 1, division: 1 });
messageSchema.index({ broadcastSessionId: 1 });

module.exports = mongoose.model("Message", messageSchema);
