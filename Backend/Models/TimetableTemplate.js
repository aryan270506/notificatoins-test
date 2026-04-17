const mongoose = require('mongoose');

const timetableTemplateSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      default: 'default',
      trim: true,
    },
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

timetableTemplateSchema.index(
  { key: 1, instituteId: 1, departmentCode: 1 },
  { unique: true }
);

module.exports = mongoose.model('TimetableTemplate', timetableTemplateSchema);