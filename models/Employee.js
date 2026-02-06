const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    name: { type: String, required: true },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
    customDurations: [
      {
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        duration: { type: Number, required: true }, // زمان به دقیقه (مثلا 45)
      },
    ],
    workSchedule: [
      {
        day: {
          type: String,
          enum: [
            'saturday',
            'sunday',
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'شنبه',
            'یکشنبه',
            'دوشنبه',
            'سه‌شنبه',
            'چهارشنبه',
            'پنجشنبه',
            'جمعه',
          ],
          required: true,
        },
        startTime: { type: String, required: true }, // e.g. "10:30"
        endTime: { type: String, required: true }, // e.g. "18:30"
      },
    ],

    phone: { type: String },
    email: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String, default: 'https://i.ibb.co/JW1sG7MT/avatar.png' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Employee', employeeSchema);
