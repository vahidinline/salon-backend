const express = require('express');
const router = express.Router({ mergeParams: true });
const Booking = require('../models/Booking');

// GET /salons/:salonId/employees/:employeeId/availability?date=YYYY-MM-DD
// Used by CalendarSlots.tsx to gray out booked slots
router.get('/', async (req, res) => {
  try {
    const { employee, date } = req.query; // employeeId is also in params

    if (!employee || !date) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Return only active bookings
    const bookings = await Booking.find({
      employee,
      start: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
    }).select('start end');

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
