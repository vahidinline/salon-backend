const dayjs = require('dayjs');
const Employee = require('../models/Employee');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// --- Helper: محاسبه زمان سرویس برای کارمند (با ۳ اولویت) ---
const getEmployeeServiceDuration = (
  employee,
  serviceId,
  defaultDuration = 30,
) => {
  // اولویت ۱: زمان اختصاصی سرویس
  if (employee.customDurations && employee.customDurations.length > 0) {
    const custom = employee.customDurations.find(
      (c) => c.service.toString() === serviceId.toString(),
    );
    if (custom) return custom.duration;
  }

  // اولویت ۲: زمان کلی کارمند
  if (employee.duration) {
    return employee.duration;
  }

  // اولویت ۳: زمان پیش‌فرض سرویس
  return defaultDuration;
};

// Helper: بررسی وقت خالی
const hasFreeTimeInDay = (
  employee,
  dateStr,
  bookings,
  minDurationMinutes = 15,
) => {
  const weekday = dayjs(dateStr).format('dddd').toLowerCase();
  const workSchedule = employee.workSchedule.find(
    (ws) => ws.day.toLowerCase() === weekday,
  );

  if (!workSchedule) return false;

  const workStart = dayjs(`${dateStr} ${workSchedule.startTime}`);
  const workEnd = dayjs(`${dateStr} ${workSchedule.endTime}`);

  const sortedBookings = bookings.sort(
    (a, b) => new Date(a.start) - new Date(b.start),
  );

  let lastEndTime = workStart;

  for (const booking of sortedBookings) {
    const bookingStart = dayjs(booking.start);
    const bookingEnd = dayjs(booking.end);

    const diff = bookingStart.diff(lastEndTime, 'minute');
    if (diff >= minDurationMinutes) {
      return true;
    }

    if (bookingEnd.isAfter(lastEndTime)) {
      lastEndTime = bookingEnd;
    }
  }

  const finalDiff = workEnd.diff(lastEndTime, 'minute');
  if (finalDiff >= minDurationMinutes) {
    return true;
  }

  return false;
};

// 1. Availability تکی (روزانه)
exports.getDailyAvailabilityStatus = async (req, res) => {
  try {
    const { date, serviceId } = req.query;
    const { salonId } = req.params;

    if (!salonId || !date) {
      return res.status(400).json({ message: 'salonId and date are required' });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const employees = await Employee.find({ salon: salonId }).populate(
      'services',
    );

    let defaultServiceDuration = 15;
    if (serviceId) {
      const srv = await Service.findById(serviceId);
      if (srv) defaultServiceDuration = srv.duration;
    }

    const results = [];

    for (const emp of employees) {
      const bookings = await Booking.find({
        employee: emp._id,
        start: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
      }).select('start end');

      const requiredDuration = serviceId
        ? getEmployeeServiceDuration(emp, serviceId, defaultServiceDuration)
        : 15;

      const isFree = hasFreeTimeInDay(emp, date, bookings, requiredDuration);

      results.push({
        employee: emp,
        hasFreeSlot: isFree,
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Availability Error:', error);
    res.status(500).json({ message: 'Failed to calculate availability' });
  }
};

// 2. Availability هفتگی (Batch)
exports.getWeeklyAvailabilityStatus = async (req, res) => {
  try {
    const { startDate, endDate, salonId, serviceId } = req.query;

    if (!salonId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const employees = await Employee.find({ salon: salonId }).populate(
      'services',
    );

    let defaultServiceDuration = 15;
    if (serviceId) {
      const srv = await Service.findById(serviceId);
      if (srv) defaultServiceDuration = srv.duration;
    }

    const allBookings = await Booking.find({
      salon: salonId,
      start: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
    }).select('employee start end');

    const weeklyResult = [];
    let current = dayjs(startDate);
    const endDay = dayjs(endDate);

    while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');

      const employeesStatus = employees.map((emp) => {
        const empBookings = allBookings.filter(
          (b) =>
            b.employee.toString() === emp._id.toString() &&
            dayjs(b.start).isSame(current, 'day'),
        );

        const requiredDuration = serviceId
          ? getEmployeeServiceDuration(emp, serviceId, defaultServiceDuration)
          : 15;

        const isFree = hasFreeTimeInDay(
          emp,
          dateStr,
          empBookings,
          requiredDuration,
        );

        return {
          employee: emp,
          hasFreeSlot: isFree,
        };
      });

      weeklyResult.push({
        date: dateStr,
        employees: employeesStatus,
      });

      current = current.add(1, 'day');
    }

    res.json(weeklyResult);
  } catch (error) {
    console.error('Weekly Availability Error:', error);
    res
      .status(500)
      .json({ message: 'Failed to calculate weekly availability' });
  }
};
