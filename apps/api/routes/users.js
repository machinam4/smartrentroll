const express = require('express');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { models } = require('@waterbills/db');

const router = express.Router();

router.use(authenticateToken);

// Get all users (admin only)
router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const users = await models.User.find()
      .select('-password')
      .populate('buildingId', 'name')
      .populate('premiseId', 'unitNo')
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get users by building (manager)
router.get('/building/:buildingId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { buildingId } = req.params;

    // Check access
    if (req.user.role === 'manager' && req.user.buildingId.toString() !== buildingId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await models.User.find({ buildingId })
      .select('-password')
      .populate('premiseId', 'unitNo')
      .sort({ role: 1, name: 1 });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

module.exports = router;
