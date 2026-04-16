const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  branch: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  instituteName: {
    type: String,
    required: true
  },
  instituteAddress: {
    type: String,
    default: ''
  },
  institutePhone: {
    type: String,
    default: ''
  },
  instituteEmail: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  role: {
    type: String,
    default: 'institute_admin'
  }
});

module.exports = mongoose.model("Admin", adminSchema);