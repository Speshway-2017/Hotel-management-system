import dotenv from 'dotenv';
import Property from '../models/property.model.js';
import User from '../models/user.model.js';

dotenv.config();

async function run() {
  try {
    console.log('Running test in Mock Database Mode...');

    const adminName = "Test Admin";
    const adminEmail = "testadmin_" + Math.random().toString(36).substring(2, 7) + "@hourstay.com";
    const adminPassword = "password123";
    const adminMobile = "9999999999";
    const name = "Hour Stay Test Inn";
    const city = "Hyderabad";
    const rooms = 45;
    const status = "Onboarding";
    const subscriptionTier = "None";

    let finalAssignedAdmin = null;
    let finalGm = '—';

    // 1. Create Admin
    console.log('Creating Admin user...');
    try {
      const newAdmin = await User.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        mobile: adminMobile || '',
        status: 'Active'
      });
      finalAssignedAdmin = newAdmin.id || newAdmin._id;
      finalGm = adminName;
      console.log('Admin user created successfully:', finalAssignedAdmin);
    } catch (err) {
      console.error('FAILED TO CREATE ADMIN USER:', err);
      throw err;
    }

    // 2. Create Property
    console.log('Creating Property document...');
    const propertyId = "HS-" + Math.random().toString(36).substring(2, 7).toUpperCase();
    try {
      const property = await Property.create({
        _id: propertyId,
        id: propertyId,
        name,
        city,
        rooms: Number(rooms) || 0,
        occupancy: 0,
        adr: 0,
        revpar: 0,
        status: status || 'Onboarding',
        gm: finalGm,
        assignedAdmin: finalAssignedAdmin,
        subscriptionTier: subscriptionTier || 'None',
        subscriptionStatus: subscriptionTier && subscriptionTier !== 'None' ? 'Active' : 'None',
        subscriptionExpiry: subscriptionTier && subscriptionTier !== 'None' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
      });
      console.log('Property document created successfully:', property._id);

      // 3. Update Admin with Property ID
      if (finalAssignedAdmin) {
        console.log('Updating Admin user with Property ID...');
        await User.findByIdAndUpdate(finalAssignedAdmin, { propertyId: property.id || property._id });
        console.log('Admin user updated successfully');
      }
    } catch (err) {
      console.error('FAILED TO CREATE PROPERTY:', err);
      throw err;
    }

    console.log('Mock database test completed successfully!');
  } catch (err) {
    console.error('CRITICAL TRANSACTION ERROR:', err);
  }
}

run();
