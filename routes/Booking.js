const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking'); // adjust path as needed

// POST /book — create a new booking
router.post('/', async (req, res) => {
  try {
    const {
      salon,
      employee,
      service,
      start,
      end,
      user,
      clientName,
      clientPhone,
      clientEmail,
      notes,
    } = req.body;
    console.log('Received booking data:', req.body);
    // Basic validation
    // if (
    //   !salon ||
    //   !employee ||
    //   !service ||
    //   !start ||
    //   !end ||
    //   !clientName ||
    //   !clientPhone
    // ) {
    //   return res.status(400).json({ error: 'Missing required fields' });
    // }

    // Create new booking document
    const booking = new Booking({
      salon,
      employee,
      service,
      start,
      end,
      user,
      clientName,
      clientPhone,
      clientEmail,
      notes,
    });
    console.log('Created booking object:', booking);
    // Save to MongoDB
    const savedBooking = await booking.save();
    console.log('Saved booking to DB:', savedBooking);
    // Return created booking
    res.status(201).json({
      message: 'Booking created successfully',
      booking: savedBooking,
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  console.log('Fetching bookings for user:', req.params);
  try {
    const bookings = await Booking.find();
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
