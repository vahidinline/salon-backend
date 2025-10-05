const express = require('express');
const router = express.Router({ mergeParams: true });
const Employee = require('../models/Employee');

// Get employees of a salon
router.get('/', async (req, res) => {
  const employees = await Employee.find({ salon: req.params.salonId }).populate(
    'services'
  );
  res.json(employees);
});

// Add employee
router.post('/', async (req, res) => {
  const employee = new Employee({ ...req.body, salon: req.params.salonId });
  console.log('new employee from front', employee);
  await employee.save();
  res.json(employee);
});

// Get single employee
router.get('/:id', async (req, res) => {
  const employee = await Employee.findById(req.params.id).populate('services');
  res.json(employee);
});

// Update employee
router.put('/:id', async (req, res) => {
  const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(employee);
});

// Delete employee
router.delete('/:id', async (req, res) => {
  await Employee.findByIdAndDelete(req.params.id);
  res.json({ message: 'Employee deleted' });
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
  await Employee.deleteMany({
    _id: { $in: employeeIds },
    salon: req.params.salonId,
  });
  res.json({ message: 'Employees deleted' });
});

// PUT /salons/:salonId/employees/:id/availability
router.put('/:id/availability', async (req, res) => {
  const { workingDays, workingHours } = req.body;
  const employee = await Employee.findByIdAndUpdate(
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

module.exports = router;
