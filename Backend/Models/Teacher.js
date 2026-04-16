const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    // ✅ Academic Structure
   branch: {
  type: String,
  trim: true,
  default: null, // ✅ No hardcoding, but no failure
},

years: {
  type: [Number], // ✅ clean array
  default: [],
},

divisions: {
  type: [String],
  default: [],
},

subDivisions: {
  type: [String],
  default: [],
},

    // ✅ Subjects (Separated)
    subjects: {
      theory: {
        year1: [String],
        year2: [String],
        year3: [String],
        year4: [String],
      },
      lab: {
        year1: [String],
        year2: [String],
        year3: [String],
        year4: [String],
      },
    },

    // ✅ Class Teacher
    classTeacher: {
      year: {
        type: String,
        enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
        default: null,
      },
      division: {
        type: String,
        enum: ["A", "B", "C"],
        default: null,
      },
      assignedAt: {
        type: Date,
        default: null,
      },
    },

    // ✅ Profile Image
    profileImage: {
      data: Buffer,
      contentType: String,
    },

    // ✅ Batches (Lab Groups)
    batches: [
      {
        batchName: String, // A1, A2
        students: [
          {
            studentId: String,
            studentName: String,
            studentEmail: String,
          },
        ],
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Teacher", teacherSchema);