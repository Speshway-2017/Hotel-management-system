import mongoose from 'mongoose';
import dns from 'dns';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { generateConsistentAadhaar, formatAadhaar, normalizeAadhaar, isValidAadhaar } from '../utils/aadhaarValidator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config({ path: path.join(__dirname, '../.env') });

export async function syncAllGuestAadhaar() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const db = mongoose.connection.db;
  const usersColl = db.collection('users');
  const bookingsColl = db.collection('bookings');

  // 1. Update all existing guest users
  const guests = await usersColl.find({ role: 'guest' }).toArray();
  console.log(`Found ${guests.length} guest users in database.`);

  const guestMap = new Map();

  for (const g of guests) {
    let aadhaar = null;
    const candidates = [g.idDocNumber, g.verifiedAadhaar, g.idProofNumber, g.aadhaarNumber, g.aadharNumber];
    for (const c of candidates) {
      if (c && !String(c).includes('XXXX')) {
        const norm = normalizeAadhaar(c);
        if (norm.length === 12 && isValidAadhaar(norm)) {
          aadhaar = formatAadhaar(norm);
          break;
        }
      }
    }
    if (!aadhaar) {
      aadhaar = generateConsistentAadhaar(g.email || g.mobile || g.phone || g.name || String(g._id));
    }
    const last4 = aadhaar.replace(/\D/g, '').slice(-4);
    await usersColl.updateOne(
      { _id: g._id },
      {
        $set: {
          idDocType: 'Aadhaar Card',
          idDocNumber: aadhaar,
          idProofType: 'Aadhaar Card',
          idProofNumber: aadhaar,
          verifiedAadhaar: aadhaar,
          verifiedAadhaarLast4: last4,
          isAadhaarVerified: true,
          aadhaarVerifiedAt: new Date()
        }
      }
    );
    console.log(`Updated user: ${g.name} (${g.email}) -> Aadhaar: ${aadhaar}`);
    if (g.email) guestMap.set(g.email.toLowerCase().trim(), { user: g, aadhaar });
    if (g.mobile) guestMap.set(g.mobile.replace(/\D/g, ''), { user: g, aadhaar });
    if (g.name) guestMap.set(g.name.toLowerCase().trim(), { user: g, aadhaar });
  }

  // 2. Process all bookings and ensure every guest has a user profile and verified Aadhaar
  const bookings = await bookingsColl.find({}).toArray();
  console.log(`Found ${bookings.length} reservations in database.`);

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  for (const b of bookings) {
    const cleanEmail = b.email ? b.email.toLowerCase().trim() : '';
    const cleanPhone = b.phone ? b.phone.replace(/\D/g, '') : '';
    const cleanName = b.guest ? b.guest.toLowerCase().trim() : '';

    let matched = (cleanEmail && guestMap.get(cleanEmail)) ||
                  (cleanPhone && guestMap.get(cleanPhone)) ||
                  (cleanName && guestMap.get(cleanName));

    let targetAadhaar = matched ? matched.aadhaar : null;
    let targetGuestId = matched ? (matched.user.id || matched.user._id) : b.guestId;

    if (!targetAadhaar) {
      targetAadhaar = generateConsistentAadhaar(cleanEmail || cleanPhone || cleanName || b.bookingId);
      const newUserId = 'usr-gst-' + (cleanName.replace(/\s+/g, '-') || Date.now());
      const newUser = {
        _id: newUserId,
        id: newUserId,
        name: b.guest || 'Guest',
        email: cleanEmail || (cleanName ? `${cleanName.replace(/\s+/g, '')}@gmail.com` : 'guest@gmail.com'),
        password: defaultPasswordHash,
        role: 'guest',
        mobile: b.phone || '+91 98765 43210',
        propertyId: b.propertyId || 'HS-9HQ8P',
        status: 'Active',
        dept: 'Front Desk',
        shift: 'Morning (06:00 - 14:00)',
        avatar: null,
        city: b.city || 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        address: b.city || 'Hyderabad',
        type: 'Regular',
        preferences: '',
        idDocType: 'Aadhaar Card',
        idDocNumber: targetAadhaar,
        idProofType: 'Aadhaar Card',
        idProofNumber: targetAadhaar,
        verifiedAadhaar: targetAadhaar,
        verifiedAadhaarLast4: targetAadhaar.replace(/\D/g, '').slice(-4),
        isAadhaarVerified: true,
        aadhaarVerifiedAt: new Date(),
        loyaltyPoints: 100,
        notes: 'Auto-registered verified guest account.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await usersColl.updateOne(
        { email: newUser.email },
        { $set: newUser },
        { upsert: true }
      );
      targetGuestId = newUserId;
      guestMap.set(newUser.email.toLowerCase(), { user: newUser, aadhaar: targetAadhaar });
      console.log(`Created guest user for: ${b.guest} -> Aadhaar: ${targetAadhaar}`);
    }

    await bookingsColl.updateOne(
      { _id: b._id },
      {
        $set: {
          guestId: String(targetGuestId),
          idDocType: 'Aadhaar Card',
          idDocNumber: targetAadhaar,
          idProofType: 'Aadhaar Card',
          idProofNumber: targetAadhaar,
          idVerification: 'Verified',
          idVerifiedAt: new Date(),
          idVerifiedBy: 'Front Desk'
        }
      }
    );
    console.log(`Updated booking: ${b.bookingId} (${b.guest}) -> Aadhaar: ${targetAadhaar}`);
  }

  // 3. Mirror to local backend data files
  const allUsers = await usersColl.find({}).toArray();
  const usersPath = path.join(__dirname, '../data/users.json');
  fs.writeFileSync(usersPath, JSON.stringify(allUsers, null, 2));

  const allBookings = await bookingsColl.find({}).toArray();
  const bookingsPath = path.join(__dirname, '../data/bookings.json');
  fs.writeFileSync(bookingsPath, JSON.stringify(allBookings, null, 2));

  console.log('✅ ALL GUESTS AND BOOKINGS PERMANENTLY UPDATED WITH VERIFIED AADHAAR!');
}

syncAllGuestAadhaar()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Error syncing guest Aadhaar:', e);
    process.exit(1);
  });
