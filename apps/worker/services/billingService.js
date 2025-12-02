const { models } = require('@waterbills/db');
const { utils } = require('@waterbills/shared');

class BillingService {
  /**
   * Calculate water usage for a building for a given period
   */
  async calculateBuildingWaterUsage(buildingId, period) {
    try {
      // Get building settings
      const settings = await models.Settings.findOne({ buildingId });
      if (!settings) {
        throw new Error('Building settings not found');
      }

      // Get building meters
      const building = await models.Building.findById(buildingId);
      if (!building) {
        throw new Error('Building not found');
      }

      // Get council and borehole meter readings for current and previous period
      const currentPeriod = period;
      const previousPeriod = this.getPreviousPeriod(period);

      const councilReadings = await this.getMeterReadings(
        building.council_meter_id, 
        currentPeriod, 
        previousPeriod
      );
      
      const boreholeReadings = await this.getMeterReadings(
        building.borehole_meter_id, 
        currentPeriod, 
        previousPeriod
      );

      // Calculate consumption
      const councilUnits = councilReadings.current - councilReadings.previous;
      const boreholeUnits = boreholeReadings.current - boreholeReadings.previous;

      // Calculate total building water bill
      const councilCost = councilUnits * settings.council_price_per_m3;
      const boreholeCost = boreholeUnits * settings.borehole_price_per_m3;
      const totalBuildingBill = councilCost + boreholeCost + settings.pumping_cost_per_month;

      // Get all submeter readings for the period
      const submeterReadings = await this.getSubmeterReadings(buildingId, currentPeriod, previousPeriod);
      
      const totalSubmeterUnits = submeterReadings.reduce((sum, reading) => {
        return sum + (reading.current - reading.previous);
      }, 0);

      // Calculate per-unit rate
      let perUnitRate = 0;
      if (totalSubmeterUnits > 0) {
        perUnitRate = totalBuildingBill / totalSubmeterUnits;
      }

      return {
        buildingId,
        period,
        councilUnits,
        boreholeUnits,
        totalBuildingBill,
        totalSubmeterUnits,
        perUnitRate,
        submeterReadings,
        settings
      };
    } catch (error) {
      console.error('Error calculating building water usage:', error);
      throw error;
    }
  }

  /**
   * Generate invoice for a premise
   */
  async generateInvoice(premiseId, period) {
    try {
      const premise = await models.Premise.findById(premiseId)
        .populate('buildingId');
      
      if (!premise) {
        throw new Error('Premise not found');
      }

      // Check if invoice already exists
      const existingInvoice = await models.Invoice.findOne({
        premiseId,
        period
      });

      if (existingInvoice) {
        return existingInvoice;
      }

      // Calculate water usage for the building
      const waterUsage = await this.calculateBuildingWaterUsage(
        premise.buildingId._id, 
        period
      );

      // Get premise submeter reading
      const premiseSubmeter = await models.Meter.findOne({
        buildingId: premise.buildingId._id,
        premiseId: premise._id,
        type: 'submeter'
      });

      let waterAmount = 0;
      if (premiseSubmeter) {
        const submeterReading = waterUsage.submeterReadings.find(
          r => r.meterId.toString() === premiseSubmeter._id.toString()
        );
        
        if (submeterReading) {
          const submeterUnits = submeterReading.current - submeterReading.previous;
          waterAmount = utils.roundToPrecision(submeterUnits * waterUsage.perUnitRate, 2);
        }
      }

      // Calculate dates
      const invoiceDate = new Date();
      const dueDate = this.calculateDueDate(period);

      // Calculate total amount
      const totalAmount = premise.monthly_rent + waterAmount + premise.previous_balance;

      // Create invoice
      const invoice = new models.Invoice({
        premiseId: premise._id,
        buildingId: premise.buildingId._id,
        period,
        invoiceDate,
        dueDate,
        rent_amount: premise.monthly_rent,
        water_amount: waterAmount,
        previous_balance: premise.previous_balance,
        penalty_amount: 0,
        total_amount: totalAmount,
        amount_paid: 0,
        status: 'unpaid'
      });

      await invoice.save();

      // Log audit
      await this.logAudit('Invoice', invoice._id, 'CREATE', {
        premiseId: premise._id,
        period,
        totalAmount
      }, 'system');

      return invoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  /**
   * Generate invoices for all premises in a building
   */
  async generateBuildingInvoices(buildingId, period) {
    try {
      const premises = await models.Premise.find({ buildingId });
      const results = [];

      for (const premise of premises) {
        try {
          const invoice = await this.generateInvoice(premise._id, period);
          results.push({ premiseId: premise._id, invoice, success: true });
        } catch (error) {
          console.error(`Failed to generate invoice for premise ${premise._id}:`, error);
          results.push({ 
            premiseId: premise._id, 
            error: error.message, 
            success: false 
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error generating building invoices:', error);
      throw error;
    }
  }

  /**
   * Calculate penalty for an invoice
   */
  async calculatePenalty(invoiceId) {
    try {
      const invoice = await models.Invoice.findById(invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const settings = await models.Settings.findOne({ 
        buildingId: invoice.buildingId 
      });
      
      if (!settings) {
        throw new Error('Building settings not found');
      }

      const daysLate = utils.calculateDaysLate(invoice.dueDate);
      const unpaidAmount = invoice.total_amount - invoice.amount_paid;
      
      const penalty = utils.calculatePenalty(
        daysLate, 
        settings.penalty_daily, 
        unpaidAmount
      );

      // Update invoice penalty
      invoice.penalty_amount = penalty;
      invoice.total_amount = invoice.rent_amount + invoice.water_amount + 
                           invoice.previous_balance + penalty - invoice.amount_paid;
      
      // Update status
      if (invoice.amount_paid >= invoice.total_amount) {
        invoice.status = 'paid';
      } else if (invoice.amount_paid > 0) {
        invoice.status = 'partial';
      } else if (daysLate > 0) {
        invoice.status = 'overdue';
      } else {
        invoice.status = 'unpaid';
      }

      await invoice.save();

      return {
        invoiceId,
        daysLate,
        penalty,
        newTotal: invoice.total_amount,
        status: invoice.status
      };
    } catch (error) {
      console.error('Error calculating penalty:', error);
      throw error;
    }
  }

  /**
   * Get meter readings for current and previous period
   */
  async getMeterReadings(meterId, currentPeriod, previousPeriod) {
    const currentReading = await models.MeterReading.findOne({
      meterId,
      period: currentPeriod
    });

    const previousReading = await models.MeterReading.findOne({
      meterId,
      period: previousPeriod
    });

    return {
      current: currentReading ? currentReading.reading : 0,
      previous: previousReading ? previousReading.reading : 0
    };
  }

  /**
   * Get all submeter readings for a building
   */
  async getSubmeterReadings(buildingId, currentPeriod, previousPeriod) {
    const submeters = await models.Meter.find({
      buildingId,
      type: 'submeter'
    });

    const readings = [];
    for (const meter of submeters) {
      const reading = await this.getMeterReadings(meter._id, currentPeriod, previousPeriod);
      readings.push({
        meterId: meter._id,
        premiseId: meter.premiseId,
        current: reading.current,
        previous: reading.previous
      });
    }

    return readings;
  }

  /**
   * Get previous period
   */
  getPreviousPeriod(period) {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Calculate due date (8th of next month)
   */
  calculateDueDate(period) {
    const [year, month] = period.split('-').map(Number);
    return new Date(year, month, 8); // 8th of the month
  }

  /**
   * Log audit trail
   */
  async logAudit(entityType, entityId, action, changes, performedBy) {
    try {
      const auditLog = new models.AuditLog({
        entityType,
        entityId,
        action,
        changes,
        performedBy
      });

      await auditLog.save();
    } catch (error) {
      console.error('Error logging audit:', error);
      // Don't throw error for audit logging failures
    }
  }
}

module.exports = new BillingService();
