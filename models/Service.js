const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    salon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
    },
    name: { type: String, required: true },
    duration: { type: Number, required: true }, // in minute
    description: String,
    price: { type: Number, required: false },
    employees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
