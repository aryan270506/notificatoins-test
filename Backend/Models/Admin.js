// models/Admin.js
const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  departmentName: {
    type: String,
    required: true
  },
  departmentCode: {
    type: String,
    required: true
  },
  adminId: {
    type: String,
    required: true
  },
  adminEmail: {
    type: String,
    required: true
  },
  adminPassword: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const adminSchema = new mongoose.Schema({
  // Admin identifier
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

  password: {
    type: String,
    required: true
  },

  // Admin type: institute_admin or department_admin
  role: {
    type: String,
    enum: ['institute_admin', 'department_admin', 'super_admin'],
    default: 'department_admin'
  },

  // Institute information (for both institute and department admins)
  instituteName: {
    type: String,
    required: true
  },

  instituteAddress: {
    type: String
  },

  institutePhone: {
    type: String
  },

  instituteEmail: {
    type: String
  },

  // Branch/Code for institute
  branch: {
    type: String
  },

  // Departments array (for institute_admin only)
  departments: [departmentSchema],

  // Pricing
  pricePerMonth: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  lastLogin: {
    type: Date
  }

}, { timestamps: true });

// Index for faster queries
adminSchema.index({ instituteName: 1, role: 1 });
adminSchema.index({ id: 1 });
adminSchema.index({ email: 1 });

module.exports = mongoose.model('Admin', adminSchema);