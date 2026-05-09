const Notification = require('../models/Notification');
const User = require('../models/User');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    notification.is_read = true;
    await notification.save();

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// For admin/system use
exports.createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body;
    const branchId = req.branchId;
    
    // Minimal validation
    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'user_id, title, and message are required' });
    }

    const targetUser = await User.findOne({ where: { id: user_id, branch_id: branchId } });
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found in this branch' });
    }

    const notification = await Notification.create({
      user_id,
      branch_id: branchId,
      title,
      message,
      type: type || 'info'
    });

    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
