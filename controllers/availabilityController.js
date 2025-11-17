// controllers/availabilityController.js
const dayjs = require('dayjs');
const Employee = require('../models/Employee');
const Reservation = require('../models/reservations');

exports.getWeekAvailability = async (req, res) => {
  try {
    const { startOfWeek } = req.query;
    const start = dayjs(startOfWeek).startOf('day');
    const end = start.add(6, 'day').endOf('day');

    const employees = await Employee.find({ status: 'active' });

    const days = {};
    for (let i = 0; i < 7; i++) {
      const day = start.add(i, 'day');
      const weekday = day.format('dddd').toLowerCase();

      // employees working on that day
      const workingEmployees = employees.filter((e) =>
        e.workSchedule.some((ws) => ws.day.toLowerCase().includes(weekday))
      );

      let slotCount = 0;

      for (const emp of workingEmployees) {
        const reservations = await Reservation.find({
          employee: emp._id,
          preferredDatetime: {
            $gte: day.startOf('day').toDate(),
            $lte: day.endOf('day').toDate(),
          },
          status: { $in: ['pending', 'confirmed'] },
        });

        const bookedTimes = reservations.map((r) =>
          dayjs(r.preferredDatetime).format('HH:mm')
        );

        emp.workSchedule
          .filter((ws) => ws.day.toLowerCase().includes(weekday))
          .forEach((ws) => {
            const startT = dayjs(`${day.format('YYYY-MM-DD')} ${ws.startTime}`);
            const endT = dayjs(`${day.format('YYYY-MM-DD')} ${ws.endTime}`);
            let current = startT;

            while (current.isBefore(endT)) {
              const timeStr = current.format('HH:mm');
              if (!bookedTimes.includes(timeStr)) slotCount++;
              current = current.add(30, 'minute'); // 30 min granularity
            }
          });
      }

      days[day.format('YYYY-MM-DD')] = {
        hasFreeSlot: slotCount > 0,
        slotCount,
      };
    }

    res.json(days);
  } catch (error) {
    console.error('Week Availability Error:', error);
    res.status(500).json({ message: 'Failed to get week availability' });
  }
};

exports.getDayAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const day = dayjs(date).startOf('day');
    const weekday = day.format('dddd').toLowerCase();

    const employees = await Employee.find({ status: 'active' });
    const slotsMap = {};

    for (const emp of employees) {
      const workDay = emp.workSchedule.find((ws) =>
        ws.day.toLowerCase().includes(weekday)
      );
      if (!workDay) continue;

      const reservations = await Reservation.find({
        employee: emp._id,
        preferredDatetime: {
          $gte: day.toDate(),
          $lte: day.endOf('day').toDate(),
        },
        status: { $in: ['pending', 'confirmed'] },
      });

      const bookedTimes = reservations.map((r) =>
        dayjs(r.preferredDatetime).format('HH:mm')
      );

      let current = dayjs(`${date} ${workDay.startTime}`);
      const endT = dayjs(`${date} ${workDay.endTime}`);

      while (current.isBefore(endT)) {
        const timeStr = current.format('HH:mm');
        if (!bookedTimes.includes(timeStr)) {
          if (!slotsMap[timeStr]) slotsMap[timeStr] = [];
          slotsMap[timeStr].push(emp._id);
        }
        current = current.add(30, 'minute');
      }
    }

    const slots = Object.keys(slotsMap).map((time) => ({
      time,
      availableEmployees: slotsMap[time],
    }));

    res.json(slots);
  } catch (error) {
    console.error('Day Availability Error:', error);
    res.status(500).json({ message: 'Failed to get day availability' });
  }
};

exports.getEmployeesForSlot = async (req, res) => {
  try {
    const { date, time } = req.query;
    const dateTime = dayjs(`${date} ${time}`);

    const weekday = dateTime.format('dddd').toLowerCase();
    const employees = await Employee.find({ status: 'active' }).populate(
      'services'
    );

    const available = [];

    for (const emp of employees) {
      const workDay = emp.workSchedule.find((ws) =>
        ws.day.toLowerCase().includes(weekday)
      );
      if (!workDay) continue;

      const start = dayjs(`${date} ${workDay.startTime}`);
      const end = dayjs(`${date} ${workDay.endTime}`);
      if (!dateTime.isBetween(start, end, null, '[)')) continue;

      const conflict = await Reservation.findOne({
        employee: emp._id,
        preferredDatetime: dateTime.toDate(),
        status: { $in: ['pending', 'confirmed'] },
      });

      if (!conflict) {
        available.push({
          _id: emp._id,
          name: emp.name,
          avatar: emp.avatar,
          services: emp.services,
        });
      }
    }

    res.json(available);
  } catch (error) {
    console.error('Employee Slot Error:', error);
    res.status(500).json({ message: 'Failed to get employees for slot' });
  }
};
