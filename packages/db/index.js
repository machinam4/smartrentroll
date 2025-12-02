const mongoose = require('mongoose');
const { schemas } = require('@waterbills/shared');

// Database connection
let connection = null;

const connectDB = async (uri) => {
  try {
    if (!connection) {
      connection = await mongoose.connect(uri);
      console.log('MongoDB connected successfully');
    }
    return connection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

const disconnectDB = async () => {
  if (connection) {
    await mongoose.disconnect();
    connection = null;
    console.log('MongoDB disconnected');
  }
};

// Building Schema
const buildingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  timezone: {
    type: String,
    default: 'Africa/Nairobi'
  },
  council_meter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meter',
    default: null
  },
  borehole_meter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meter',
    default: null
  },
  pumping_cost_per_month: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Add virtual for premises
buildingSchema.virtual('premises', {
  ref: 'Premise',
  localField: '_id',
  foreignField: 'buildingId'
});

// Add virtual for meters
buildingSchema.virtual('meters', {
  ref: 'Meter',
  localField: '_id',
  foreignField: 'buildingId'
});

// Premise Schema
const premiseSchema = new mongoose.Schema({
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  unitNo: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['shop', 'apartment'],
    required: true
  },
  monthly_rent: {
    type: Number,
    required: true,
    min: 0
  },
  disconnect_after_day_of_month: {
    type: Number,
    default: 20,
    min: 1,
    max: 31
  },
  previous_balance: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Meter Schema
const meterSchema = new mongoose.Schema({
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  type: {
    type: String,
    enum: ['submeter', 'council', 'borehole'],
    required: true
  },
  premiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Premise',
    required: function() {
      return this.type === 'submeter';
    }
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  unit: {
    type: String,
    default: 'm3'
  }
}, {
  timestamps: true
});

// Meter Reading Schema
const meterReadingSchema = new mongoose.Schema({
  meterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meter',
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  premiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Premise',
    required: false
  },
  period: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  reading: {
    type: Number,
    required: true,
    min: 0
  },
  readingDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  notes: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

// Invoice Schema
const invoiceSchema = new mongoose.Schema({
  premiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Premise',
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  period: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}$/
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  rent_amount: {
    type: Number,
    required: true,
    min: 0
  },
  water_amount: {
    type: Number,
    required: true,
    min: 0
  },
  previous_balance: {
    type: Number,
    default: 0
  },
  penalty_amount: {
    type: Number,
    default: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  amount_paid: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['unpaid', 'partial', 'paid', 'overdue'],
    default: 'unpaid'
  },
  payments: [{
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    amount: Number,
    date: Date
  }],
  water_connection_status: {
    type: String,
    enum: ['CONNECTED', 'DISCONNECT'],
    default: 'CONNECTED'
  }
}, {
  timestamps: true
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  premiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Premise',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  method: {
    type: String,
    enum: ['mpesa', 'cash', 'bank'],
    required: true
  },
  transactionRef: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
}, {
  timestamps: true
});

// Receipt Schema
const receiptSchema = new mongoose.Schema({
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    required: true
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  premiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Premise',
    required: true
  },
  receiptNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentDate: {
    type: Date,
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// User Schema
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'tenant'],
    required: true
  },
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: function() {
      return ['manager', 'tenant'].includes(this.role);
    }
  },
  premiseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Premise',
    required: function() {
      return this.role === 'tenant';
    }
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Settings Schema
const settingsSchema = new mongoose.Schema({
  buildingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Building',
    required: true
  },
  council_price_per_m3: {
    type: Number,
    required: true,
    min: 0
  },
  borehole_price_per_m3: {
    type: Number,
    required: true,
    min: 0
  },
  pumping_cost_per_month: {
    type: Number,
    required: true,
    min: 0
  },
  penalty_daily: {
    type: Number,
    required: true,
    min: 0
  },
  prorate_precision: {
    type: Number,
    default: 2,
    min: 0,
    max: 4
  }
}, {
  timestamps: true
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  entityType: {
    type: String,
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  changes: {
    type: mongoose.Schema.Types.Mixed
  },
  performedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Indexes
buildingSchema.index({ name: 1 });
premiseSchema.index({ buildingId: 1, unitNo: 1 }, { unique: true });
meterSchema.index({ buildingId: 1, type: 1 });
meterReadingSchema.index({ meterId: 1, period: 1 }, { unique: true });
meterReadingSchema.index({ buildingId: 1, period: 1 });
invoiceSchema.index({ premiseId: 1, period: 1 }, { unique: true });
invoiceSchema.index({ status: 1, dueDate: 1 });
paymentSchema.index({ invoiceId: 1 });
receiptSchema.index({ receiptNumber: 1 });
userSchema.index({ email: 1 });
settingsSchema.index({ buildingId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ timestamp: -1 });

// Models
const Building = mongoose.model('Building', buildingSchema);
const Premise = mongoose.model('Premise', premiseSchema);
const Meter = mongoose.model('Meter', meterSchema);
const MeterReading = mongoose.model('MeterReading', meterReadingSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);
const Payment = mongoose.model('Payment', paymentSchema);
const Receipt = mongoose.model('Receipt', receiptSchema);
const User = mongoose.model('User', userSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = {
  connectDB,
  disconnectDB,
  models: {
    Building,
    Premise,
    Meter,
    MeterReading,
    Invoice,
    Payment,
    Receipt,
    User,
    Settings,
    AuditLog
  },
  schemas: {
    buildingSchema,
    premiseSchema,
    meterSchema,
    meterReadingSchema,
    invoiceSchema,
    paymentSchema,
    receiptSchema,
    userSchema,
    settingsSchema,
    auditLogSchema
  }
};
