require('dotenv').config();
const { connectDB, models } = require('@waterbills/db');
const billingService = require('../apps/api/services/billingService');

const generateHistoricalInvoices = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/waterbills';
    console.log('Connecting to MongoDB:', mongoUri);
    await connectDB(mongoUri);
    console.log('Connected to database');

    // Get all buildings
    const buildings = await models.Building.find();
    console.log(`Found ${buildings.length} buildings`);

    // Generate invoices for the last 4 months
    const currentDate = new Date();
    const months = [];
    
    for (let i = 4; i >= 1; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push(period);
    }

    console.log('Generating invoices for periods:', months);

    let totalInvoicesCreated = 0;
    let totalInvoicesSkipped = 0;
    let totalErrors = 0;

    for (const building of buildings) {
      console.log(`\n🏢 Processing building: ${building.name}`);
      
      for (const period of months) {
        console.log(`  📅 Generating invoices for period: ${period}`);
        
        try {
          // Check if invoices already exist for this building and period
          const existingInvoices = await models.Invoice.find({
            buildingId: building._id,
            period: period
          });

          if (existingInvoices.length > 0) {
            console.log(`    ⚠️  Invoices already exist for ${period} (${existingInvoices.length} invoices)`);
            totalInvoicesSkipped += existingInvoices.length;
            continue;
          }

          // Generate invoices for this building and period
          const results = await billingService.generateBuildingInvoices(building._id, period);
          
          const successful = results.filter(r => r.success);
          const failed = results.filter(r => !r.success);

          totalInvoicesCreated += successful.length;
          totalErrors += failed.length;

          console.log(`    ✅ Created ${successful.length} invoices successfully`);
          
          if (failed.length > 0) {
            console.log(`    ❌ Failed to create ${failed.length} invoices:`);
            failed.forEach(failure => {
              console.log(`      - ${failure.premiseId}: ${failure.error}`);
            });
          }

          // Show sample of created invoices
          if (successful.length > 0) {
            console.log(`    📋 Sample invoices created:`);
            const sampleInvoices = await models.Invoice.find({
              buildingId: building._id,
              period: period
            })
              .populate('premiseId', 'unitNo')
              .limit(3);

            sampleInvoices.forEach(invoice => {
              console.log(`      - ${invoice.premiseId.unitNo}: KES ${invoice.total_amount.toFixed(2)} (Rent: ${invoice.rent_amount}, Water: ${invoice.water_amount.toFixed(2)})`);
            });
          }

        } catch (error) {
          console.error(`    ❌ Error generating invoices for ${period}:`, error.message);
          totalErrors++;
        }
      }
    }

    console.log('\n✅ Historical invoices generation completed!');
    console.log(`📊 Summary:`);
    console.log(`  Total buildings processed: ${buildings.length}`);
    console.log(`  Total periods: ${months.length}`);
    console.log(`  Total invoices created: ${totalInvoicesCreated}`);
    console.log(`  Total invoices skipped: ${totalInvoicesSkipped}`);
    console.log(`  Total errors: ${totalErrors}`);
    console.log(`  Periods covered: ${months.join(', ')}`);

    // Show summary by period
    console.log('\n📈 Invoices by period:');
    for (const period of months) {
      const invoiceCount = await models.Invoice.countDocuments({ period });
      const totalAmount = await models.Invoice.aggregate([
        { $match: { period } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);
      
      console.log(`  ${period}: ${invoiceCount} invoices, Total: KES ${totalAmount[0]?.total?.toFixed(2) || '0.00'}`);
    }

    // Show summary by building
    console.log('\n🏢 Invoices by building:');
    for (const building of buildings) {
      const invoiceCount = await models.Invoice.countDocuments({ buildingId: building._id });
      const totalAmount = await models.Invoice.aggregate([
        { $match: { buildingId: building._id } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } }
      ]);
      
      console.log(`  ${building.name}: ${invoiceCount} invoices, Total: KES ${totalAmount[0]?.total?.toFixed(2) || '0.00'}`);
    }

  } catch (error) {
    console.error('Error generating historical invoices:', error);
  } finally {
    if (models.mongoose && models.mongoose.connection) {
      await models.mongoose.connection.close();
    }
  }
};

// Add command line options
const args = process.argv.slice(2);
const options = {
  dryRun: args.includes('--dry-run'),
  months: 4
};

// Parse months argument
const monthsIndex = args.indexOf('--months');
if (monthsIndex !== -1 && args[monthsIndex + 1]) {
  options.months = parseInt(args[monthsIndex + 1]);
}

console.log('🚀 Starting historical invoices generation...');
console.log(`📅 Generating invoices for last ${options.months} months`);
if (options.dryRun) {
  console.log('🔍 DRY RUN MODE - No data will be written');
}

generateHistoricalInvoices();
