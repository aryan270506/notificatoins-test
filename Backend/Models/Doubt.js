// Models/Doubt.js
// ONE room per subject + year (shared across ALL divisions and ALL teachers)
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ["student", "teacher"],
      required: true,
    },
    senderId: {
      type: String,
      required: true,
    },
    senderName: {
      type: String,
      default: "Unknown",
    },
    senderDivision: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      default: "",
    },
    fileUrl:   { type: String, default: null },
    fileName:  { type: String, default: null },
    fileSize:  { type: Number, default: null },
    mimeType:  { type: String, default: null },
    deletedAt: { type: Date,   default: null },
  },
  { timestamps: true }
);

const doubtSchema = new mongoose.Schema(
  {
    subject:      { type: String, required: true },
    year:         { type: String, required: true },
    // teacherId is NOT part of room identity — optional, informational only
    teacherId:    { type: String, default: null },
    studentCount: { type: Number, default: 0 },
    messages:     [messageSchema],
  },
  { timestamps: true }
);

// Unique on subject + year only — one shared room for all divisions
doubtSchema.index({ subject: 1, year: 1 }, { unique: true });

doubtSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

module.exports = mongoose.model("Doubt", doubtSchema);