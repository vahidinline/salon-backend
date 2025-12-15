const express = require('express');
const router = express.Router({ mergeParams: true });
const Employee = require('../models/Employee');
const Booking = require('../models/Booking'); // Changed from Availability

// Get employees of a salon
router.get('/', async (req, res) => {
  try {
    const employees = await Employee.find({
      salon: req.params.salonId,
    }).populate('services');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Get employees by service ID (Updated to handle clean logic)
router.get('/:serviceId', async (req, res) => {
  try {
    // Note: The frontend sends serviceId in params but sometimes calls it 'id'
    // Assuming req.params.serviceId is effectively what was passed
    const employees = await Employee.find({
      salon: req.params.salonId,
      services: { $in: [req.params.serviceId] }, // Check if serviceId is in array
    }).populate('services');
    res.json(employees);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch employees for service' });
  }
});

// Add employee
router.post('/', async (req, res) => {
  try {
    const { name, services, workSchedule, phone, email, status } = req.body;
    const employee = new Employee({
      salon: req.params.salonId,
      name,
      services,
      workSchedule,
      phone,
      email,
      status,
      avatar: req.body.avatar || 'https://i.ibb.co/JW1sG7MT/avatar.png',
    });
    await employee.save();
    res.status(201).json(employee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// Bulk status update
router.put('/bulk-status', async (req, res) => {
  try {
    const { employeeIds, status } = req.body;
    await Employee.updateMany(
      { _id: { $in: employeeIds }, salon: req.params.salonId },
      { status }
    );
    res.json({ message: 'Statuses updated' });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed' });
  }
});

// Bulk delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { employeeIds } = req.body;
    await Employee.deleteMany({
      _id: { $in: employeeIds },
      salon: req.params.salonId,
    });
    res.json({ message: 'Employees deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// Update availability (Work Schedule)
router.put('/:id/availability', async (req, res) => {
  try {
    // Expecting logic to convert frontend format to workSchedule model format if needed
    // But usually frontend sends matching structure or we adapt here.
    // Assuming simple update for now based on your model:
    // req.body should contain workSchedule or fields to build it.

    // Note: The frontend sends 'availability' object. You might need to map it
    // to 'workSchedule' array defined in your Mongoose model.
    // Assuming direct update for simplicity, but check your frontend payload.

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body, // Ensure body matches model structure
      { new: true }
    );
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Availability update failed' });
  }
});

module.exports = router;
