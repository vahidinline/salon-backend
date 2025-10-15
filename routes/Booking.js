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

// router.get('/', async (req, res) => {
//   console.log('Fetching bookings for user:', req.params);
//   try {
//     const bookings = await Booking.find();
//     res.json(bookings);
//   } catch (error) {
//     console.error('Error fetching bookings:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

router.get('/', async (req, res) => {
  try {
    const { salonId } = req.params;
    const { user } = req.query;

    console.log('🔍 salonId:', salonId);
    console.log('🔍 user from query:', user);

    const filter = { salon: salonId };

    if (user && user !== 'undefined') {
      filter.user = user.toString();
    }

    console.log('🧾 Final filter:', filter);

    const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();

    console.log('✅ Found bookings:', bookings.length);

    res.json(bookings);
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

router.patch('/:id/receipt', async (req, res) => {
  try {
    const { id } = req.params;
    const { receiptUrl } = req.body;
    if (!receiptUrl) {
      return res.status(400).json({ message: 'receiptUrl is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // optional: disallow uploads if booking already expired / cancelled
    const now = new Date();
    if (booking.paymentDeadline && booking.paymentDeadline < now) {
      return res.status(400).json({ message: 'Payment deadline has passed' });
    }

    booking.receiptUrl = receiptUrl;
    booking.status = 'review'; // mark for manual review
    await booking.save();

    return res.json({
      message: 'Receipt attached and booking marked for review',
      booking,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: 'Server error', error: err.message });
  }
});

router.put('./id', async (req, res) => {});

module.exports = router;
