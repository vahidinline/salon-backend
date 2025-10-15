const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const uploadRouter = require('./routes/upload');
const authRoutes = require('./routes/authRoutes');
const salonRoutes = require('./routes/salonRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const clientAuth = require('./routes/clientAuth.route');
const Booking = require('./models/Booking');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('updated: Oct 08 2025'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.use('/auth', authRoutes);
app.use('/salons', salonRoutes);
app.use('/client-auth', clientAuth);
app.use('/salons/:salonId/employees', employeeRoutes);
app.use('/salons/:salonId/services', serviceRoutes);
app.use('/salons/:salonId/bookings', require('./routes/Booking'));
app.use('/employees/:salonId/availability', availabilityRoutes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/upload', uploadRouter);
const uri = process.env.MONGO_URI;
const PORT = process.env.PORT || 5001;

mongoose
  .connect(uri)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));
