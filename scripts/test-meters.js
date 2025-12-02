require('dotenv').config();
const { connectDB, models } = require('@waterbills/db');

const testMeters = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/waterbills';
    console.log('Connecting to MongoDB:', mongoUri);
    await connectDB(mongoUri);
    console.log('Connected to database');

    // Get all meters
    const meters = await models.Meter.find()
      .populate('buildingId', 'name')
      .populate('premiseId', 'unitNo')
      .sort({ type: 1, label: 1 });

    console.log(`\nFound ${meters.length} meters:`);
    
    meters.forEach((meter, index) => {
      console.log(`\n${index + 1}. ${meter.label}`);
      console.log(`   Type: ${meter.type}`);
      console.log(`   Building: ${meter.buildingId?.name || 'Unknown'}`);
      console.log(`   Premise: ${meter.premiseId?.unitNo || 'N/A'}`);
      console.log(`   Unit: ${meter.unit}`);
      console.log(`   ID: ${meter._id}`);
    });

    // Group by building
    const metersByBuilding = {};
    meters.forEach(meter => {
      const buildingName = meter.buildingId?.name || 'Unknown';
      if (!metersByBuilding[buildingName]) {
        metersByBuilding[buildingName] = [];
      }
      metersByBuilding[buildingName].push(meter);
    });

    console.log('\n📊 Meters by Building:');
    Object.entries(metersByBuilding).forEach(([buildingName, buildingMeters]) => {
      console.log(`\n${buildingName}: ${buildingMeters.length} meters`);
      buildingMeters.forEach(meter => {
        console.log(`  - ${meter.type}: ${meter.label}`);
      });
    });

  } catch (error) {
    console.error('Error testing meters:', error);
  } finally {
    if (models.mongoose && models.mongoose.connection) {
      await models.mongoose.connection.close();
    }
  }
};

testMeters();
