const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Request OTP
router.post('/request-otp', async (req, res) => {
  const { email, phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  let user = await User.findOne({ $or: [{ email }, { phone }] });
  if (!user) {
    user = new User({ email, phone });
  }
  user.otp = otp;
  await user.save();

  // TODO: integrate SendPulse for email OR SMS gateway
  console.log('OTP:', otp);

  res.json({ message: 'OTP sent' });
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, phone, otp } = req.body;
  const user = await User.findOne({ $or: [{ email }, { phone }] });

  if (!user || user.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }

  // reset OTP
  user.otp = null;
  await user.save();

  // return mock token (replace with JWT later)
  res.json({ token: 'fake-jwt-token', userId: user._id });
});

module.exports = router;
