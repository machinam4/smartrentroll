const express = require('express');
const { authenticateToken, requireRole, requireBuildingAccess } = require('../middleware/auth');
const { models } = require('@waterbills/db');

const router = express.Router();

router.use(authenticateToken);

// Get settings for a building
router.get('/:buildingId', requireBuildingAccess, async (req, res) => {
  try {
    const settings = await models.Settings.findOne({ buildingId: req.params.buildingId });

    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }

    res.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update settings
router.put('/:buildingId', requireBuildingAccess, requireRole(['admin', 'manager']), async (req, res) => {
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
