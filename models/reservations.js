// models/Reservation.js
const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  chatId: { type: String, required: true }, // telegram chat id
  userId: { type: String }, // telegram user id if available
  intent: { type: String }, // reservation / feedback / other
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  preferredDatetime: { type: Date },
  proposedOptions: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Availability' },
  ],
  selectedAvailability: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Availability',
  },
  customerName: { type: String },
  customerPhone: { type: String },
  status: {
    type: String,
    enum: ['pending', 'awaiting_user_details', 'confirmed', 'cancelled'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Reservation', reservationSchema);
