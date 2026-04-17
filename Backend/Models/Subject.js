const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  instituteId: {
    type: String,
    required: true,
    trim: true,
  },
  instituteName: {
    type: String,
    default: '',
    trim: true,
  },
  departmentCode: {
    type: String,
    required: true,
    trim: true,
  },
  departmentName: {
    type: String,
    default: '',
    trim: true,
  },
  year: {
    type: String,
    enum: ['1', '2', '3', '4'],
    required: true,
  },
  subjects: [{
    type: String,
    trim: true,
    required: true,
  }],
  labs: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one subject config per year within an institute+department scope
subjectSchema.index({ year: 1, instituteId: 1, departmentCode: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);