const { z } = require('zod');
const { format, parseISO, addMonths, startOfMonth, endOfMonth } = require('date-fns');

// Common validation schemas
const schemas = {
  // Building schemas
  building: z.object({
    name: z.string().min(1, 'Building name is required'),
    address: z.string().min(1, 'Address is required'),
    timezone: z.string().default('Africa/Nairobi'),
    council_meter_id: z.string().optional(),
    borehole_meter_id: z.string().optional(),
    pumping_cost_per_month: z.number().min(0).default(0)
  }),

  // Premise schemas
  premise: z.object({
    buildingId: z.string().min(1, 'Building ID is required'),
    unitNo: z.string().min(1, 'Unit number is required'),
    type: z.enum(['shop', 'apartment']),
    monthly_rent: z.number().min(0, 'Monthly rent must be positive'),
    disconnect_after_day_of_month: z.number().min(1).max(31).default(20),
    previous_balance: z.number().default(0),
    tags: z.array(z.string()).default([])
  }),

  // Meter schemas
  meter: z.object({
    buildingId: z.string().min(1, 'Building ID is required'),
    type: z.enum(['submeter', 'council', 'borehole']),
    premiseId: z.string().optional(),
    label: z.string().min(1, 'Meter label is required'),
    unit: z.string().default('m3')
  }),

  // Meter reading schemas
  meterReading: z.object({
    meterId: z.string().min(1, 'Meter ID is required'),
    buildingId: z.string().min(1, 'Building ID is required'),
    premiseId: z.string().optional(),
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
    reading: z.number().min(0, 'Reading must be non-negative'),
    readingDate: z.string().datetime(),
    createdBy: z.string().min(1, 'Created by is required'),
    notes: z.string().optional()
  }),

  // Invoice schemas
  invoice: z.object({
    premiseId: z.string().min(1, 'Premise ID is required'),
    period: z.string().regex(/^\d{4}-\d{2}$/, 'Period must be in YYYY-MM format'),
    invoiceDate: z.string().date(),
    dueDate: z.string().date(),
    rent_amount: z.number().min(0),
    water_amount: z.number().min(0),
    previous_balance: z.number().default(0),
    penalty_amount: z.number().default(0),
    total_amount: z.number().min(0),
    amount_paid: z.number().default(0),
    status: z.enum(['unpaid', 'partial', 'paid', 'overdue'])
  }),

  // Payment schemas
  payment: z.object({
    invoiceId: z.string().min(1, 'Invoice ID is required'),
    amount: z.number().min(0.01, 'Amount must be positive'),
    method: z.enum(['mpesa', 'cash', 'bank']),
    transactionRef: z.string().optional(),
    paymentDate: z.string().datetime(),
    createdBy: z.string().min(1, 'Created by is required')
  }),

  // User schemas
  user: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'manager', 'tenant']),
    buildingId: z.string().optional(),
    premiseId: z.string().optional(),
    name: z.string().min(1, 'Name is required')
  }),

  // Settings schemas
  settings: z.object({
    buildingId: z.string().min(1, 'Building ID is required'),
    council_price_per_m3: z.number().min(0),
    borehole_price_per_m3: z.number().min(0),
    pumping_cost_per_month: z.number().min(0),
    penalty_daily: z.number().min(0),
    prorate_precision: z.number().min(0).max(4).default(2)
  })
};

// Utility functions
const utils = {
  // Date utilities
  formatDate: (date, formatStr = 'yyyy-MM-dd') => {
    return format(parseISO(date), formatStr);
  },

  getCurrentPeriod: () => {
    return format(new Date(), 'yyyy-MM');
  },

  getNextPeriod: () => {
    return format(addMonths(new Date(), 1), 'yyyy-MM');
  },

  getPeriodStart: (period) => {
    return startOfMonth(parseISO(`${period}-01`));
  },

  getPeriodEnd: (period) => {
    return endOfMonth(parseISO(`${period}-01`));
  },

  // Money utilities
  formatCurrency: (amount, currency = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount / 100); // Assuming amounts are stored in cents
  },

  parseCurrency: (amount) => {
    return Math.round(parseFloat(amount) * 100); // Convert to cents
  },

  // Validation utilities
  validateSchema: (schema, data) => {
    try {
      return { success: true, data: schema.parse(data) };
    } catch (error) {
      return { 
        success: false, 
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      };
    }
  },

  // Billing utilities
  calculateDaysLate: (dueDate, currentDate = new Date()) => {
    const due = parseISO(dueDate);
    const current = parseISO(currentDate.toISOString());
    const diffTime = current - due;
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  },

  calculatePenalty: (daysLate, dailyRate, unpaidAmount) => {
    if (unpaidAmount <= 0) return 0;
    return Math.round(daysLate * dailyRate * 100); // Return in cents
  },

  // Rounding utilities
  roundToPrecision: (value, precision = 2) => {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  },

  // ID generation utilities
  generateId: (prefix, suffix = '') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${random}${suffix}`;
  }
};

module.exports = {
  schemas,
  utils
};
