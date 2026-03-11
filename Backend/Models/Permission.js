const mongoose = require("mongoose");

const permissionSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      unique: true,
      enum: ["Admin", "Teacher", "Student", "Parent"],
    },
    canLogin: { type: Boolean, default: true },
    canUploadData: { type: Boolean, default: true },
    tabAccess: {                          // ← ADD THIS
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Permission", permissionSchema);