const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Client = require('../models/Clients');
const dayjs = require('dayjs');

// Load jalaliday dynamically for CommonJS
let jalaliReady = false;
(async () => {
  const jalaliday = (await import('jalaliday')).default;
  dayjs.extend(jalaliday);
  jalaliReady = true;
  console.log('✅ Jalaliday loaded in backend');
})();
// POST /book — create a new booking
// router.post('/', async (req, res) => {
//   try {
//     const {
//       salon,
//       employee,
//       service,
//       additionalService,
//       start,
//       end,
//       user,
//       clientName,
//       clientPhone,
//       clientEmail,
//       notes,
//       dob,
//     } = req.body;
//     console.log('Received booking data:', req.body);
//     let gregorianDob = null;

//     if (dob) {
//       gregorianDob = dayjs(dob, { jalali: true })
//         .calendar('jalali')
//         .locale('fa')
//         .toDate(); // <-- converts to Gregorian JS Date
//     }

//     // Example: update client’s DOB
//     await Client.findOneAndUpdate(
//       { telegramUserId: user },
//       { DOB: gregorianDob },
//       { upsert: true }
//     );
//     // Create new booking document
//     const booking = new Booking({
//       salon,
//       employee,
//       service,
//       additionalService,
//       start,
//       end,
//       user,
//       clientName,
//       clientPhone,
//       clientEmail,
//       notes,
//     });
//     console.log('Created booking object:', booking);
//     // Save to MongoDB
//     const savedBooking = await booking.save();
//     console.log('Saved booking to DB:', savedBooking);
//     // Return created booking
//     res.status(201).json({
//       message: 'Booking created successfully',
//       booking: savedBooking,
//     });
//   } catch (error) {
//     console.error('Error creating booking:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
router.post('/', async (req, res) => {
  try {
    const {
      salon,
      employee,
      service,
      additionalService,
      start,
      end,
      user, // this is telegramUserId
      clientName,
      clientPhone,
      clientEmail,
      notes,
      dob,
    } = req.body;

    console.log('Received booking data:', req.body);

    // -----------------------------
    // 1. Convert JALALI DOB → Gregorian
    // -----------------------------
    let gregorianDob = null;

    if (dob) {
      gregorianDob = dayjs(dob, { jalali: true })
        .calendar('jalali')
        .locale('fa')
        .toDate();
    }

    // -----------------------------
    // 2. Fetch client info
    // -----------------------------
    const client = await Client.findOneAndUpdate(
      { telegramUserId: user },
      { DOB: gregorianDob },
      { upsert: true, new: true } // return updated/new client
    );

    // -----------------------------
    // 3. Determine booking status based on clientType
    // -----------------------------
    let bookingStatus = 'pending';

    const autoConfirmTypes = ['vip', 'vvip', 'influencer'];

    if (client && autoConfirmTypes.includes(client.clientType)) {
      bookingStatus = 'confirmed';
    }

    // -----------------------------
    // 4. Create new booking
    // -----------------------------
    const booking = new Booking({
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
      status: bookingStatus, // <-- APPLYING LOGIC
    });

    console.log('Created booking object:', booking);

    // -----------------------------
    // 5. Save to MongoDB
    // -----------------------------
    const savedBooking = await booking.save();
    console.log('Saved booking to DB:', savedBooking);

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

//patch update status by admin

router.patch('/:id/updatestatus', async (req, res) => {
  console.log('test');
  try {
    const { id } = req.params;
    const { status } = req.body;
    console.log('id', id, 'status', status);
    if (!status) {
      return res.status(400).json({ message: 'receiptUrl is required' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // optional: disallow uploads if booking already expired / cancelled
    // const now = new Date();
    // if (booking.paymentDeadline && booking.paymentDeadline < now) {
    //   return res.status(400).json({ message: 'Payment deadline has passed' });
    // }

    booking.status = status;

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

// GET /bookings/availability?employee=EMP_ID&date=YYYY-MM-DD

module.exports = router;
