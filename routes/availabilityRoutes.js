const express = require('express');
const router = express.Router({ mergeParams: true });
const Availability = require('../models/Availability');
const Booking = require('../models/Booking');

router.get('/', async (req, res) => {
  console.log('Checking booking availability with query:', req.query);

  try {
    const { employee, date } = req.query;

    console.log('Checking availability for:', { employee, date });

    if (!employee || !date) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Get start and end of the day
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Find confirmed or pending bookings that overlap this day
    const bookings = await Booking.find({
      employee,
      start: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'confirmed'] },
    }).select('start end');

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
