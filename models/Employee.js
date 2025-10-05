const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    name: { type: String, required: true },

    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }], // Which services they offer

    workDays: [
      {
        type: String,
        enum: [
          'saturday',
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
        ],
      },
    ], // Weekly schedule

    startTime: { type: String, required: true }, // Example: "09:00"
    endTime: { type: String, required: true }, // Example: "17:00"
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
