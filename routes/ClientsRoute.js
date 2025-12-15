const express = require('express');
const router = express.Router({ mergeParams: true });
const Client = require('../models/Clients');
const Availability = require('../models/Availability');

// Get clinets of a salon
router.get('/', async (req, res) => {
  console.log('salon id in clinets routes', req.params.salonId);

  const clients = await Client.find({});
  res.json(clients);
});

// Get employees of a salon by services
router.get('/:id', async (req, res) => {
  console.log('salon id in Client routes', req.params.id);

  const clients = await Client.find({
    salon: req.params.salonId,
    services: { $in: req.params.id.split(',') },
  }).populate('services');
  res.json(clients);
});

// Add client
// router.post('/', async (req, res) => {
//   try {
//     const { name, services, workSchedule, phone, email, status } = req.body;

//     const employee = new Employee({
//       salon: req.params.salonId,
//       name,
//       services,
//       workSchedule,
//       phone,
//       email,
//       status,
//       avatar: req.body.avatar || 'https://i.ibb.co/JW1sG7MT/avatar.png',
//     });

//     console.log('new employee from front', employee);

//     await employee.save();
//     res.status(201).json(employee);
//   } catch (err) {
//     console.error('Error creating employee:', err);
//     res.status(500).json({ error: 'Failed to create employee' });
//   }
// });

// Get single client
router.get('/:id', async (req, res) => {
  const client = await Client.findById(req.params.id).populate('services');
  res.json(client);
});

// Update client
router.put('/:id', async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(employee);
});

// Delete client
router.delete('/:id', async (req, res) => {
  await Client.findByIdAndDelete(req.params.id);
  res.json({ message: 'client deleted' });
});

// PUT /salons/:salonId/employees/bulk-status
router.put('/bulk-status', async (req, res) => {
  const { employeeIds, status } = req.body;
  await Employee.updateMany(
    { _id: { $in: employeeIds }, salon: req.params.salonId },
    { status }
  );
  res.json({ message: 'Statuses updated' });
});

// POST /salons/:salonId/employees/bulk-delete
router.post('/bulk-delete', async (req, res) => {
  const { employeeIds } = req.body;
  await Client.deleteMany({
    _id: { $in: employeeIds },
    salon: req.params.salonId,
  });
  res.json({ message: 'Employees deleted' });
});

// PUT /salons/:salonId/employees/:id/availability
router.put('/:id/availability', async (req, res) => {
  const { workingDays, workingHours } = req.body;
  const employee = await Client.findByIdAndUpdate(
    req.params.id,
    { workingDays, workingHours },
    { new: true }
  );
  res.json(employee);
});

// POST /salons/:salonId/employees/:employeeId/book
router.post('/:employeeId/book', async (req, res) => {
  const { serviceId, start, end } = req.body;
  const employeeId = req.params.employeeId;

  // Check overlapping bookings
  const conflict = await Availability.findOne({
    employee: employeeId,
    isBooked: true,
    $or: [
      { start: { $lt: new Date(end), $gte: new Date(start) } },
      { end: { $gt: new Date(start), $lte: new Date(end) } },
      { start: { $lte: new Date(start) }, end: { $gte: new Date(end) } },
    ],
  });

  if (conflict) {
    return res.status(400).json({ error: 'Time slot unavailable' });
  }

  const availability = new Availability({
    employee: employeeId,
    service: serviceId,
    start: new Date(start),
    end: new Date(end),
    isBooked: true,
  });

  await availability.save();
  res.json(availability);
});

router.patch('/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const updates = req.body;

    // Allow only specific fields
    const allowedFields = ['status', 'clientType', 'name', 'phone', 'email'];
    const invalidFields = Object.keys(updates).filter(
      (key) => !allowedFields.includes(key)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: `Invalid fields: ${invalidFields.join(', ')}`,
      });
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      { $set: updates },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json({
      message: 'Client updated successfully',
      client,
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ error: 'Server error while updating client' });
  }
});

module.exports = router;
