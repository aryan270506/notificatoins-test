// Models/LectureStatus.js
const mongoose = require("mongoose");

const lectureStatusSchema = new mongoose.Schema(
  {
    // Which timetable slot this refers to
    year:      { type: String, required: true },
    division:  { type: String, required: true, uppercase: true },
    batch:     { type: String, required: true, uppercase: true },
    day:       { type: String, required: true },   // "Monday", "Tuesday" …
    slotId:    { type: String, required: true },   // "t1" … "t6"
    weekStart: { type: String, required: true },   // ISO date string "2024-10-21"

    // Who owns this slot
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    subject: { type: String, required: true },

    // Status
    status: {
      type: String,
      enum: ["active", "cancelled", "postponed"],
      default: "active",
    },

    // Postpone details (only when status === "postponed")
    postponedTo: {
      date: { type: String, default: null }, // "Mon, Oct 30"
      time: { type: String, default: null }, // "09:00 AM"
    },

    // Who performed the action
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "updatedByRole",
    },
    updatedByRole: {
      type: String,
      enum: ["Teacher", "Admin"],
    },
  },
  { timestamps: true }
);

// One status record per slot per week
lectureStatusSchema.index(
  { year: 1, division: 1, batch: 1, day: 1, slotId: 1, weekStart: 1 },
  { unique: true }
);

module.exports = mongoose.model("LectureStatus", lectureStatusSchema);