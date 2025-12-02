const express = require('express');
const { validateRequest, validateParams } = require('../middleware/validation');
const { authenticateToken, requireRole, requireBuildingAccess } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const { models } = require('@waterbills/db');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all buildings (admin only)
router.get('/', requireRole(['admin']), async (req, res) => {
  try {
    const buildings = await models.Building.find()
      .populate('premises')
      .sort({ createdAt: -1 });

    res.json({ buildings });
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// Get single building
router.get('/:buildingId', requireBuildingAccess, async (req, res) => {
  try {
    const building = await models.Building.findById(req.params.buildingId)
      .populate('premises')
      .populate('meters');

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    res.json({ building });
  } catch (error) {
    console.error('Error fetching building:', error);
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

// Create building (admin only)
router.post('/', requireRole(['admin']), validateRequest(schemas.building), async (req, res) => {
  try {
    const building = new models.Building(req.validatedData);
    await building.save();

    // Create default settings for the building
    const settings = new models.Settings({
      buildingId: building._id,
      council_price_per_m3: 60,
      borehole_price_per_m3: 30,
      pumping_cost_per_month: 5000,
      penalty_daily: 150,
      prorate_precision: 2
    });
    await settings.save();

    // Create council meter for the building
    const councilMeter = new models.Meter({
      buildingId: building._id,
      type: 'council',
      label: `${building.name} - Council Water`,
      unit: 'm3'
    });
    await councilMeter.save();

    // Create borehole meter for the building
    const boreholeMeter = new models.Meter({
      buildingId: building._id,
      type: 'borehole',
      label: `${building.name} - Borehole Water`,
      unit: 'm3'
    });
    await boreholeMeter.save();

    // Update building with meter IDs
    building.council_meter_id = councilMeter._id;
    building.borehole_meter_id = boreholeMeter._id;
    await building.save();

    res.status(201).json({
      message: 'Building created successfully with meters',
      building: {
        ...building.toObject(),
        councilMeter,
        boreholeMeter
      }
    });
  } catch (error) {
    console.error('Error creating building:', error);
    res.status(500).json({ error: 'Failed to create building' });
  }
});

// Update building
router.put('/:buildingId', requireBuildingAccess, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const building = await models.Building.findByIdAndUpdate(
      req.params.buildingId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    res.json({
      message: 'Building updated successfully',
      building
    });
  } catch (error) {
    console.error('Error updating building:', error);
    res.status(500).json({ error: 'Failed to update building' });
  }
});

// Delete building (admin only)
router.delete('/:buildingId', requireRole(['admin']), async (req, res) => {
  try {
    const building = await models.Building.findByIdAndDelete(req.params.buildingId);

    if (!building) {
      return res.status(404).json({ error: 'Building not found' });
    }

    // Also delete related settings
    await models.Settings.findOneAndDelete({ buildingId: building._id });

    res.json({ message: 'Building deleted successfully' });
  } catch (error) {
    console.error('Error deleting building:', error);
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

// Get building premises
router.get('/:buildingId/premises', requireBuildingAccess, async (req, res) => {
  try {
    const premises = await models.Premise.find({ buildingId: req.params.buildingId })
      .sort({ unitNo: 1 });

    res.json({ premises });
  } catch (error) {
    console.error('Error fetching premises:', error);
    res.status(500).json({ error: 'Failed to fetch premises' });
  }
});

// Get building meters
router.get('/:buildingId/meters', requireBuildingAccess, async (req, res) => {
  try {
    const meters = await models.Meter.find({ buildingId: req.params.buildingId })
      .populate('premiseId', 'unitNo')
      .sort({ type: 1, label: 1 });

    res.json({ meters });
  } catch (error) {
    console.error('Error fetching meters:', error);
    res.status(500).json({ error: 'Failed to fetch meters' });
  }
});

// Get building settings
router.get('/:buildingId/settings', requireBuildingAccess, async (req, res) => {
  try {
    const settings = await models.Settings.findOne({ buildingId: req.params.buildingId });

    if (!settings) {
      return res.status(404).json({ error: 'Building settings not found' });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update building settings
router.put('/:buildingId/settings', requireBuildingAccess, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const settings = await models.Settings.findOneAndUpdate(
      { buildingId: req.params.buildingId },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      message: 'Settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
