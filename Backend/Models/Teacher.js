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

    years: [Number],

    divisions: [String],

    course_codes: {
      year1: [String],
      year2: [String],
      year3: [String],
      year4: [String],
    },

    subjects: {
      year1: [String],
      year2: [String],
      year3: [String],
      year4: [String],
    },

    // ✅ Profile Image (Saved Here)
    profileImage: {
  data: Buffer,
  contentType: String,
},
  },
  {
    timestamps: true, // optional but recommended
  }
);

module.exports = mongoose.model("Teacher", teacherSchema);