const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, requireBuildingAccess } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const { models } = require('@waterbills/db');

const router = express.Router();

router.use(authenticateToken);

// Get all premises
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'manager') {
      filter.buildingId = req.user.buildingId;
    }

    const premises = await models.Premise.find(filter)
      .populate('buildingId', 'name address')
      .sort({ unitNo: 1 });

    res.json({ premises });
  } catch (error) {
    console.error('Error fetching premises:', error);
    res.status(500).json({ error: 'Failed to fetch premises' });
  }
});

// Get single premise
router.get('/:premiseId', async (req, res) => {
  try {
    const premise = await models.Premise.findById(req.params.premiseId)
      .populate('buildingId', 'name address');

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    // Check access
    if (req.user.role === 'manager' && premise.buildingId._id.toString() !== req.user.buildingId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'tenant' && premise._id.toString() !== req.user.premiseId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ premise });
  } catch (error) {
    console.error('Error fetching premise:', error);
    res.status(500).json({ error: 'Failed to fetch premise' });
  }
});

// Create premise
router.post('/', requireRole(['admin', 'manager']), validateRequest(schemas.premise), async (req, res) => {
  try {
    const premise = new models.Premise(req.validatedData);
    await premise.save();

    // Create submeter for the premise
    const submeter = new models.Meter({
      buildingId: premise.buildingId,
      premiseId: premise._id,
      type: 'submeter',
      label: `${premise.unitNo} - Submeter`,
      unit: 'm3'
    });
    await submeter.save();

    res.status(201).json({
      message: 'Premise created successfully with submeter',
      premise: {
        ...premise.toObject(),
        submeter
      }
    });
  } catch (error) {
    console.error('Error creating premise:', error);
    res.status(500).json({ error: 'Failed to create premise' });
  }
});

// Update premise
router.put('/:premiseId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const premise = await models.Premise.findByIdAndUpdate(
      req.params.premiseId,
      req.body,
      { new: true, runValidators: true }
    );

    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    res.json({
      message: 'Premise updated successfully',
      premise
    });
  } catch (error) {
    console.error('Error updating premise:', error);
    res.status(500).json({ error: 'Failed to update premise' });
  }
});

module.exports = router;
