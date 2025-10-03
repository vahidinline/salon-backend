// controllers/reservationController.js
const Reservation = require('../models/Reservation');
const Availability = require('../models/Availability');

async function listReservations(req, res) {
  const list = await Reservation.find().populate(
    'service selectedAvailability proposedOptions'
  );
  res.json(list);
}

async function cancelReservation(req, res) {
  const id = req.params.id;
  const r = await Reservation.findById(id);
  if (!r) return res.status(404).json({ error: 'not found' });
  if (r.selectedAvailability) {
    const a = await Availability.findById(r.selectedAvailability);
    if (a) {
      a.isBooked = false;
      a.bookedBy = undefined;
      await a.save();
    }
  }
  r.status = 'cancelled';
  await r.save();
  res.json({ ok: true });
}

module.exports = { listReservations, cancelReservation };
