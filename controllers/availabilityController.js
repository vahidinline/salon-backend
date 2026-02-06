const dayjs = require('dayjs');
const Employee = require('../models/Employee');
const Booking = require('../models/Booking');

// Helper to check if a day has ANY free slot larger than minDuration
const hasFreeTimeInDay = (
  employee,
  dateStr,
  bookings,
  minDurationMinutes = 15,
) => {
  const weekday = dayjs(dateStr).format('dddd').toLowerCase();

  // Find work schedule for this specific weekday
  const workSchedule = employee.workSchedule.find(
    (ws) => ws.day.toLowerCase() === weekday,
  );

  if (!workSchedule) return false;

  // Define Work Start/End
  const workStart = dayjs(`${dateStr} ${workSchedule.startTime}`);
  const workEnd = dayjs(`${dateStr} ${workSchedule.endTime}`);

  // Sort bookings by start time
  const sortedBookings = bookings.sort(
    (a, b) => new Date(a.start) - new Date(b.start),
  );

  let lastEndTime = workStart;

  // Iterate through bookings to find gaps
  for (const booking of sortedBookings) {
    const bookingStart = dayjs(booking.start);
    const bookingEnd = dayjs(booking.end);

    // Calculate gap in minutes
    const diff = bookingStart.diff(lastEndTime, 'minute');

    // If gap is enough for minimum service
    if (diff >= minDurationMinutes) {
      return true;
    }

    // Move cursor, ensuring we don't go backwards (in case of overlapping logic errors)
    if (bookingEnd.isAfter(lastEndTime)) {
      lastEndTime = bookingEnd;
    }
  }

  // Check final gap (Last Booking -> End of Day)
  const finalDiff = workEnd.diff(lastEndTime, 'minute');
  if (finalDiff >= minDurationMinutes) {
    return true;
  }

  return false;
};

exports.getDailyAvailabilityStatus = async (req, res) => {
  try {
    const { date } = req.query;
    const { salonId } = req.params;

    if (!salonId || !date) {
      return res.status(400).json({ message: 'salonId and date are required' });
    }

    // Define day range
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // 1. Fetch Employees
    const employees = await Employee.find({ salon: salonId }).populate(
      'services',
    );

    const results = [];

    for (const emp of employees) {
      // 2. Fetch CONFIRMED or PENDING bookings for this employee on this day
      // Note: We ignore cancelled/expired/rejected bookings to show them as free
      const bookings = await Booking.find({
        employee: emp._id,
        start: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
      }).select('start end');

      // 3. Calculate Logic
      const isFree = hasFreeTimeInDay(emp, date, bookings);

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

// ... (کدهای قبلی فایل)

// فانکشن جدید برای دریافت وضعیت کل هفته با یک درخواست
exports.getWeeklyAvailabilityStatus = async (req, res) => {
  try {
    const { startDate, endDate, salonId } = req.query;

    if (!salonId || !startDate || !endDate) {
      return res.status(400).json({ message: 'Missing parameters' });
    }

    // تبدیل تاریخ‌ها به آبجکت Date
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // ۱. دریافت تمام کارمندان سالن
    const employees = await Employee.find({ salon: salonId }).populate(
      'services',
    );

    // ۲. دریافت تمام رزروهای این بازه زمانی (یک کوئری به جای ۷ تا)
    const allBookings = await Booking.find({
      salon: salonId, // اطمینان از اینکه رزروهای همین سالن است
      start: { $gte: start, $lte: end },
      status: { $in: ['pending', 'confirmed', 'paid', 'review'] },
    }).select('employee start end');

    const weeklyResult = [];

    // ۳. حلقه روی روزهای بازه (مثلا ۷ روز)
    let current = dayjs(startDate);
    const endDay = dayjs(endDate);

    while (current.isBefore(endDay) || current.isSame(endDay, 'day')) {
      const dateStr = current.format('YYYY-MM-DD');

      // برای این روز خاص، وضعیت همه کارمندان را چک می‌کنیم
      const employeesStatus = employees.map((emp) => {
        // فیلتر کردن رزروهای مربوط به این کارمند و این روز خاص
        // نکته: چون allBookings را یکجا گرفتیم، اینجا فقط فیلتر جاوااسکریپتی می‌زنیم که سریعه
        const empBookings = allBookings.filter(
          (b) =>
            b.employee.toString() === emp._id.toString() &&
            dayjs(b.start).isSame(current, 'day'),
        );

        const isFree = hasFreeTimeInDay(emp, dateStr, empBookings);

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
