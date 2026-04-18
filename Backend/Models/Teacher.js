const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
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
        default: null,
        // 🔄 Removed enum constraint - divisions are now admin-configurable
      },
      assignedAt: {
        type: Date,
        default: null,
      },
    },

    // ✅ Subject Assignments (Timetable-related)
    // Maps: year+division+batch → [subjects]
    // Used to track which subjects this teacher teaches to specific classes
    subjectAssignments: [
      {
        year: String, // "1", "2", "3", "4"
        division: String, // "A", "B", "C"
        batch: String, // "A1", "A2", "B1", etc.
        subjects: [String], // List of subjects taught
        assignedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

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