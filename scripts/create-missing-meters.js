require('dotenv').config();
const { connectDB, models } = require('@waterbills/db');

const createMissingMeters = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/waterbills';
    console.log('Connecting to MongoDB:', mongoUri);
    await connectDB(mongoUri);
    console.log('Connected to database');

    // Get all buildings
    const buildings = await models.Building.find();
    console.log(`Found ${buildings.length} buildings`);

    for (const building of buildings) {
      console.log(`\nProcessing building: ${building.name}`);

      // Check if building has council meter
      if (!building.council_meter_id) {
        console.log('  Creating council meter...');
        const councilMeter = new models.Meter({
          buildingId: building._id,
          type: 'council',
          label: `${building.name} - Council Water`,
          unit: 'm3'
        });
        await councilMeter.save();
        building.council_meter_id = councilMeter._id;
        console.log(`  Created council meter: ${councilMeter._id}`);
      } else {
        console.log('  Council meter already exists');
      }

      // Check if building has borehole meter
      if (!building.borehole_meter_id) {
        console.log('  Creating borehole meter...');
        const boreholeMeter = new models.Meter({
          buildingId: building._id,
          type: 'borehole',
          label: `${building.name} - Borehole Water`,
          unit: 'm3'
        });
        await boreholeMeter.save();
        building.borehole_meter_id = boreholeMeter._id;
        console.log(`  Created borehole meter: ${boreholeMeter._id}`);
      } else {
        console.log('  Borehole meter already exists');
      }

      // Save building with updated meter IDs
      await building.save();

      // Get all premises for this building
      const premises = await models.Premise.find({ buildingId: building._id });
      console.log(`  Found ${premises.length} premises`);

      for (const premise of premises) {
        // Check if premise has a submeter
        const existingSubmeter = await models.Meter.findOne({
          buildingId: building._id,
          premiseId: premise._id,
          type: 'submeter'
        });

        if (!existingSubmeter) {
          console.log(`    Creating submeter for premise: ${premise.unitNo}`);
          const submeter = new models.Meter({
            buildingId: building._id,
            premiseId: premise._id,
            type: 'submeter',
            label: `${premise.unitNo} - Submeter`,
            unit: 'm3'
          });
          await submeter.save();
          console.log(`    Created submeter: ${submeter._id}`);
        } else {
          console.log(`    Submeter already exists for premise: ${premise.unitNo}`);
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    
    // Summary
    const totalBuildings = await models.Building.countDocuments();
    const totalMeters = await models.Meter.countDocuments();
    const councilMeters = await models.Meter.countDocuments({ type: 'council' });
    const boreholeMeters = await models.Meter.countDocuments({ type: 'borehole' });
    const submeters = await models.Meter.countDocuments({ type: 'submeter' });

    console.log('\n📊 Summary:');
    console.log(`  Buildings: ${totalBuildings}`);
    console.log(`  Total Meters: ${totalMeters}`);
    console.log(`  Council Meters: ${councilMeters}`);
    console.log(`  Borehole Meters: ${boreholeMeters}`);
    console.log(`  Submeters: ${submeters}`);

  } catch (error) {
    console.error('Error creating missing meters:', error);
  } finally {
    if (models.mongoose && models.mongoose.connection) {
      await models.mongoose.connection.close();
    }
  }
};

createMissingMeters();
