const RoomBooking = require('../models/RoomBooking');
const Room = require('../models/Room');
const Batch = require('../models/Batch');
const Student = require('../models/Student');

exports.getSchedule = async (req, res) => {
  try {
    const student = await Student.findOne({ where: { user_id: req.user.id, branch_id: req.branchId } });
    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    if (!student.batch_id) {
      return res.json([]); // No classes yet
    }

    const bookings = await RoomBooking.findAll({
      where: {
        branch_id: req.branchId,
        batch_id: student.batch_id,
        // Optional: you can filter by date >= today
        // date: { [Op.gte]: new Date() }
      },
      include: [
        { model: Room, attributes: ['name', 'floor'] },
        { model: Batch, attributes: ['name'] }
      ],
      order: [['date', 'ASC'], ['start_time', 'ASC']]
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
