const express = require('express');
const router = express.Router({ mergeParams: true });
const Employee = require('../models/Employee');
const Booking = require('../models/Booking');
const Service = require('../models/Service'); // اضافه شد

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

// ------------------------------------------------------------------
// Get employees by service ID (Updated for Calculated Duration)
// ------------------------------------------------------------------
router.get('/:serviceId', async (req, res) => {
  try {
    const { salonId, serviceId } = req.params;
    const { date } = req.query; // <--- تاریخ را از کوئری می‌گیریم

    // ۱. دریافت سرویس پایه
    const baseService = await Service.findById(serviceId);
    if (!baseService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // ۲. دریافت همه کارمندانی که این سرویس را انجام می‌دهند
    let employees = await Employee.find({
      salon: salonId,
      services: { $in: [serviceId] },
    }).populate('services');

    // ۳. فیلتر کردن بر اساس روز کاری (اگر تاریخ ارسال شده باشد)
    if (date) {
      // تبدیل تاریخ به نام روز هفته (مثلاً "friday")
      const dayName = dayjs(date)
        .toDate()
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      // فقط کارمندانی را نگه دار که در این روز شیفت دارند
      employees = employees.filter((emp) => {
        return emp.workSchedule.some(
          (schedule) => schedule.day.toLowerCase() === dayName,
        );
      });
    }

    // ۴. افزودن calculatedDuration و ارسال پاسخ
    const result = employees.map((emp) => {
      let duration = baseService.duration;

      if (emp.customDurations && emp.customDurations.length > 0) {
        const custom = emp.customDurations.find(
          (c) => c.service.toString() === serviceId,
        );
        if (custom) {
          duration = custom.duration;
        }
      }

      return {
        ...emp.toObject(),
        calculatedDuration: duration,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
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
      { status },
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

// Update availability
router.put('/:id/availability', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(employee);
  } catch (err) {
    res.status(500).json({ error: 'Availability update failed' });
  }
});

module.exports = router;
