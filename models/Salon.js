const mongoose = require('mongoose');

const salonSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Salon', salonSchema);
