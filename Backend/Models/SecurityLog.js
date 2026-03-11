const mongoose = require("mongoose");

const securityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor: { type: String, default: "System" },
    ip: { type: String, default: "Unknown" },
    type: {
      type: String,
      enum: ["Auth", "Security", "System", "Threat"],
      default: "System",
    },
    status: {
      type: String,
      enum: ["Success", "Warning", "Failed"],
      default: "Success",
    },
    method: { type: String },
    route: { type: String },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SecurityLog", securityLogSchema);
