const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  branch: String,
  division: String,
  year: String,
  prn: String,        // linked student PRN
  roll_no: String,
  subjects: [String],
  lab: [String]
}, { timestamps: true });

module.exports = mongoose.model("Parent", parentSchema);