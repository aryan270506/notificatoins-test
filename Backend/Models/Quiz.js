// Models/Quiz.js
const mongoose = require("mongoose");

const optionSchema = new mongoose.Schema({
  id:      { type: String },
  text:    { type: String, default: "" },
  correct: { type: Boolean, default: false },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  text:      { type: String, required: true },
  type:      { type: String, enum: ["mc", "tf", "sa"], default: "mc" },
  options:   [optionSchema],
  tfAnswer:  { type: Boolean, default: null },
  points:    { type: Number, default: 10 },
  timeLimit: { type: Number, default: 2 }, // per-question minutes
}, { _id: false });

const submissionSchema = new mongoose.Schema({
  studentId:   { type: String, required: true },
  studentName: { type: String },
  answers:     [mongoose.Schema.Types.Mixed], // flexible per question type
  score:       { type: Number, default: 0 },
  totalMarks:  { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now },
  duration:    { type: String }, // e.g. "18m 40s"
  status:      { type: String, enum: ["On Time", "Late", "Flagged"], default: "On Time" },
}, { _id: false });

const quizSchema = new mongoose.Schema(
  {
    title:     { type: String, required: true },
    teacherId: { type: String, required: true },
    subject:   { type: String },
    year:      { type: String },   // "1" "2" "3" "4"
    division:  { type: String },   // "A" "B" …
    subDiv:    { type: String },   // "1" "2" …
    class:     { type: String },   // computed display string e.g. "TY-B"

    questions:    [questionSchema],
    duration:     { type: Number, default: 30 },  // total quiz minutes
    shuffle:      { type: Boolean, default: true },
    autoGrade:    { type: Boolean, default: true },
    lockBrowser:  { type: Boolean, default: false },

    status: {
      type: String,
      enum: ["SCHEDULED", "ACTIVE", "COMPLETED"],
      default: "SCHEDULED",
    },

    startedAt:   { type: Date },
    completedAt: { type: Date },

    submissions: [submissionSchema],
    total:       { type: Number, default: 0 }, // expected student count
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quiz", quizSchema);