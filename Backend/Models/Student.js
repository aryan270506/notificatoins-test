const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  instituteId: { type: String, default: null },
  instituteName: { type: String, default: null, trim: true },
  departmentCode: { type: String, default: null, trim: true },
  departmentName: { type: String, default: null, trim: true },

  expoPushToken: { type: String, default: null },
  lastTokenUpdate: { type: Date },

  notificationSettings: {
    enabled: { type: Boolean, default: true },
    assignment: { type: Boolean, default: true },
    quiz: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    timetable: { type: Boolean, default: true },
    messages: { type: Boolean, default: true },
    doubts: { type: Boolean, default: true },
    examResults: { type: Boolean, default: true },
    finance: { type: Boolean, default: true }
  },

  // BASIC INPUT (admin)
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  parent_pass: { type: String, default: "Pass@123" },
  parents_pass: { type: String, default: "Pass@123" },
  id: { type: String, required: true, unique: true },
  year: { type: String, required: true },

  // AUTO / FETCHED
  prn: { type: String }, 
  roll_no: { type: Number }, 

  branch: { type: String, default: null },   // 🔥 now fetched later
  division: { type: String }, 
  subBranch: { type: String, default: null },

  batch: { type: String, default: null },

  profilePhoto: {
    type: String,
    default: "https://default-profile.png"
  },

}, { timestamps: true });

/**
 * 🔥 AUTO GENERATION LOGIC
 */
studentSchema.pre("save", async function () {
  const student = this;

  // ✅ PRN
  if (!student.prn) {
    student.prn = `PRN${Date.now().toString().slice(-6)}`;
  }

  // ✅ Roll number (per year + division)
  if (!student.roll_no) {
    const count = await mongoose.model("Student").countDocuments({
      year: student.year,
      division: student.division,
    });

    student.roll_no = count + 1;
  }

  // ✅ Optional fallback for branch (if not fetched yet)
  if (!student.branch) {
    student.branch = "TEMP"; // you can later update it
  }

});

module.exports = mongoose.model("Student", studentSchema);