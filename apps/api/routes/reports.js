const express = require('express');
const { authenticateToken, requireRole, requireBuildingAccess } = require('../middleware/auth');
const { models } = require('@waterbills/db');

const router = express.Router();

router.use(authenticateToken);

// Get water consumption report
router.get('/water/:buildingId', requireBuildingAccess, async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { period } = req.query;

    if (!period) {
      return res.status(400).json({ error: 'Period is required' });
    }

    // Get meter readings for the period
    const readings = await models.MeterReading.find({
      buildingId,
      period
    }).populate('meterId', 'type label premiseId');

    // Group by meter type
    const report = {
      period,
      buildingId,
      council: readings.filter(r => r.meterId.type === 'council'),
      borehole: readings.filter(r => r.meterId.type === 'borehole'),
      submeters: readings.filter(r => r.meterId.type === 'submeter')
    };

    res.json({ report });
  } catch (error) {
    console.error('Error generating water report:', error);
    res.status(500).json({ error: 'Failed to generate water report' });
  }
});

// Get revenue report
router.get('/revenue/:buildingId', requireBuildingAccess, async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { buildingId };
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await models.Payment.find(filter)
      .populate('invoiceId', 'period')
      .populate('premiseId', 'unitNo')
      .sort({ paymentDate: -1 });

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      buildingId,
      period: { startDate, endDate },
      totalRevenue,
      paymentCount: payments.length,
      payments
    });
  } catch (error) {
    console.error('Error generating revenue report:', error);
    res.status(500).json({ error: 'Failed to generate revenue report' });
  }
});

module.exports = router;
