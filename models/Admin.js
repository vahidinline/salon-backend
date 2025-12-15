const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String },
    phone: { type: String },
    otp: { type: String }, // temporary, not stored long term
    salons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salon' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
