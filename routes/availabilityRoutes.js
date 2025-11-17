const express = require('express');
const router = express.Router({ mergeParams: true });
const Availability = require('../models/Availability');
const Booking = require('../models/Booking');
const Employee = require('../models/Employee');

router.get('/freeslots', async (req, res) => {
  try {
    const { date } = req.query;
    const { salonId } = req.params;

    if (!salonId || !date) {
      return res.status(400).json({ message: 'salonId and date are required' });
    }

    // Normalize day range
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // 1) Fetch all employees of the salon
    const employees = await Employee.find({ salon: salonId }).populate(
      'services'
    );

    const results = [];

    for (const emp of employees) {
      // 2) Determine if employee works on that weekday
      const weekday = new Date(
        dayStart.getFullYear(),
        dayStart.getMonth(),
        dayStart.getDate()
      )
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      console.log('===== DEBUG =====');
      console.log('date:', date);
      console.log('weekday:', weekday);
      console.log('employee:', emp.name);
      console.log(
        'workSchedule days:',
        emp.workSchedule.map((w) => w.day.toLowerCase())
      );
      console.log('===============');

      const todaysSchedule = emp.workSchedule.find(
        (w) => w.day.toLowerCase() === weekday
      );

      if (!todaysSchedule) {
        results.push({ employee: emp, hasFreeSlot: false });
        continue;
      }

      // 3) Get employee bookings for that day
      const bookings = await Booking.find({
        employee: emp._id,
        start: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'confirmed'] },
      }).select('start end');

      // 4) Compute work window
      const workStart = new Date(`${date}T${todaysSchedule.startTime}:00`);
      const workEnd = new Date(`${date}T${todaysSchedule.endTime}:00`);

      // 5) Determine if ANY free time exists
      let cursor = workStart;
      let hasFreeSlot = false;

      for (const b of bookings.sort((a, b) => a.start - b.start)) {
        if (cursor < b.start) {
          hasFreeSlot = true;
          break;
        }
        cursor = new Date(Math.max(cursor, b.end));
      }

      if (!hasFreeSlot && cursor < workEnd) {
        hasFreeSlot = true;
      }

      results.push({
        employee: emp,
        hasFreeSlot,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Daily availability error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
