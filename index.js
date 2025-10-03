const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const salonRoutes = require('./routes/salonRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => res.send('hddi'));
app.get('/health', (req, res) => res.status(200).send('OK'));

app.use('/auth', authRoutes);
app.use('/salons', salonRoutes);
app.use('/salons/:salonId/employees', employeeRoutes);
app.use('/salons/:salonId/services', serviceRoutes);
app.use('/employees/:employeeId/availability', availabilityRoutes);

const uri = process.env.MONGO_URI;
const PORT = process.env.PORT || 5001;

mongoose
  .connect(uri)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));
