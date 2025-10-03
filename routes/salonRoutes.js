const express = require('express');
const router = express.Router();
const Salon = require('../models/Salon');

// Get all salons of a user
router.get('/', async (req, res) => {
  const salons = await Salon.find().populate('employees services');
  res.json(salons);
});

// Create salon
router.post('/', async (req, res) => {
  const salon = new Salon(req.body);
  console.log('salon from front', salon);
  await salon.save();
  res.json(salon);
});

// Get salon by ID
router.get('/:id', async (req, res) => {
  const salon = await Salon.findById(req.params.id).populate(
    'employees services'
  );
  res.json(salon);
});

// Update salon
router.put('/:id', async (req, res) => {
  const salon = await Salon.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(salon);
});

// Delete salon
router.delete('/:id', async (req, res) => {
  await Salon.findByIdAndDelete(req.params.id);
  res.json({ message: 'Salon deleted' });
});

module.exports = router;
