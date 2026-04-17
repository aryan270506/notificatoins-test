// Models/ExamMarks.js
const mongoose = require("mongoose");

const examMarksSchema = new mongoose.Schema(
  {
    teacherId:   { type: String, required: true },
    examName:    { type: String, required: true }, // Custom exam name (CAT 1, Midterm, Final, etc.)
    maxMarksTheory: { type: Number, default: 0 },  // Max marks for Theory
    maxMarksLab:    { type: Number, default: 0 },  // Max marks for Lab
    classType:   { type: String, required: true, enum: ["Theory", "Lab"] },
    division:    { type: String, required: true },
    year:        { type: String, required: true },
    subjectCode: { type: String, required: true },
    subjectName: { type: String, required: true },
    maxMarks:    { type: Number, required: true },  // For backward compatibility
    batch:       { type: String, default: null },

    marks: [
      {
        studentId: { type: String, required: true },
        rollNo:    { type: String, required: true },
        name:      { type: String, required: true },
        mark:      { type: String, default: "" },
        isAbsent:  { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

// Unique exam entry per combination
examMarksSchema.index(
  { teacherId: 1, examName: 1, classType: 1, division: 1, year: 1, subjectCode: 1 },
  { unique: true }
);

// Index for fetching teacher's exams
examMarksSchema.index({ teacherId: 1, examName: 1 });
examMarksSchema.index({ teacherId: 1, createdAt: -1 });

module.exports = mongoose.model("ExamMarks", examMarksSchema);