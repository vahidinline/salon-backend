const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    start: { type: Date, required: true }, // Gregorian in DB
    end: { type: Date, required: true },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Availability', availabilitySchema);
