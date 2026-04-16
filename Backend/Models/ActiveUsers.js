const mongoose = require("mongoose");

const activeUserSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    socketId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true, enum: ["admin", "teacher", "student", "parent", "committee"] },
    profilePhoto: { type: String },
    isOnline: { type: Boolean, default: true },
    loginTime: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ActiveUser", activeUserSchema);