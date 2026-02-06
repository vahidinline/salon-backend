const express = require('express');
const router = express.Router({ mergeParams: true });
const availabilityController = require('../controllers/availabilityController');

// This route returns the list of employees with a boolean 'hasFreeSlot' for a specific date
// Used by WeeklyCalendar.tsx
router.get('/freeslots', availabilityController.getDailyAvailabilityStatus);
router.get('/weekly-slots', availabilityController.getWeeklyAvailabilityStatus);

module.exports = router;
