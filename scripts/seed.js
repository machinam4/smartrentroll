require('dotenv').config();
const { connectDB, models } = require('@waterbills/db');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/waterbills';
    console.log('Connecting to MongoDB:', mongoUri);
    await connectDB(mongoUri);
    console.log('Connected to database');

    // Clear existing data
    await models.User.deleteMany({});
    await models.Building.deleteMany({});
    await models.Premise.deleteMany({});
    await models.Meter.deleteMany({});
    await models.Settings.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const admin = new models.User({
      email: 'admin@waterbills.com',
      password: hashedPassword,
      role: 'admin',
      name: 'System Administrator'
    });
    await admin.save();
    console.log('Created admin user');

    // Create building
    const building = new models.Building({
      name: 'Saravic Investments - Block A',
      address: '123 Main Rd, Nairobi',
      timezone: 'Africa/Nairobi',
      pumping_cost_per_month: 5000
    });
    await building.save();
    console.log('Created building');

    // Create building settings
    const settings = new models.Settings({
      buildingId: building._id,
      council_price_per_m3: 60,
      borehole_price_per_m3: 30,
      pumping_cost_per_month: 5000,
      penalty_daily: 150,
      prorate_precision: 2
    });
    await settings.save();
    console.log('Created building settings');

    // Create manager user
    const managerPassword = await bcrypt.hash('manager123', 12);
    const manager = new models.User({
      email: 'manager@waterbills.com',
      password: managerPassword,
      role: 'manager',
      buildingId: building._id,
      name: 'Building Manager'
    });
    await manager.save();
    console.log('Created manager user');

    // Create premises
    const premises = [
      {
        buildingId: building._id,
        unitNo: 'Shop 1',
        type: 'shop',
        monthly_rent: 50000,
        disconnect_after_day_of_month: 20,
        previous_balance: 0,
        tags: ['ground', 'shop']
      },
      {
        buildingId: building._id,
        unitNo: 'Shop 2',
        type: 'shop',
        monthly_rent: 45000,
        disconnect_after_day_of_month: 20,
        previous_balance: 0,
        tags: ['ground', 'shop']
      },
      {
        buildingId: building._id,
        unitNo: 'Apartment 1A',
        type: 'apartment',
        monthly_rent: 35000,
        disconnect_after_day_of_month: 20,
        previous_balance: 0,
        tags: ['first-floor', 'apartment']
      },
      {
        buildingId: building._id,
        unitNo: 'Apartment 1B',
        type: 'apartment',
        monthly_rent: 35000,
        disconnect_after_day_of_month: 20,
        previous_balance: 0,
        tags: ['first-floor', 'apartment']
      }
    ];

    const createdPremises = [];
    for (const premiseData of premises) {
      const premise = new models.Premise(premiseData);
      await premise.save();
      createdPremises.push(premise);
    }
    console.log(`Created ${createdPremises.length} premises`);

    // Create tenant users
    for (let i = 0; i < createdPremises.length; i++) {
      const premise = createdPremises[i];
      const tenantPassword = await bcrypt.hash('tenant123', 12);
      const tenant = new models.User({
        email: `tenant${i + 1}@waterbills.com`,
        password: tenantPassword,
        role: 'tenant',
        buildingId: building._id,
        premiseId: premise._id,
        name: `Tenant ${i + 1}`
      });
      await tenant.save();
    }
    console.log('Created tenant users');

    // Create meters
    const councilMeter = new models.Meter({
      buildingId: building._id,
      type: 'council',
      label: 'Council Water Meter',
      unit: 'm3'
    });
    await councilMeter.save();

    const boreholeMeter = new models.Meter({
      buildingId: building._id,
      type: 'borehole',
      label: 'Borehole Water Meter',
      unit: 'm3'
    });
    await boreholeMeter.save();

    // Update building with meter IDs
    building.council_meter_id = councilMeter._id;
    building.borehole_meter_id = boreholeMeter._id;
    await building.save();

    // Create submeters for each premise
    for (const premise of createdPremises) {
      const submeter = new models.Meter({
        buildingId: building._id,
        type: 'submeter',
        premiseId: premise._id,
        label: `${premise.unitNo} Submeter`,
        unit: 'm3'
      });
      await submeter.save();
    }
    console.log('Created meters');

    // Create sample meter readings for current month
    const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    // Council meter reading
    const councilReading = new models.MeterReading({
      meterId: councilMeter._id,
      buildingId: building._id,
      period: currentPeriod,
      reading: 150.5,
      readingDate: new Date(),
      createdBy: admin._id
    });
    await councilReading.save();

    // Borehole meter reading
    const boreholeReading = new models.MeterReading({
      meterId: boreholeMeter._id,
      buildingId: building._id,
      period: currentPeriod,
      reading: 89.2,
      readingDate: new Date(),
      createdBy: admin._id
    });
    await boreholeReading.save();

    // Submeter readings
    const submeters = await models.Meter.find({ type: 'submeter' });
    for (const submeter of submeters) {
      const reading = new models.MeterReading({
        meterId: submeter._id,
        buildingId: building._id,
        premiseId: submeter.premiseId,
        period: currentPeriod,
        reading: Math.random() * 20 + 10, // Random reading between 10-30
        readingDate: new Date(),
        createdBy: admin._id
      });
      await reading.save();
    }
    console.log('Created sample meter readings');

    console.log('\n✅ Seed data created successfully!');
    console.log('\nTest accounts:');
    console.log('Admin: admin@waterbills.com / admin123');
    console.log('Manager: manager@waterbills.com / manager123');
    console.log('Tenants: tenant1@waterbills.com / tenant123');
    console.log('         tenant2@waterbills.com / tenant123');
    console.log('         tenant3@waterbills.com / tenant123');
    console.log('         tenant4@waterbills.com / tenant123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
