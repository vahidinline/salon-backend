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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employee', employeeSchema);
