const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    id: { type: String, required: true, unique: true },
    prn: { type: String, required: true },
    roll_no: { type: String, required: true },

    branch: { type: String, required: true },
    division: { type: String, required: true },
    year: { type: String, required: true },

    subjects: [{ type: String }],
    lab: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);