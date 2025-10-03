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

app.get('/', (req, res) => {
  res.send('hddi');
});
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});
// Routes
app.use('/auth', authRoutes);
app.use('/salons', salonRoutes);
app.use('/salons/:salonId/employees', employeeRoutes);
app.use('/salons/:salonId/services', serviceRoutes);
app.use('/employees/:employeeId/availability', availabilityRoutes);

// MongoDB Atlas connection
const uri = process.env.MONGO_URI; // set in .env
mongoose
  .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(5001, () => console.log('🚀 Server running on port 5001'));
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));
