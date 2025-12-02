require('dotenv').config({ path: '../../.env' });
const { Worker, Queue } = require('bullmq');
const cron = require('node-cron');
const { connectDB } = require('@waterbills/db');
const { models } = require('@waterbills/db');
const { utils } = require('@waterbills/shared');

// Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
};

// Create queues
const invoiceQueue = new Queue('invoice-generation', { connection });
const penaltyQueue = new Queue('penalty-calculation', { connection });
const disconnectQueue = new Queue('disconnect-evaluation', { connection });

// Invoice generation worker
const invoiceWorker = new Worker('invoice-generation', async (job) => {
  const { buildingId, period } = job.data;
  
  console.log(`Processing invoice generation for building ${buildingId}, period ${period}`);
  
  try {
    const { models } = require('@waterbills/db');
    const billingService = require('./services/billingService');
    
    const results = await billingService.generateBuildingInvoices(buildingId, period);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`Invoice generation completed: ${successful} successful, ${failed} failed`);
    
    return {
      buildingId,
      period,
      successful,
      failed,
      results
    };
  } catch (error) {
    console.error('Invoice generation failed:', error);
    throw error;
  }
}, { connection });

// Penalty calculation worker
const penaltyWorker = new Worker('penalty-calculation', async (job) => {
  const { invoiceId } = job.data;
  
  console.log(`Calculating penalty for invoice ${invoiceId}`);
  
  try {
    const billingService = require('./services/billingService');
    const result = await billingService.calculatePenalty(invoiceId);
    
    console.log(`Penalty calculated for invoice ${invoiceId}: ${result.penalty}`);
    
    return result;
  } catch (error) {
    console.error('Penalty calculation failed:', error);
    throw error;
  }
}, { connection });

// Disconnect evaluation worker
const disconnectWorker = new Worker('disconnect-evaluation', async (job) => {
  const { buildingId } = job.data;
  
  console.log(`Evaluating disconnections for building ${buildingId}`);
  
  try {
    const building = await models.Building.findById(buildingId);
    if (!building) {
      throw new Error('Building not found');
    }

    const premises = await models.Premise.find({ buildingId });
    const today = new Date();
    const currentDay = today.getDate();

    const disconnectionTasks = [];

    for (const premise of premises) {
      // Get latest invoice for the premise
      const latestInvoice = await models.Invoice.findOne({
        premiseId: premise._id,
        status: { $in: ['unpaid', 'partial', 'overdue'] }
      }).sort({ createdAt: -1 });

      if (latestInvoice && currentDay > premise.disconnect_after_day_of_month) {
        const unpaidAmount = latestInvoice.total_amount - latestInvoice.amount_paid;
        
        if (unpaidAmount > 0) {
          // Mark for disconnection
          latestInvoice.water_connection_status = 'DISCONNECT';
          await latestInvoice.save();

          disconnectionTasks.push({
            premiseId: premise._id,
            unitNo: premise.unitNo,
            invoiceId: latestInvoice._id,
            unpaidAmount,
            disconnectDate: today
          });

          console.log(`Marked premise ${premise.unitNo} for disconnection`);
        }
      }
    }

    console.log(`Disconnection evaluation completed: ${disconnectionTasks.length} premises marked for disconnection`);
    
    return {
      buildingId,
      disconnectionTasks
    };
  } catch (error) {
    console.error('Disconnect evaluation failed:', error);
    throw error;
  }
}, { connection });

// Scheduled jobs
const scheduleJobs = () => {
  // Invoice generation - 25th of every month at 00:05
  cron.schedule('5 0 25 * *', async () => {
    console.log('Starting scheduled invoice generation...');
    
    try {
      const buildings = await models.Building.find();
      const nextPeriod = utils.getNextPeriod();
      
      for (const building of buildings) {
        await invoiceQueue.add('generate-invoices', {
          buildingId: building._id,
          period: nextPeriod
        }, {
          jobId: `invoice-${building._id}-${nextPeriod}`,
          removeOnComplete: 10,
          removeOnFail: 5
        });
      }
      
      console.log(`Scheduled invoice generation for ${buildings.length} buildings`);
    } catch (error) {
      console.error('Failed to schedule invoice generation:', error);
    }
  });

  // Penalty calculation - Daily at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Starting scheduled penalty calculation...');
    
    try {
      const overdueInvoices = await models.Invoice.find({
        status: { $in: ['unpaid', 'partial', 'overdue'] },
        dueDate: { $lt: new Date() }
      });

      for (const invoice of overdueInvoices) {
        await penaltyQueue.add('calculate-penalty', {
          invoiceId: invoice._id
        }, {
          jobId: `penalty-${invoice._id}-${Date.now()}`,
          removeOnComplete: 10,
          removeOnFail: 5
        });
      }
      
      console.log(`Scheduled penalty calculation for ${overdueInvoices.length} invoices`);
    } catch (error) {
      console.error('Failed to schedule penalty calculation:', error);
    }
  });

  // Disconnect evaluation - Daily at 6 AM
  cron.schedule('0 6 * * *', async () => {
    console.log('Starting scheduled disconnect evaluation...');
    
    try {
      const buildings = await models.Building.find();
      
      for (const building of buildings) {
        await disconnectQueue.add('evaluate-disconnections', {
          buildingId: building._id
        }, {
          jobId: `disconnect-${building._id}-${Date.now()}`,
          removeOnComplete: 10,
          removeOnFail: 5
        });
      }
      
      console.log(`Scheduled disconnect evaluation for ${buildings.length} buildings`);
    } catch (error) {
      console.error('Failed to schedule disconnect evaluation:', error);
    }
  });
};

// Worker event handlers
invoiceWorker.on('completed', (job) => {
  console.log(`Invoice generation job ${job.id} completed`);
});

invoiceWorker.on('failed', (job, err) => {
  console.error(`Invoice generation job ${job.id} failed:`, err);
});

penaltyWorker.on('completed', (job) => {
  console.log(`Penalty calculation job ${job.id} completed`);
});

penaltyWorker.on('failed', (job, err) => {
  console.error(`Penalty calculation job ${job.id} failed:`, err);
});

disconnectWorker.on('completed', (job) => {
  console.log(`Disconnect evaluation job ${job.id} completed`);
});

disconnectWorker.on('failed', (job, err) => {
  console.error(`Disconnect evaluation job ${job.id} failed:`, err);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down workers...');
  
  await invoiceWorker.close();
  await penaltyWorker.close();
  await disconnectWorker.close();
  
  await invoiceQueue.close();
  await penaltyQueue.close();
  await disconnectQueue.close();
  
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the worker
const startWorker = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    console.log('Worker connected to database');
    
    scheduleJobs();
    console.log('Scheduled jobs initialized');
    
    console.log('🚀 Worker started successfully');
    console.log('📅 Invoice generation: 25th of every month at 00:05');
    console.log('💰 Penalty calculation: Daily at midnight');
    console.log('🔌 Disconnect evaluation: Daily at 6 AM');
  } catch (error) {
    console.error('Failed to start worker:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startWorker();
}

module.exports = {
  invoiceQueue,
  penaltyQueue,
  disconnectQueue,
  invoiceWorker,
  penaltyWorker,
  disconnectWorker
};
