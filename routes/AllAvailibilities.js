// routes/bookings.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Employee = require('../models/Employee');

// Get all bookings for a salon
router.get('/:salonId', async (req, res) => {
  try {
    const { salonId } = req.params;
    console.log('Fetching bookings for salonId:', salonId);

    // Fetch all employees of the salon
    const employees = await Employee.find({ salon: salonId }).select(
      '_id name'
    );
    if (!employees.length) {
      return res
        .status(404)
        .json({ message: 'No employees found for this salon' });
    }

    const employeeIds = employees.map((emp) => emp._id);

    // Fetch all bookings for those employees
    const bookings = await Booking.find({
      employee: { $in: employeeIds },
    })
      .populate('employee', 'name')
      .populate('service', 'name')
      .populate('salon', 'name');

    console.log('Found bookings:', bookings.length);
    res.json(bookings);
  } catch (err) {
    console.error('Failed to fetch bookings:', err);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

module.exports = router;
