const express = require('express');
const { validateRequest } = require('../middleware/validation');
const { authenticateToken, requireRole, requirePremiseAccess } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const { models } = require('@waterbills/db');
const billingService = require('../services/billingService');

const router = express.Router();

router.use(authenticateToken);

// Get payments
router.get('/', async (req, res) => {
  try {
    const { invoiceId, premiseId } = req.query;
    const filter = {};

    if (invoiceId) filter.invoiceId = invoiceId;
    if (premiseId) filter.premiseId = premiseId;

    // Apply role-based filtering
    if (req.user.role === 'tenant') {
      filter.premiseId = req.user.premiseId;
    } else if (req.user.role === 'manager') {
      // Get all premises in manager's building
      const premises = await models.Premise.find({ buildingId: req.user.buildingId });
      filter.premiseId = { $in: premises.map(p => p._id) };
    }

    const payments = await models.Payment.find(filter)
      .populate('invoiceId', 'period total_amount')
      .populate('premiseId', 'unitNo')
      .sort({ createdAt: -1 });

    res.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Process payment
router.post('/', validateRequest(schemas.payment), async (req, res) => {
  try {
    const { invoiceId, amount, method, transactionRef } = req.validatedData;

    // Get invoice to check access
    const invoice = await models.Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access permissions
    if (req.user.role === 'tenant' && invoice.premiseId.toString() !== req.user.premiseId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'manager') {
      const premise = await models.Premise.findById(invoice.premiseId);
      if (premise.buildingId.toString() !== req.user.buildingId.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const paymentData = {
      amount,
      method,
      transactionRef,
      paymentDate: new Date(),
      createdBy: req.user._id
    };

    const result = await billingService.processPayment(invoiceId, paymentData);

    res.status(201).json({
      message: 'Payment processed successfully',
      payment: result.payment,
      invoice: result.invoice,
      receipt: result.receipt
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

module.exports = router;
