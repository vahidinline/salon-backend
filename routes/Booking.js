const express = require('express');
const router = express.Router({ mergeParams: true });
const Booking = require('../models/Booking');
const { sendTelegramMessage } = require('../services/telegramBot');

// POST /book — create a new booking with Overlap Check
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
    } = req.body;

    console.log('Creating booking:', { employee, start, end });

    const startDate = new Date(start);
    const endDate = new Date(end);

    // 1. Check for overlapping bookings
    // We look for any booking for this employee that is NOT cancelled
    // and overlaps with the requested time window.
    const conflict = await Booking.findOne({
      employee,
      status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
      $or: [
        { start: { $lt: endDate, $gte: startDate } }, // Starts inside requested
        { end: { $gt: startDate, $lte: endDate } }, // Ends inside requested
        { start: { $lte: startDate }, end: { $gte: endDate } }, // Encompasses requested
      ],
    });

    if (conflict) {
      return res.status(409).json({
        message: 'این زمان قبلاً رزرو شده است.',
        conflictId: conflict._id,
      });
    }

    // 2. Create Booking
    const booking = new Booking({
      salon,
      employee,
      service,
      additionalService,
      start: startDate,
      end: endDate,
      user,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      orderType,
      recipientName,
    });

    const savedBooking = await booking.save();
    console.log('✅ Booking saved:', savedBooking._id);

    res.status(201).json({
      message: 'Booking created successfully',
      booking: savedBooking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ... (Rest of the GET/PATCH routes remain mostly the same, just ensure they are clean)

router.get('/', async (req, res) => {
  try {
    const { salonId } = req.params; // from mergeParams if setup, or query
    const { user } = req.query;

    // Fallback if salonId not in params but in query (legacy support)
    const sId = salonId || req.query.salonId;

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
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
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

// router.patch('/:id/receipt', async (req, res) => {
//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) return res.status(404).json({ message: 'Not found' });

//     booking.receiptUrl = req.body.receiptUrl;
//     booking.status = 'review';
//     await booking.save();
//     res.json({ message: 'Receipt uploaded', booking });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// });

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
router.patch('/:id/updatestatus', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // واکشی رزرو به همراه اطلاعات سرویس و کارمند برای ساخت متن پیام جذاب
    const booking = await Booking.findById(id)
      .populate('service')
      .populate('employee');

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    await booking.save();

    // ۲. ارسال نوتیفیکیشن به کاربر در صورت تایید شدن
    if (status === 'confirmed' && booking.telegramUserId) {
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

      await sendTelegramMessage(booking.telegramUserId, message);
    }

    return res.json({
      message: 'Status updated and notification sent',
      booking,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
});

// آپلود رسید توسط کاربر
router.patch('/:id/receipt', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    booking.receiptUrl = req.body.receiptUrl;
    booking.status = 'review'; // تغییر وضعیت به "در حال بررسی"
    await booking.save();

    // ۳. ارسال پیام "دریافت شد" به کاربر
    if (booking.telegramUserId) {
      const message = `📥 *رسید پرداخت شما دریافت شد.*

وضعیت رزرو: 🟡 در حال بررسی
پس از تایید ادمین، رزرو شما نهایی خواهد شد.`;

      await sendTelegramMessage(booking.telegramUserId, message);
    }

    res.json({ message: 'Receipt uploaded', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
