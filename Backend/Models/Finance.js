const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, 'Amount paid is required'],
      min: [0, 'Amount cannot be negative'],
    },
    tuitionFee: {
      type: Number,
      required: [true, 'Tuition fee is required'],
      min: [0, 'Tuition fee cannot be negative'],
    },
    financialAid: {
      type: Number,
      default: 0,
      min: [0, 'Financial aid cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
    },
    date: {
      type: String, // stored as formatted date string (e.g. "02/03/2026")
    },
    id: {
      type: Number, // timestamp-based ID from frontend (Date.now())
    },
    yearKey: {
      type: String,
      trim: true,
    },
    receipt: {
      fileName: { type: String },
      fileMimeType: { type: String },
      fileType: {
        type: String,
        enum: ['photo', 'pdf'],
      },
      fileSize: { type: Number },
      fileUrl: { type: String }, // S3 / storage URL after upload
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    adminRemarks: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false }
);

const studentFinanceSchema = new mongoose.Schema(
  {
    // Link to the student user account
    studentId: {
      type: String,  // Store as string to support both ObjectId and roll-number based IDs
      required: [true, 'Student ID is required'],
    },

    // Yearly academic data rows (mirrors initialYearlyData in the frontend)
    yearlyData: [
      {
        year: { type: String, required: true },     // e.g. "Year 4 (2024-25)"
        tuition: { type: String },                  // formatted string "₹6,50,000"
        aid: { type: String },                      // formatted string "- ₹1,20,000"
        parent: { type: String },
        net: { type: String },
        status: { type: String, enum: ['Paid Full', 'Pending', 'Partial', 'Rejected'], default: 'Pending' },
        statusType: { type: String, enum: ['paid', 'pending', 'partial', 'rejected'], default: 'pending' },
        bars: {
          tuition: { type: Number, default: 0 },
          aid: { type: Number, default: 0 },
        },
        payments: [paymentSchema],
      },
    ],
  },
  {
    timestamps: true, // adds createdAt & updatedAt
  }
);

module.exports = mongoose.model('StudentFinance', studentFinanceSchema);