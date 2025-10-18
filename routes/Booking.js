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

//get all booking of specific user
// router.get('/', async (req, res) => {
//   try {
//     const { salonId } = req.params;
//     const { user } = req.query;

//     console.log('🔍 salonId:', salonId);
//     console.log('🔍 user from query:', user);

//     const filter = { salon: salonId };

//     if (user && user !== 'undefined') {
//       filter.user = user.toString();
//     }

//     console.log('🧾 Final filter:', filter);

//     const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();

//     console.log('✅ Found bookings:', bookings.length);

//     res.json(bookings);
//   } catch (error) {
//     console.error('❌ Error fetching bookings:', error);
//     res.status(500).json({ message: 'Server error', error });
//   }
// });

router.get('/', async (req, res) => {
  try {
    const { salonId, user } = req.query;

    // if (!salonId) {
    //   return res.status(400).json({ message: 'salonId is required' });
    // }

    const filter = { salon: salonId };

    if (user && user !== 'undefined') {
      filter.user = user.toString();
    }

    console.log('🧾 Final filter:', filter);

    // Populate only the `name` field for employee and service
    const bookings = await Booking.find(filter)
      .populate('employee', 'name')
      .populate('service', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // 🪄 Replace populated objects with their name strings
    const formatted = bookings.map((b) => ({
      ...b,
      employee: b.employee?.name || null,
      service: b.service?.name || null,
    }));

    console.log('✅ Found bookings:', formatted.length);

    res.json(formatted);
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

router.get('/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);
    console.log('booking found', booking);

    res.json(booking);
  } catch (error) {
    console.error('Error fetching bookings:', error);
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

router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'receiptUrl is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // optional: disallow uploads if booking already expired / cancelled
    // const now = new Date();
    // if (booking.paymentDeadline && booking.paymentDeadline < now) {
    //   return res.status(400).json({ message: 'Payment deadline has passed' });
    // }

    booking.cancelationReason = reason;
    booking.status = 'cancelled';
    booking.cancelationDate = new Date();
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

module.exports = router;
