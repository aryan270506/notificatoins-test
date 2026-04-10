const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Push notification token
  expoPushToken: {
    type: String,
    default: null
  },
  lastTokenUpdate: {
    type: Date
  },
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
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  id: { type: String, required: true, unique: true },
  prn: { type: String, required: true },
  roll_no: { type: String, required: true },

  branch: { type: String, required: true },
  division: { type: String, required: true },
  year: { type: String, required: true },
  batch: { type: String, default: null },  // e.g., "A1", "B2" — can be derived from roll_no

  subjects: [{ type: String }],
  lab: [{ type: String }],

  profilePhoto: { type: String },

},
{ timestamps: true }
);
module.exports = mongoose.model("Student", studentSchema);