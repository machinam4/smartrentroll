const express = require('express');
const { validateRequest, validateParams, validateQuery } = require('../middleware/validation');
const { authenticateToken, requireRole, requireBuildingAccess, requirePremiseAccess } = require('../middleware/auth');
const { schemas } = require('@waterbills/shared');
const { models } = require('@waterbills/db');
const billingService = require('../services/billingService');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get invoices with filters
router.get('/', async (req, res) => {
  try {
    const { premiseId, buildingId, period, status } = req.query;
    const filter = {};

    // Apply role-based filtering
    if (req.user.role === 'tenant') {
      filter.premiseId = req.user.premiseId;
    } else if (req.user.role === 'manager') {
      filter.buildingId = req.user.buildingId;
    }

    // Apply query filters
    if (premiseId) filter.premiseId = premiseId;
    if (buildingId) filter.buildingId = buildingId;
    if (period) filter.period = period;
    if (status) filter.status = status;

    const invoices = await models.Invoice.find(filter)
      .populate('premiseId', 'unitNo type monthly_rent')
      .populate('buildingId', 'name address')
      .populate('payments.paymentId')
      .sort({ createdAt: -1 });

    res.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
router.get('/:invoiceId', async (req, res) => {
  try {
    const invoice = await models.Invoice.findById(req.params.invoiceId)
      .populate('premiseId', 'unitNo type monthly_rent')
      .populate('buildingId', 'name address')
      .populate('payments.paymentId');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access permissions
    if (req.user.role === 'tenant' && invoice.premiseId._id.toString() !== req.user.premiseId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'manager' && invoice.buildingId._id.toString() !== req.user.buildingId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ invoice });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create new invoice
router.post('/', requireRole(['admin', 'manager']), validateRequest(schemas.invoice), async (req, res) => {
  try {
    const invoice = new models.Invoice(req.validatedData);
    await invoice.save();

    // Populate the created invoice
    await invoice.populate('premiseId', 'unitNo type monthly_rent');
    await invoice.populate('buildingId', 'name address');

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Generate invoice preview
router.post('/preview', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { buildingId, period } = req.body;

    if (!buildingId || !period) {
      return res.status(400).json({ error: 'Building ID and period are required' });
    }

    // Check building access
    if (req.user.role === 'manager' && req.user.buildingId.toString() !== buildingId) {
      return res.status(403).json({ error: 'Access denied to this building' });
    }

    const preview = await billingService.calculateBuildingWaterUsage(buildingId, period);
    
    // Get premises for the building
    const premises = await models.Premise.find({ buildingId });
    
    const premiseDetails = premises.map(premise => ({
      premiseId: premise._id,
      unitNo: premise.unitNo,
      monthly_rent: premise.monthly_rent,
      previous_balance: premise.previous_balance
    }));

    res.json({
      buildingId,
      period,
      total_building_bill: preview.totalBuildingBill,
      total_submeter_units: preview.totalSubmeterUnits,
      per_unit_rate: preview.perUnitRate,
      premises: premiseDetails
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// Generate invoices for a building
router.post('/generate', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { buildingId, period } = req.body;

    if (!buildingId || !period) {
      return res.status(400).json({ error: 'Building ID and period are required' });
    }

    // Check building access
    if (req.user.role === 'manager' && req.user.buildingId.toString() !== buildingId) {
      return res.status(403).json({ error: 'Access denied to this building' });
    }

    const results = await billingService.generateBuildingInvoices(buildingId, period);
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      message: `Generated ${successful.length} invoices successfully`,
      period,
      buildingId,
      results: {
        successful: successful.length,
        failed: failed.length,
        details: results
      }
    });
  } catch (error) {
    console.error('Error generating invoices:', error);
    res.status(500).json({ error: 'Failed to generate invoices' });
  }
});

// Generate single invoice
router.post('/generate/:premiseId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { premiseId } = req.params;
    const { period } = req.body;

    if (!period) {
      return res.status(400).json({ error: 'Period is required' });
    }

    const premise = await models.Premise.findById(premiseId);
    if (!premise) {
      return res.status(404).json({ error: 'Premise not found' });
    }

    // Check building access
    if (req.user.role === 'manager' && req.user.buildingId.toString() !== premise.buildingId.toString()) {
      return res.status(403).json({ error: 'Access denied to this building' });
    }

    const invoice = await billingService.generateInvoice(premiseId, period);

    res.status(201).json({
      message: 'Invoice generated successfully',
      invoice
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

// Update invoice (admin/manager only)
router.put('/:invoiceId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const invoice = await models.Invoice.findById(req.params.invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check building access
    if (req.user.role === 'manager' && req.user.buildingId.toString() !== invoice.buildingId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedInvoice = await models.Invoice.findByIdAndUpdate(
      req.params.invoiceId,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Invoice updated successfully',
      invoice: updatedInvoice
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Delete invoice
router.delete('/:invoiceId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const invoice = await models.Invoice.findById(req.params.invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check building access
    if (req.user.role === 'manager' && req.user.buildingId.toString() !== invoice.buildingId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await models.Invoice.findByIdAndDelete(req.params.invoiceId);

    res.json({
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

// Recalculate penalty for an invoice
router.post('/:invoiceId/recalculate-penalty', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const result = await billingService.calculatePenalty(req.params.invoiceId);
    
    res.json({
      message: 'Penalty recalculated successfully',
      result
    });
  } catch (error) {
    console.error('Error recalculating penalty:', error);
    res.status(500).json({ error: 'Failed to recalculate penalty' });
  }
});

// Get invoice receipt
router.get('/:invoiceId/receipt', async (req, res) => {
  try {
    const invoice = await models.Invoice.findById(req.params.invoiceId)
      .populate('premiseId', 'unitNo type')
      .populate('buildingId', 'name address')
      .populate('payments.paymentId');

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check access permissions
    if (req.user.role === 'tenant' && invoice.premiseId._id.toString() !== req.user.premiseId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'manager' && invoice.buildingId._id.toString() !== req.user.buildingId.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate receipt data
    const receipt = {
      invoiceNumber: invoice._id,
      premise: invoice.premiseId,
      building: invoice.buildingId,
      period: invoice.period,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      rent_amount: invoice.rent_amount,
      water_amount: invoice.water_amount,
      previous_balance: invoice.previous_balance,
      penalty_amount: invoice.penalty_amount,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      status: invoice.status,
      payments: invoice.payments
    };

    res.json({ receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

module.exports = router;
