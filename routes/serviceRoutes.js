const express = require('express');
const router = express.Router({ mergeParams: true });
const Service = require('../models/Service');

// Get services of a salon
router.get('/', async (req, res) => {
  const services = await Service.find({ salon: req.params.salonId }).populate(
    'employees'
  );
  // console.log('services', services);
  res.json(services);
});

// Add service
router.post('/', async (req, res) => {
  console.log('test');
  const service = new Service({ ...req.body, salon: req.params.salonId });

  console.log(' new service', service);
  await service.save();
  res.json(service);
});

// Get single service
router.get('/:id', async (req, res) => {
  const service = await Service.findById(req.params.id)
    .populate('employees')
    .populate('services');
  res.json(service);
});

// Update service in a salon
router.put('/salons/:salonId/services/:id', async (req, res) => {
  try {
    const { salonId, id } = req.params;

    // optionally: validate that the service belongs to this salon
    const service = await Service.findOneAndUpdate(
      { _id: id, salon: salonId },
      req.body,
      { new: true }
    );

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete service
router.delete('/:id', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id);
  res.json({ message: 'Service deleted' });
});

module.exports = router;
