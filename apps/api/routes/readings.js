const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, requireBuildingAccess } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const { models } = require('@waterbills/db');

const router = express.Router();

router.use(authenticateToken);

// Get meter readings
router.get('/', async (req, res) => {
  try {
    const { meterId, buildingId, period } = req.query;
    const filter = {};

    if (meterId) filter.meterId = meterId;
    if (buildingId) filter.buildingId = buildingId;
    if (period) filter.period = period;

    // Apply role-based filtering
    if (req.user.role === 'manager') {
      filter.buildingId = req.user.buildingId;
    }

    const readings = await models.MeterReading.find(filter)
      .populate('meterId', 'label type')
      .populate('buildingId', 'name')
      .populate('premiseId', 'unitNo')
      .sort({ period: -1, createdAt: -1 });

    res.json({ readings });
  } catch (error) {
    console.error('Error fetching readings:', error);
    res.status(500).json({ error: 'Failed to fetch readings' });
  }
});

// Create meter reading
router.post('/', requireRole(['admin', 'manager']), validateRequest(schemas.meterReading), async (req, res) => {
  try {
    // Check if reading already exists for this meter and period
    const existingReading = await models.MeterReading.findOne({
      meterId: req.validatedData.meterId,
      period: req.validatedData.period
    });

    if (existingReading) {
      return res.status(400).json({ 
        error: 'Reading already exists for this meter and period',
        details: {
          meterId: req.validatedData.meterId,
          period: req.validatedData.period,
          existingReading: existingReading._id
        }
      });
    }

    const reading = new models.MeterReading({
      ...req.validatedData,
      createdBy: req.user._id
    });
    await reading.save();

    res.status(201).json({
      message: 'Reading recorded successfully',
      reading
    });
  } catch (error) {
    console.error('Error creating reading:', error);
    
    // Handle duplicate key error specifically
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: 'Reading already exists for this meter and period',
        details: error.keyPattern
      });
    }
    
    res.status(500).json({ error: 'Failed to record reading' });
  }
});

// Update meter reading
router.put('/:readingId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const reading = await models.MeterReading.findByIdAndUpdate(
      req.params.readingId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!reading) {
      return res.status(404).json({ error: 'Reading not found' });
    }

    res.json({
      message: 'Reading updated successfully',
      reading
    });
  } catch (error) {
    console.error('Error updating reading:', error);
    res.status(500).json({ error: 'Failed to update reading' });
  }
});

module.exports = router;
