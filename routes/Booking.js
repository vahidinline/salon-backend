const express = require('express');
const router = express.Router({ mergeParams: true });
const Booking = require('../models/Booking');
const { sendTelegramMessage } = require('../services/telegramBot');

// تنظیمات ثابت آدرس
const SALON_ADDRESS = 'الهیه، خزر شمالی، بالاتر از کوچه مرجان، پلاک ۲۰';
const MAP_URL = 'https://maps.app.goo.gl/wf41mQ58a4BwsWqN6';

// --------------------------------------------------------
// POST: ثبت رزرو جدید
// --------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const {
      salon,
      employee,
      service,
      additionalService,
      start,
      end,
      user,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
      telegramUserId,
    } = req.body;

    // اگر سالن در بادی نبود، از پارامتر URL بگیر
    const finalSalonId = salon || req.params.salonId;

    const startDate = new Date(start);
    const endDate = new Date(end);

    // چک تداخل زمانی
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

    const booking = new Booking({
      salon: finalSalonId,
      employee,
      service,
      additionalService,
      start: startDate,
      end: endDate,
      user,
      telegramUserId: telegramUserId || user, // ذخیره آیدی تلگرام برای نوتیفیکیشن
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
    });

    const savedBooking = await booking.save();
    console.log('✅ Booking created:', savedBooking._id);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: savedBooking,
    });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --------------------------------------------------------
// GET: لیست رزروها
// --------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const sId = req.params.salonId || req.query.salonId;
    const { user } = req.query;

    const filter = {};
    if (sId) filter.salon = sId;
    if (user && user !== 'undefined') filter.user = user;

    const bookings = await Booking.find(filter)
      .populate('employee', 'name')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = bookings.map((b) => ({
      ...b,
      employee: b.employee?.name || null,
      service: b.service?.name || null,
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

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

// --------------------------------------------------------
// PATCH: آپدیت وضعیت (توسط ادمین) -> تایید یا لغو
// --------------------------------------------------------
router.patch('/:id/updatestatus', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // حتما populate میکنیم تا اسم سرویس و کارمند برای پیامک در دسترس باشد
    const booking = await Booking.findById(id)
      .populate('service')
      .populate('employee');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;

    // اگر ادمین کنسل کرد و دلیلی ثبت نشده بود، دلیل را "توسط سالن" ثبت کن
    if (status === 'cancelled' && !booking.cancelationReason) {
      booking.cancelationReason = 'bySalon';
      booking.cancelationDate = new Date();
    }

    await booking.save();

    // --- لاجیک ارسال پیام تلگرام ---
    // اولویت با telegramUserId است، اگر نبود user
    const targetChatId = booking.telegramUserId || booking.user;

    console.log(`🔄 Status Update: ${status} | ChatID: ${targetChatId}`);

    if (targetChatId) {
      // ۱. حالت تایید شده
      if (status === 'confirmed') {
        const dateStr = new Date(booking.start).toLocaleDateString('fa-IR');
        const timeStr = new Date(booking.start).toLocaleTimeString('fa-IR', {
          hour: '2-digit',
          minute: '2-digit',
        });

        const message = `✅ *رزرو شما تایید شد!*

💅 سرویس: ${booking.service?.name || 'خدمات زیبایی'}
👤 متخصص: ${booking.employee?.name || '-'}
📅 تاریخ: ${dateStr}
⏰ ساعت: ${timeStr}

📍 *آدرس:*
${SALON_ADDRESS}

منتظر دیدار شما هستیم 🌸`;

        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🗺 مسیریابی در گوگل مپ', url: MAP_URL }],
            ],
          },
        };
        await sendTelegramMessage(targetChatId, message, options);
      }

      // ۲. حالت کنسل شده (توسط ادمین)
      else if (status === 'cancelled') {
        const message = `❌ *رزرو شما لغو شد.*

علت: لغو توسط مدیریت سالن

در صورت نیاز به هماهنگی مجدد، با ما تماس بگیرید.`;
        await sendTelegramMessage(targetChatId, message);
      }
    } else {
      console.warn(
        '⚠️ No Telegram ID found for this booking. Notification skipped.'
      );
    }

    return res.json({ message: 'Status updated', booking });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
});

// --------------------------------------------------------
// PATCH: آپلود رسید (توسط کاربر)
// --------------------------------------------------------
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

    res.json({ message: 'Receipt updated', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --------------------------------------------------------
// PATCH: لغو دستی (توسط کاربر در مینی‌اپ)
// --------------------------------------------------------
router.patch('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    booking.status = 'cancelled';
    booking.cancelationReason = req.body.reason || 'byUser';
    booking.cancelationDate = new Date();
    await booking.save();

    const targetChatId = booking.telegramUserId || booking.user;
    if (targetChatId) {
      const message = `❌ *رزرو شما لغو شد.*

علت: درخواست شما

امیدواریم در فرصتی دیگر میزبان شما باشیم.`;
      await sendTelegramMessage(targetChatId, message);
    }

    res.json({ message: 'Cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
