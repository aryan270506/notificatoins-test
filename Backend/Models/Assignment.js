// Models/Assignment.js

const mongoose = require("mongoose");

const SubmissionSchema = new mongoose.Schema({
  studentId:   { type: String, required: true },
  name:        { type: String, required: true },
  roll:        { type: String, default: "" },
  submittedAt: { type: Date,   default: Date.now },
}, { _id: false });

const TagSchema = new mongoose.Schema({
  label: { type: String },
  color: { type: String },
  icon:  { type: String },
}, { _id: false });

const AssignmentSchema = new mongoose.Schema({
  // Core
  title:       { type: String, required: true, trim: true },
  subject:     { type: String, required: true, trim: true },
  unit:        { type: String, default: "" },
  description: { type: String, default: "" },

  // Target class
  year:     { type: String, required: true },   // "FY" | "SY" | "TY"
  division: { type: String, required: true },   // "A" | "B" | "C" …

  // Due date/time stored as plain strings (e.g. "Mar 15, 2025" / "11:59 PM")
  dueDate: { type: String, default: "TBD" },
  dueTime: { type: String, default: "" },

  // Workflow
  status:   { type: String, enum: ["ACTIVE", "APPROVED", "CLOSED"], default: "ACTIVE" },
  approved: { type: Boolean, default: false },
  tag:      { type: TagSchema, default: null },

  // Relations
  teacherId:   { type: String, default: "" },
  submissions: { type: [SubmissionSchema], default: [] },
}, {
  timestamps: true,   // createdAt, updatedAt
});

// Indexes for common query patterns
AssignmentSchema.index({ teacherId: 1, createdAt: -1 });
AssignmentSchema.index({ year: 1, division: 1, status: 1 });
AssignmentSchema.index({ subject: 1, year: 1, division: 1 });

module.exports = mongoose.model("Assignment", AssignmentSchema);