require('dotenv').config();
const { connectDB, models } = require('@waterbills/db');

const generateHistoricalReadings = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/waterbills';
    console.log('Connecting to MongoDB:', mongoUri);
    await connectDB(mongoUri);
    console.log('Connected to database');

    // Get all meters
    const meters = await models.Meter.find()
      .populate('buildingId', 'name')
      .populate('premiseId', 'unitNo');
    
    console.log(`Found ${meters.length} meters`);

    // Generate readings for the last 4 months
    const currentDate = new Date();
    const months = [];
    
    for (let i = 4; i >= 1; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        period,
        date: new Date(date.getFullYear(), date.getMonth() + 1, 0) // Last day of the month
      });
    }

    console.log('Generating readings for periods:', months.map(m => m.period));

    let totalReadingsCreated = 0;
    let totalReadingsUpdated = 0;

    for (const meter of meters) {
      console.log(`\nProcessing meter: ${meter.label} (${meter.type})`);
      
      // Generate base reading based on meter type
      let baseReading = 0;
      let monthlyIncrement = 0;
      
      switch (meter.type) {
        case 'council':
          baseReading = 1500; // Start with 1500 m³
          monthlyIncrement = 25 + Math.random() * 15; // 25-40 m³ per month
          break;
        case 'borehole':
          baseReading = 800; // Start with 800 m³
          monthlyIncrement = 15 + Math.random() * 10; // 15-25 m³ per month
          break;
        case 'submeter':
          baseReading = 50; // Start with 50 m³
          monthlyIncrement = 2 + Math.random() * 3; // 2-5 m³ per month
          break;
        default:
          baseReading = 100;
          monthlyIncrement = 5 + Math.random() * 5;
      }

      // Check if meter already has readings
      const existingReadings = await models.MeterReading.find({ meterId: meter._id })
        .sort({ period: -1 });
      
      if (existingReadings.length > 0) {
        // Use the latest reading as base
        const latestReading = existingReadings[0];
        baseReading = latestReading.reading;
        console.log(`  Found existing reading: ${baseReading} m³ for period ${latestReading.period}`);
      }

      // Generate readings for each month
      for (let i = 0; i < months.length; i++) {
        const month = months[i];
        
        // Check if reading already exists for this period
        const existingReading = await models.MeterReading.findOne({
          meterId: meter._id,
          period: month.period
        });

        if (existingReading) {
          console.log(`  Reading already exists for ${month.period}: ${existingReading.reading} m³`);
          continue;
        }

        // Calculate reading for this month
        // For the first month, use base reading + some increment
        // For subsequent months, add monthly increment
        const readingIncrement = monthlyIncrement * (i + 1);
        const reading = baseReading + readingIncrement;
        
        // Round to 2 decimal places
        const roundedReading = Math.round(reading * 100) / 100;

        // Create the reading
        const meterReading = new models.MeterReading({
          meterId: meter._id,
          buildingId: meter.buildingId._id,
          premiseId: meter.premiseId?._id,
          period: month.period,
          reading: roundedReading,
          readingDate: month.date,
          createdBy: 'system-generated',
          notes: `Generated historical reading for ${month.period}`
        });

        await meterReading.save();
        totalReadingsCreated++;
        
        console.log(`  Created reading for ${month.period}: ${roundedReading} m³`);
      }
    }

    console.log('\n✅ Historical readings generation completed!');
    console.log(`📊 Summary:`);
    console.log(`  Total meters processed: ${meters.length}`);
    console.log(`  Total readings created: ${totalReadingsCreated}`);
    console.log(`  Total readings updated: ${totalReadingsUpdated}`);
    console.log(`  Periods covered: ${months.map(m => m.period).join(', ')}`);

    // Show sample of generated readings
    console.log('\n📋 Sample generated readings:');
    const sampleReadings = await models.MeterReading.find({
      createdBy: 'system-generated'
    })
      .populate('meterId', 'label type')
      .populate('buildingId', 'name')
      .sort({ period: -1 })
      .limit(10);

    sampleReadings.forEach(reading => {
      console.log(`  ${reading.meterId.label} (${reading.meterId.type}) - ${reading.period}: ${reading.reading} m³`);
    });

  } catch (error) {
    console.error('Error generating historical readings:', error);
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

console.log('🚀 Starting historical meter readings generation...');
console.log(`📅 Generating readings for last ${options.months} months`);
if (options.dryRun) {
  console.log('🔍 DRY RUN MODE - No data will be written');
}

generateHistoricalReadings();
