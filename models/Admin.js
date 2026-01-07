// models/Admin.js
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // اضافه شدن این فیلد برای ذخیره توکن گوشی ادمین
    fcmToken: { type: String, default: null },
    salons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Salon' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
