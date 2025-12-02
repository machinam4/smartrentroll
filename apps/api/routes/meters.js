const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, requireBuildingAccess } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const { models } = require('@waterbills/db');

const router = express.Router();

router.use(authenticateToken);

// Get all meters
router.get('/', async (req, res) => {
  try {
    const { buildingId } = req.query;
    const filter = {};

    // Apply role-based filtering
    if (req.user.role === 'manager') {
      filter.buildingId = req.user.buildingId;
    } else if (req.user.role === 'admin' && buildingId) {
      filter.buildingId = buildingId;
    }
    // For admin users, if no buildingId is specified, show all meters

    const meters = await models.Meter.find(filter)
      .populate('buildingId', 'name')
      .populate('premiseId', 'unitNo')
      .sort({ type: 1, label: 1 });

    res.json({ meters });
  } catch (error) {
    console.error('Error fetching meters:', error);
    res.status(500).json({ error: 'Failed to fetch meters' });
  }
});

// Create meter
router.post('/', requireRole(['admin', 'manager']), validateRequest(schemas.meter), async (req, res) => {
  try {
    const meter = new models.Meter(req.validatedData);
    await meter.save();

    res.status(201).json({
      message: 'Meter created successfully',
      meter
    });
  } catch (error) {
    console.error('Error creating meter:', error);
    res.status(500).json({ error: 'Failed to create meter' });
  }
});

module.exports = router;
