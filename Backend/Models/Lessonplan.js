// Models/LessonPlan.js
const mongoose = require("mongoose");

const subtopicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const topicSchema = new mongoose.Schema({
  unit: { type: String, required: true },       // e.g. "Unit 1" / "Lab 1"
  title: { type: String, required: true },
  subtopics: [subtopicSchema],
  order: { type: Number, default: 0 },
});

const resourceSchema = new mongoose.Schema({
  type:       { type: String, enum: ["file", "link"], required: true },
  name:       { type: String, required: true },
  uri:        { type: String },        // external URL (links only)
  mimeType:   { type: String },        // e.g. "application/pdf"
  size:       { type: Number },        // bytes
  fileData:   { type: Buffer },        // actual file bytes — stored in MongoDB
  uploadedAt: { type: Date, default: Date.now },
});

const lessonPlanSchema = new mongoose.Schema(
  {
    teacherId: { type: String, required: true, index: true },
    year: {
      type: String,
      required: true,
      enum: ["FY", "SY", "TY"],
    },
    division: { type: String, required: true },   // "A", "B", etc.
    type: {
      type: String,
      required: true,
      enum: ["Theory", "Lab"],
    },
    subject: { type: String, default: "" },
    topics: [topicSchema],
    resources: [resourceSchema],
  },
  { timestamps: true }
);

// Compound index so one doc per teacher+year+division+type+subject
lessonPlanSchema.index(
  { teacherId: 1, year: 1, division: 1, type: 1, subject: 1 },
  { unique: true }
);

module.exports = mongoose.model("LessonPlan", lessonPlanSchema);