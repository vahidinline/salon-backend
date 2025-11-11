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
    description: String,
    price: { type: Number },
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],

    // New field
    serviceFeatures: [{ type: String, required: false }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
