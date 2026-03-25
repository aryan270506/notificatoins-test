// Models/Assignment.js

const mongoose = require("mongoose");

/* ── Resource (teacher-attached file / photo) ─────────────────────────────── */
const ResourceSchema = new mongoose.Schema({
  name:     { type: String, required: true },   // original filename
  url:      { type: String, required: true },   // storage URL or base64 data-uri
  mimeType: { type: String, default: "" },       // "application/pdf" | "image/jpeg" …
  size:     { type: Number, default: 0 },        // bytes
  type:     { type: String, enum: ["document", "image"], default: "document" },
}, { _id: true });

/* ── Per-student submission ───────────────────────────────────────────────── */
const SubmissionSchema = new mongoose.Schema({
  studentId:   { type: String, required: true },
  name:        { type: String, required: true },
  roll:        { type: String, default: "" },
  comment:     { type: String, default: "" },
  submittedAt: { type: Date,   default: Date.now },

  // Uploaded file metadata
  fileName:    { type: String, default: "" },
  fileUrl:     { type: String, default: "" },   // storage URL (if saved server-side)
  fileMime:    { type: String, default: "" },

  // AI analysis results
  aiPercent:         { type: Number, default: null },  // 0-100
  similarityPercent: { type: Number, default: null },  // 0-100
  analysisAvailable: { type: Boolean, default: false },

  // Teacher review
  // "pending"  → submitted, awaiting teacher review
  // "verified" → teacher approved this individual submission
  // "rejected" → teacher rejected
  verificationStatus: {
    type:    String,
    enum:    ["pending", "verified", "rejected"],
    default: "pending",
  },
  teacherNote:     { type: String, default: "" },
  verifiedAt:      { type: Date,   default: null },
}, { _id: true });   // ← _id:true so teacher can reference each submission by ID

const TagSchema = new mongoose.Schema({
  label: { type: String },
  color: { type: String },
  icon:  { type: String },
}, { _id: false });

/* ── Assignment ───────────────────────────────────────────────────────────── */
const AssignmentSchema = new mongoose.Schema({
  // Core
  title:       { type: String, required: true, trim: true },
  subject:     { type: String, required: true, trim: true },
  unit:        { type: String, default: "" },
  description: { type: String, default: "" },

  // Teacher-attached resources (optional)
  resources: { type: [ResourceSchema], default: [] },

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