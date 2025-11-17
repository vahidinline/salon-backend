const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    name: { type: String, required: true },
    duration: { type: Number, required: true },
    subService: [{ name: String, description: String, price: Number }],
    description: String,
    price: { type: Number },
    serviceType: { type: String, enum: ['basic', 'vip'], required: true },
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

    // New field
    serviceFeatures: [{ type: String, required: false }],
    code: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
