const express = require('express');
const router = express.Router({ mergeParams: true });
const Booking = require('../models/Booking');
const { sendTelegramMessage } = require('../services/telegramBot');

// POST: ثبت رزرو
router.post('/', async (req, res) => {
  try {
    const {
      salon,
      employee,
      service,
      additionalService,
      start,
      end,
      user, // این معمولا همان آیدی تلگرام است که از فرانت می آید
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
      telegramUserId, // ممکن است فرانت این را هم بفرستد
    } = req.body;

    const startDate = new Date(start);
    const endDate = new Date(end);

    // بررسی تداخل زمانی
    const conflict = await Booking.findOne({
      employee,
      status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
      $or: [
        { start: { $lt: endDate, $gte: startDate } },
        { end: { $gt: startDate, $lte: endDate } },
        { start: { $lte: startDate }, end: { $gte: endDate } },
      ],
    });

    if (conflict) {
      return res.status(409).json({
        message: 'متاسفانه این زمان قبلاً رزرو شده است.',
        conflictId: conflict._id,
      });
    }

    // ذخیره رزرو
    const booking = new Booking({
      salon, // حتما باید مقدار داشته باشد
      employee,
      service,
      additionalService,
      start: startDate,
      end: endDate,
      user,
      telegramUserId: telegramUserId || user, // اگر telegramUserId نبود از user استفاده کن
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
    });

    const savedBooking = await booking.save();
    console.log('✅ Booking saved:', savedBooking._id);

    // (اختیاری) ارسال پیام به ادمین در اینجا

    res.status(201).json({
      message: 'Booking created successfully',
      booking: savedBooking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET: دریافت لیست رزروها
router.get('/', async (req, res) => {
  try {
    const { salonId } = req.params;
    const { user } = req.query;

    // اگر salonId در URL نبود، از کوئری بگیر
    const sId = salonId || req.query.salonId;

    const filter = {};

    // فقط اگر sId وجود داشت فیلتر کن، وگرنه همه را بیاور (برای دیباگ)
    if (sId) filter.salon = sId;

    if (user && user !== 'undefined') filter.user = user;

    console.log('🔎 Booking Filter:', filter); // لاگ برای بررسی فیلتر

    const bookings = await Booking.find(filter)
      .populate('employee', 'name')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // فرمت‌دهی برای نمایش در فرانت
    const formatted = bookings.map((b) => ({
      ...b,
      employee: b.employee?.name || null,
      service: b.service?.name || null,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Get Booking Error', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// GET Single Booking
router.get('/:bookingId', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('service')
      .populate('employee');
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH: تایید رزرو توسط ادمین
router.patch('/:id/updatestatus', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id)
      .populate('service')
      .populate('employee');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    await booking.save();

    // ✅ اصلاح منطق ارسال پیام:
    // بررسی کن کدام فیلد حاوی آیدی عددی تلگرام است
    const targetChatId = booking.telegramUserId || booking.user;

    if (status === 'confirmed' && targetChatId) {
      const dateStr = new Date(booking.start).toLocaleDateString('fa-IR');
      const timeStr = new Date(booking.start).toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const message = `✅ *رزرو شما تایید شد!*

💅 سرویس: ${booking.service?.name || 'خدمات زیبایی'}
👤 متخصص: ${booking.employee?.name || 'تعیین شده'}
📅 تاریخ: ${dateStr}
⏰ ساعت: ${timeStr}

منتظر دیدار شما هستیم 🌸`;

      // ارسال پیام
      await sendTelegramMessage(targetChatId, message);
      console.log(`Notification sent to ${targetChatId}`);
    }

    return res.json({ message: 'Status updated', booking });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
});

// PATCH: آپلود رسید توسط کاربر
router.patch('/:id/receipt', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    booking.receiptUrl = req.body.receiptUrl;
    booking.status = 'review';
    await booking.save();

    const targetChatId = booking.telegramUserId || booking.user;

    if (targetChatId) {
      const message = `📥 *رسید پرداخت شما دریافت شد.*

وضعیت رزرو: 🟡 در حال بررسی
پس از تایید ادمین، رزرو شما نهایی خواهد شد.`;

      await sendTelegramMessage(targetChatId, message);
    }

    res.json({ message: 'Receipt uploaded', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH: کنسل کردن رزرو
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    booking.status = 'cancelled';
    booking.cancelationReason = req.body.reason || 'byUser';
    booking.cancelationDate = new Date();
    await booking.save();
    res.json({ message: 'Cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
