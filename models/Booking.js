const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    salon: { type: mongoose.Schema.Types.ObjectId, ref: 'Salon' },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    additionalService: { type: [] },
    user: { type: String },
    orderType: { type: String, default: 'self', enum: ['self', 'gift'] },
    recipientName: { type: String },
    clientType: { type: String },
    clientScore: { type: String },
    cancelationDate: { type: Date },
    cancelationReason: {
      type: String,
      enum: ['byUser', 'bySalon', 'unPaid', 'conflictingSchedule'],
    },
    expireAt: { type: Date, default: Date.now() + 1 },
    clientName: { type: String, required: true },
    clientPhone: { type: String },
    clientEmail: { type: String },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'cancelled',
        'review',
        'expired',
        'done',
        'noShow',
        'inProgress',
        'paid',
        'partiallyPaid',
        'completed',
        'confirmedBySalon',
      ],
      default: 'pending',
    },
    notes: { type: String },
    paymentDeadline: { type: Date },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

// Automatically set paymentDeadline when booking is created
bookingSchema.pre('save', function (next) {
  if (!this.paymentDeadline) {
    this.paymentDeadline = new Date(Date.now() + 60 * 60 * 1000); // +1 hour
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
