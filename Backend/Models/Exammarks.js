// Models/ExamMarks.js
const mongoose = require("mongoose");

const examMarksSchema = new mongoose.Schema(
  {
    teacherId:   { type: String, required: true },
    examType:    { type: String, required: true, enum: ["CAT 1", "CAT 2", "FET"] },
    classType:   { type: String, required: true, enum: ["Theory", "Lab"] },
    division:    { type: String, required: true },
    year:        { type: String, required: true },
    subjectCode: { type: String, required: true },
    subjectName: { type: String, required: true },
    maxMarks:    { type: Number, required: true },
    batch:       { type: String, default: null },   // ← ADD THIS

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
  { teacherId: 1, examType: 1, classType: 1, division: 1, year: 1, subjectCode: 1 },
  { unique: true }
);

module.exports = mongoose.model("ExamMarks", examMarksSchema);