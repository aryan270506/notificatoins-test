const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
    },
    subject: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    division: {
      type: String,
      required: true,
    },
    batch: {
      type: String,
      default: null,
    },
    date: {
      type: Date,
      required: true,
    },
    students: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
          required: true,
        },
        status: {
          type: String,
          enum: ["Present", "Absent"],
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

// Indexes for faster queries
attendanceSchema.index({ year: 1, division: 1, date: -1 });
attendanceSchema.index({ teacherId: 1, date: -1 });
attendanceSchema.index({ "students.studentId": 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
