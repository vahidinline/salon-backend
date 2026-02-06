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

    // ✅ این فیلد حتما باید اینجا باشد تا Mongoose آن را بخواند
    duration: { type: Number },

    customDurations: [
      {
        service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
        duration: { type: Number, required: true },
      },
    ],

    workSchedule: [
      {
        day: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
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
