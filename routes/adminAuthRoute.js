const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendOtp } = require('../services/smsService');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

//create admin

router.post('/addadmin', async (req, res) => {
  const { email, phone, salonId } = req.body;
  console.log(
    'Creating admin with email:',
    email,
    'phone:',
    phone,
    'salonId:',
    salonId
  );

  try {
    let admin = new Admin({
      email,
      phone,
      salons: [salonId],
    });

    await admin.save();
    res.status(201).json({ message: 'Admin created successfully', admin });
  } catch (err) {
    console.error('Error creating admin:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request OTP
router.post('/request-otp', async (req, res) => {
  const { email, phone } = req.body;
  const otp = Math.floor(1000 + Math.random() * 9000).toString();

  let user = await Admin.findOne({ $or: [{ email }, { phone }] });

  if (!user) {
    return res.status(403).json({ error: 'Invalid User' });
  }
  user.otp = otp;
  await user.save();
  const bodyId = 376752;

  // TODO: integrate SendPulse for email OR SMS gateway
  console.log('OTP:', otp);
  sendOtp(bodyId, phone, otp);
  res.json({ message: 'OTP sent' });
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, phone, otp } = req.body;
    console.log('in verif', phone, otp);
    const user = await Admin.findOne({ $or: [{ email }, { phone }] });
    console.log('found user', user);
    if (!user || user.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Clear OTP
    //user.otp = '';
    await user.save();

    // Generate JWT

    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('generated token', token);
    res.json({ token });
  } catch (err) {
    console.error('JWT ERROR:', err);
    return res.status(500).json({ error: err.message });
  }
});

router.put('/fcm-token', authenticateAdmin, async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: 'توکن FCM الزامی است.' });
  }

  try {
    // آپدیت کردن توکن برای ادمینی که لاگین کرده (آیدی از میدل‌ور می‌آید)
    await Admin.findByIdAndUpdate(req.admin.userId, { fcmToken: fcmToken });

    console.log(`✅ FCM Token updated for admin: ${req.admin.email}`);
    res.json({ message: 'توکن FCM با موفقیت ذخیره شد.' });
  } catch (err) {
    console.error('Error updating FCM token:', err);
    res.status(500).json({ error: 'خطا در ذخیره توکن.' });
  }
});

router.post('/public-fcm-token', async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: 'توکن FCM الزامی است.' });
  }

  try {
    // پیدا کردن اولین ادمین در دیتابیس
    const firstAdmin = await Admin.findOne();

    if (!firstAdmin) {
      return res.status(404).json({ error: 'هیچ ادمینی در دیتابیس یافت نشد.' });
    }

    // آپدیت کردن توکن برای آن ادمین
    firstAdmin.fcmToken = fcmToken;
    await firstAdmin.save();

    console.log(
      `✅ [Temporary] FCM Token updated for admin: ${firstAdmin.email}`
    );
    res.json({ message: 'توکن FCM به صورت موقت ذخیره شد.' });
  } catch (err) {
    console.error('Error updating FCM token (public):', err);
    res.status(500).json({ error: 'خطا در ذخیره توکن.' });
  }
});

router.post('/assign-fcm-token-temp', async (req, res) => {
  const { fcmToken } = req.body;
  console.log('fcmToken received in /assign-fcm-token-temp', fcmToken);
  if (!fcmToken) {
    return res.status(400).json({ error: 'FCM Token is required' });
  }

  try {
    // پیدا کردن اولین ادمین موجود در دیتابیس
    // (چون در لاگین نمایشی نمی‌دانیم کدام ادمین لاگین کرده)
    const anyAdmin = await Admin.findOne({});
    console.log('found admin', anyAdmin);
    if (!anyAdmin) {
      return res
        .status(404)
        .json({ error: 'No admin found in database to assign token.' });
    }

    // آپدیت کردن توکن برای آن ادمین
    anyAdmin.fcmToken = fcmToken;
    await anyAdmin.save();

    console.log(`✅ [TEMP] FCM Token assigned to admin ID: ${anyAdmin._id}`);
    res
      .status(200)
      .json({ message: 'Token assigned successfully (temporary mode)' });
  } catch (error) {
    console.error('Error assigning temp token:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
