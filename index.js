const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const cron = require('node-cron');

// Routes
const uploadRouter = require('./routes/upload');
const authRoutes = require('./routes/authRoutes');
const salonRoutes = require('./routes/salonRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const clientAuth = require('./routes/clientAuth.route');
const Client = require('./routes/ClientsRoute');
const AllAvailabilities = require('./routes/AllAvailibilities');
const bookingRoutes = require('./routes/Booking');
const EmployeeAvailibility = require('./routes/employeeAvailabilityRoute');
const adminAuthRoutes = require('./routes/adminAuthRoute');

// Telegram Service
const { sendTelegramMessage } = require('./services/telegramBot');

// Models
const Booking = require('./models/Booking');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(cors());

app.get('/', (req, res) =>
  res.send('Salon System API - Notifications Enabled')
);
app.get('/health', (req, res) => res.status(200).send('OK'));

// API Routes
app.use('/auth', authRoutes);
app.use('/salons', salonRoutes);
app.use('/client-auth', clientAuth);
app.use('/salons/:salonId/employees', employeeRoutes);
app.use('/salons/:salonId/clients', Client);
app.use('/salons/:salonId/services', serviceRoutes);
app.use('/salons/:salonId/bookings', bookingRoutes);
app.use('/salons/:salonId/availability', availabilityRoutes);
app.use(
  '/salons/:salonId/employees/:employeeId/availability',
  EmployeeAvailibility
);
app.use('/availabilities', AllAvailabilities);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/upload', uploadRouter);
app.use('/admin-auth', adminAuthRoutes);

const uri = process.env.MONGO_URI;
const PORT = process.env.PORT || 5001;

mongoose
  .connect(uri)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ---------------------------------------------------------
// CRON JOB: هر ۵ دقیقه اجرا می‌شود
// ---------------------------------------------------------
cron.schedule('*/5 * * * *', async () => {
  try {
    const now = new Date();
    console.log('⏰ Running Cron Job at', now.toISOString());

    // --- ۱. لغو خودکار رزروهای پرداخت نشده (بعد از ۶۰ دقیقه) ---
    // رزروهایی که pending هستند و ددلاین آنها گذشته است
    const expiredBookings = await Booking.find({
      status: 'pending',
      paymentDeadline: { $lt: now },
    });

    for (const booking of expiredBookings) {
      booking.status = 'cancelled';
      booking.cancelationReason = 'unPaid';
      booking.cancelationDate = now;
      await booking.save();

      const chatId = booking.telegramUserId || booking.user;
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `❌ *لغو خودکار رزرو*\n\nمهلت پرداخت بیعانه (۱ ساعت) به پایان رسید و رزرو شما لغو شد.\nدر صورت تمایل لطفاً مجدداً اقدام به رزرو نمایید.`
        );
      }
      console.log(`Booking ${booking._id} auto-cancelled.`);
    }

    // --- ۲. ارسال یادآوری (۴۵ دقیقه بعد از رزرو / ۱۵ دقیقه مانده به لغو) ---
    // بازه زمانی: ددلاین بین ۱۰ تا ۱۵ دقیقه آینده است
    const reminderTimeStart = new Date(now.getTime() + 10 * 60000); // ۱۰ دقیقه بعد
    const reminderTimeEnd = new Date(now.getTime() + 15 * 60000); // ۱۵ دقیقه بعد

    const reminderBookings = await Booking.find({
      status: 'pending',
      paymentDeadline: { $gte: reminderTimeStart, $lte: reminderTimeEnd },
    });

    for (const booking of reminderBookings) {
      const chatId = booking.telegramUserId || booking.user;
      if (chatId) {
        await sendTelegramMessage(
          chatId,
          `⏳ *یادآوری پرداخت*\n\nتنها ۱۵ دقیقه تا پایان مهلت پرداخت و نهایی‌سازی رزرو باقی مانده است.\nدر صورت عدم پرداخت، رزرو به صورت خودکار لغو می‌شود.`
        );
      }
      console.log(`Reminder sent for booking ${booking._id}`);
    }
  } catch (err) {
    console.error('Error in Cron Job:', err);
  }
});
