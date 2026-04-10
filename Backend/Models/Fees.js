const mongoose = require('mongoose');

const feesSchema = new mongoose.Schema({
  year: {
    type: String,
    enum: ['1', '2', '3', '4'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  description: {
    type: String,
    trim: true,
  },
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
feesSchema.index({ year: 1 }, { unique: true });

module.exports = mongoose.model('Fees', feesSchema);