const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    salon: {
      type: String,
      // required: true,
    },
    employee: {
      type: String,
    },
    service: {
      type: String,

      required: true,
    },
    user: {
      type: String,

      required: false,
    },
    clientName: { type: String, required: true },
    clientPhone: { type: String },
    clientEmail: { type: String }, // Optional
    start: { type: Date, required: true }, // Start time of booking (Gregorian)
    end: { type: Date, required: true }, // Automatically start + service duration
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    notes: { type: String }, // Optional: extra data like preferences or comments
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
