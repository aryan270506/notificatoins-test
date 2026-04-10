const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
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

// Ensure only one document per year
subjectSchema.index({ year: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);