const express = require('express');
const router = express.Router({ mergeParams: true });
const Availability = require('../models/Availability');

// Get availability for employee
router.get('/', async (req, res) => {
  const slots = await Availability.find({
    employee: req.params.employeeId,
  }).populate('service');
  res.json(slots);
});

// Add availability
router.post('/', async (req, res) => {
  const availability = new Availability({
    ...req.body,
    employee: req.params.employeeId,
  });
  await availability.save();
  res.json(availability);
});

// Update availability
router.put('/:id', async (req, res) => {
  const availability = await Availability.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(availability);
});

// Delete availability
router.delete('/:id', async (req, res) => {
  await Availability.findByIdAndDelete(req.params.id);
  res.json({ message: 'Availability deleted' });
});

module.exports = router;
