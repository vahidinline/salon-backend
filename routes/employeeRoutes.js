const express = require('express');
const router = express.Router({ mergeParams: true });
const Employee = require('../models/Employee');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// ==================================================================
// 1. Get employees of a salon (All)
// ==================================================================
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

// ==================================================================
// 2. Get employees by service ID (With Day Filtering & Duration Logic)
// ==================================================================
router.get('/:serviceId', async (req, res) => {
  console.log('\n🔵 --- START: Fetch Employees Request ---');
  try {
    const { salonId, serviceId } = req.params;
    const { date } = req.query; // تاریخ از فرانت می‌آید (YYYY-MM-DD)

    console.log('📍 Params:', { salonId, serviceId });
    console.log('📍 Query Date:', date);

    // ۱. دریافت سرویس پایه
    const baseService = await Service.findById(serviceId);
    if (!baseService) {
      console.log('❌ Service not found in DB');
      return res.status(404).json({ error: 'Service not found' });
    }
    console.log(
      `✅ Base Service found: "${baseService.name}" (Default Duration: ${baseService.duration})`,
    );

    // ۲. دریافت همه کارمندانی که این سرویس را انجام می‌دهند
    let employees = await Employee.find({
      salon: salonId,
      services: { $in: [serviceId] },
    }).populate('services');

    console.log(`👥 Initial Employees found: ${employees.length}`);

    // ۳. فیلتر کردن بر اساس روز کاری (اگر تاریخ ارسال شده باشد)
    if (date) {
      const dateObj = new Date(date);
      const dayName = dateObj
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();

      console.log(`📅 Date provided: ${date} -> Day Name: "${dayName}"`);

      employees = employees.filter((emp) => {
        const workingDays = emp.workSchedule.map((ws) => ws.day.toLowerCase());
        return workingDays.includes(dayName);
      });

      console.log(`👥 Employees after date filtering: ${employees.length}`);
    } else {
      console.log(
        '⚠️ No "date" provided. Returning all employees for this service.',
      );
    }

    // ۴. محاسبه زمان نهایی (calculatedDuration) برای هر کارمند
    const result = employees.map((emp) => {
      // اولویت ۳: زمان سرویس (پیش‌فرض)
      let duration = baseService.duration;

      // اولویت ۲: زمان کلی کارمند (مثلاً ۹۰ دقیقه)
      if (emp.duration) {
        duration = emp.duration;
      }

      // اولویت ۱: زمان سفارشی برای سرویس خاص
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
        calculatedDuration: duration, // ارسال زمان محاسبه شده به فرانت
      };
    });

    console.log('🟢 --- END: Sending response ---\n');
    res.json(result);
  } catch (err) {
    console.error('❌ Error in GET /:serviceId:', err);
    res.status(500).json({ error: 'Failed to fetch employees for service' });
  }
});

// ==================================================================
// 3. Add Employee
// ==================================================================
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

// ==================================================================
// 4. Update Employee
// ==================================================================
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

// ==================================================================
// 5. Delete Employee
// ==================================================================
router.delete('/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ==================================================================
// 6. Bulk Operations
// ==================================================================
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

// ==================================================================
// 7. Update Availability (Specific)
// ==================================================================
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
