const express = require('express');
const router = express.Router();
const Client = require('../models/Clients.js');
const bodyParser = require('body-parser');
const { sendOtp } = require('../services/smsService.js');

router.use(bodyParser.json());

require('dotenv').config();

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

/**
 * Request OTP - Handles both new and existing users
 */
router.post('/', async (req, res) => {
  try {
    const {
      telegramUserId,
      name,
      method,
      location,
      platform,
      influencerId,
      phoneNumber,
    } = req.body;

    console.log(req.body);

    if (method === 'sms' && !phoneNumber) {
      return res.json({ status: 'error', error: 'Invalid phone number' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 60 * 1000);

    let client = await Client.findOne({ phoneNumber });
    if (client) {
      // Update OTP for existing user
      client.otpCode = otp;
      client.otpExpiry = otpExpiry;
      console.log('User found, updating OTP:', otp, otpExpiry);
      await client.save();
    } else {
      // Create pending user with OTP only
      client = await Client.create({
        telegramUserId: telegramUserId,
        phoneNumber,
        platform,
        name,
        influencerId,
        otpCode: otp,
        otpExpiry: otpExpiry,
        isVerified: false,
      });
    }

    // Send OTP via chosen method

    const bodyId = 376752;
    await sendOtp(bodyId, phoneNumber, otp);
    console.log('OTP sent:', otp);

    return res.json({
      status: 'ok',
      message: 'OTP sent successfully',
      userId: client._id,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ status: 'error', error: 'Server error' });
  }
});

/**
 * Verify OTP
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body; // 'email' can be phone too
    console.log('otp verification', req.body);

    const user = await Client.findOne({ phoneNumber: phone });
    // console.log('found user:', user);

    if (!user || !user.otpCode || user.otpCode !== otp) {
      console.log('user.otpCode !== otp', user.otpCode !== otp);
      return res.json({ status: 'error', error: 'کد تایید نامعتبر است' });
    }

    // Clear OTP after successful validation
    user.otpCode = null;
    user.otpExpiry = null;

    if (phone) {
      user.isPhoneVerified = true;
    } else {
      user.isVerified = true;
    }

    await user.save();

    return res.json({
      status: 'ok',
      message: 'OTP verified successfully',
      userData: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        name: user.name,
        status: user.status,
        isVerified: user.isVerified,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ status: 'error', error: 'Server error' });
  }
});

module.exports = router;
