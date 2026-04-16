// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true,
    unique: true
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

  role: {
    type: String,
    enum: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'],
    default: 'DEPARTMENT_ADMIN'
  },

  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute'
  },

  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }

}, { timestamps: true });

module.exports = mongoose.model('Admin', adminSchema);