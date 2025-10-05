const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
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
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // or null for guest booking
      required: false,
    },
    start: { type: Date, required: true }, // Start time of booking (Gregorian)
    end: { type: Date, required: true }, // Automatically start + service duration
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed',
    },
    notes: { type: String }, // Optional: extra data like preferences or comments
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
