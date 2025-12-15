const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    }, // اجباری شد
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    additionalService: { type: [] },

    // فیلد User برای ذخیره آی‌دی کاربر (برای فیلتر کردن)
    user: { type: String },

    // فیلد جدید برای اطمینان از ارسال پیام
    telegramUserId: { type: String },

    orderType: { type: String, default: 'self', enum: ['self', 'gift'] },
    recipientName: { type: String },
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
    cancelationReason: {
      type: String,
      enum: ['byUser', 'bySalon', 'unPaid', 'conflictingSchedule'],
    },
    cancelationDate: { type: Date },
  },
  { timestamps: true }
);

bookingSchema.pre('save', function (next) {
  if (!this.paymentDeadline) {
    this.paymentDeadline = new Date(Date.now() + 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
