const express = require('express');
const router = express.Router({ mergeParams: true });
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const Employee = require('../models/Employee');
const Client = require('../models/Clients'); // مدل کلاینت
const { sendTelegramMessage } = require('../services/telegramBot');

const SALON_ADDRESS = 'الهیه، خزر شمالی، بالاتر از کوچه مرجان، پلاک ۲۰';
const MAP_URL = 'https://maps.app.goo.gl/wf41mQ58a4BwsWqN6';

// توابع کمکی
const formatTehranDate = (date) => {
  return new Date(date).toLocaleDateString('fa-IR', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTehranTime = (date) => {
  return new Date(date).toLocaleTimeString('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

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
      user,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
      telegramUserId,
    } = req.body;

    const finalSalonId = salon || req.params.salonId;
    const startDate = new Date(start);

    // ۱. دریافت اطلاعات
    const serviceData = await Service.findById(service);
    const employeeData = await Employee.findById(employee);

    if (!serviceData || !employeeData) {
      return res.status(404).json({ message: 'Service or Employee not found' });
    }

    // ۲. محاسبه مدت زمان (Duration Logic) با ۳ اولویت
    let duration = serviceData.duration; // اولویت ۳

    if (employeeData.duration) {
      duration = employeeData.duration; // اولویت ۲
    }

    if (
      employeeData.customDurations &&
      employeeData.customDurations.length > 0
    ) {
      const custom = employeeData.customDurations.find(
        (c) => c.service.toString() === service.toString(),
      );
      if (custom) {
        duration = custom.duration; // اولویت ۱
      }
    }

    // ۳. محاسبه پایان
    const endDate = new Date(startDate.getTime() + duration * 60000);

    // ۴. تداخل زمانی
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

    // ۵. منطق VIP
    const targetUserId = telegramUserId || user;
    let initialStatus = 'pending';
    let isVipBooking = false;

    if (targetUserId || clientPhone) {
      const client = await Client.findOne({
        $or: [{ telegramUserId: targetUserId }, { phoneNumber: clientPhone }],
      });

      const vipTypes = ['vip', 'vvip', 'staff', 'partner', 'influencer'];

      if (client && vipTypes.includes(client.clientType)) {
        console.log(`🌟 VIP Booking: ${client.name}`);
        initialStatus = 'confirmed';
        isVipBooking = true;
      }
    }

    // ۶. ذخیره
    const booking = new Booking({
      salon: finalSalonId,
      employee,
      service,
      additionalService,
      start: startDate,
      end: endDate,
      user,
      telegramUserId: targetUserId,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
      status: initialStatus,
    });

    if (isVipBooking) {
      booking.paymentDeadline = null;
    }

    const savedBooking = await booking.save();

    // ۷. پیام تایید آنی برای VIP
    if (isVipBooking && targetUserId) {
      const dateStr = formatTehranDate(startDate);
      const timeStr = formatTehranTime(startDate);
      const message = `✅ *رزرو شما (VIP) تایید شد!*

💅 سرویس: ${serviceData.name}
👤 متخصص: ${employeeData.name}
📅 تاریخ: ${dateStr}
⏰ ساعت: ${timeStr}

📍 *آدرس:*
${SALON_ADDRESS}

🌸 منتظر دیدار شما هستیم 🌸`;

      await sendTelegramMessage(targetChatId, message, {
        reply_markup: {
          inline_keyboard: [[{ text: '🗺 مسیریابی', url: MAP_URL }]],
        },
      });
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking: savedBooking,
      isVip: isVipBooking,
    });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ... (بقیه روت‌های GET, PATCH بدون تغییر خاصی)
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

router.patch('/:id/updatestatus', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const booking = await Booking.findById(id)
      .populate('service')
      .populate('employee');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    booking.status = status;
    if (status === 'cancelled' && !booking.cancelationReason) {
      booking.cancelationReason = 'bySalon';
      booking.cancelationDate = new Date();
    }
    await booking.save();
    const targetChatId = booking.telegramUserId || booking.user;
    if (targetChatId) {
      if (status === 'confirmed') {
        const dateStr = formatTehranDate(booking.start);
        const timeStr = formatTehranTime(booking.start);
        const message = `✅ *رزرو شما تایید شد!*\n\n💅 سرویس: ${booking.service?.name || 'خدمات ناخن'}\n👤 Nail Artist: ${booking.employee?.name || '-'}\n📅 تاریخ: ${dateStr}\n⏰ ساعت: ${timeStr}\n\n📍 *آدرس:*\n${SALON_ADDRESS}\n\nمنتظر دیدار شما هستیم 🌸`;
        const options = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🗺 مسیریابی در گوگل مپ', url: MAP_URL }],
            ],
          },
        };
        await sendTelegramMessage(targetChatId, message, options);
      } else if (status === 'cancelled') {
        const message = `❌ *رزرو شما لغو شد.*\n\nعلت: لغو توسط مدیریت سالن\n\nدر صورت نیاز به هماهنگی مجدد، با ما تماس بگیرید.`;
        await sendTelegramMessage(targetChatId, message);
      }
    }
    return res.json({ message: 'Status updated', booking });
  } catch (err) {
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
});

router.patch('/:id/receipt', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.receiptUrl = req.body.receiptUrl;
    booking.status = 'review';
    await booking.save();
    const targetChatId = booking.telegramUserId || booking.user;
    if (targetChatId) {
      const message = `📥 *رسید پرداخت شما دریافت شد.*\n\nوضعیت رزرو: 🟡 در حال بررسی\nپس از تایید ادمین، رزرو شما نهایی خواهد شد.`;
      await sendTelegramMessage(targetChatId, message);
    }
    res.json({ message: 'Receipt updated', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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
      const message = `❌ *رزرو شما لغو شد.*\n\nعلت: درخواست شما\n\nامیدواریم در فرصتی دیگر میزبان شما باشیم.`;
      await sendTelegramMessage(targetChatId, message);
    }
    res.json({ message: 'Cancelled', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
