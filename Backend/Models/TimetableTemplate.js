const mongoose = require('mongoose');

const timetableTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default',
      trim: true,
    },
    customConfig: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        slots: [],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('TimetableTemplate', timetableTemplateSchema);