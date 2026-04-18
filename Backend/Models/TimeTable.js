const mongoose = require("mongoose");

// ─── Sub-schema: a single slot entry ──────────────────────────────────────────
const slotEntrySchema = new mongoose.Schema(
  {
    // References
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    teacherName: {
      type: String, // Denormalised for fast reads
    },

    subject: {
      type: String,
      required: true,
      trim: true,
    },

    room: {
      type: String,
      trim: true,
      default: null,
    },

    lectureLocation: {
      type: String,
      trim: true,
      default: null,
    },

    color: {
      type: String,
      enum: ["teal", "blue", "purple", "orange", "green", "pink"],
      default: "teal",
    },
  },
  { _id: false }
);

// ─── Sub-schema: one day's slots  ─────────────────────────────────────────────
// Keys are slot IDs: t1 | t2 | t3 | t4 | t5 | t6
const daySchema = new mongoose.Schema(
  {
    t1: { type: slotEntrySchema, default: null },
    t2: { type: slotEntrySchema, default: null },
    t3: { type: slotEntrySchema, default: null },
    t4: { type: slotEntrySchema, default: null },
    t5: { type: slotEntrySchema, default: null },
    t6: { type: slotEntrySchema, default: null },
  },
  { _id: false }
);

// ─── Main Timetable schema ─────────────────────────────────────────────────────
const timetableSchema = new mongoose.Schema(
  {
    // ✅ Institute & Department Scope
    instituteId: {
      type: String,
      default: null,
      trim: true,
    },

    instituteName: {
      type: String,
      default: null,
      trim: true,
    },

    departmentCode: {
      type: String,
      default: null,
      trim: true,
    },

    departmentName: {
      type: String,
      default: null,
      trim: true,
    },

    // Scope – mirrors what the frontend filter bar exposes
    year: {
      type: String,
      required: true,
      trim: true,
      // e.g. "1", "2", "3", "4"
    },

    division: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      // e.g. "A", "B", "C"
    },

    batch: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      // e.g. "A1", "B2"
    },

    academicYear: {
      type: String,
      trim: true,
      default: null,
      // e.g. "2024-25"  (optional label)
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // One key per working day
    Monday:    { type: daySchema, default: () => ({}) },
    Tuesday:   { type: daySchema, default: () => ({}) },
    Wednesday: { type: daySchema, default: () => ({}) },
    Thursday:  { type: daySchema, default: () => ({}) },
    Friday:    { type: daySchema, default: () => ({}) },
    Saturday:  { type: daySchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

// ─── Compound unique index: one timetable per institute + department + year + division + batch ─────────
timetableSchema.index(
  { instituteId: 1, departmentCode: 1, year: 1, division: 1, batch: 1 },
  { unique: true, sparse: true }
);

module.exports = mongoose.model("Timetable", timetableSchema);