import User from '../models/user.model.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import AuditLog from '../models/auditLog.model.js';
import Announcement from '../models/announcement.model.js';
import Cms from '../models/cms.model.js';

const SEED_USERS = [
  { name: 'Super Admin', email: 'superadmin@hourstay.com', password: 'password123', role: 'super-admin', mobile: '9999999999' },
  { name: 'Hotel Admin', email: 'admin@hourstay.com', password: 'password123', role: 'admin', mobile: '9888888888' },
  { name: 'Hotel Manager', email: 'manager@hourstay.com', password: 'password123', role: 'manager', mobile: '9777777777' },
  { name: 'Front Desk Receptionist', email: 'receptionist@hourstay.com', password: 'password123', role: 'receptionist', mobile: '9666666666' },
  { name: 'Regular Guest', email: 'guest@hourstay.com', password: 'password123', role: 'guest', mobile: '9555555555' },
  { name: 'Vikram Rathore', email: 'vikram.rathore@hourstay.com', password: 'password123', role: 'admin', mobile: '+91 98290 11223', propertyId: 'HS-JAI', status: 'Active' },
  { name: 'Meera Nair', email: 'meera.nair@hourstay.com', password: 'password123', role: 'admin', mobile: '+91 97444 88321', propertyId: 'HS-UDA', status: 'Active' },
  { name: 'Joaquim Fernandes', email: 'joaquim@hourstay.com', password: 'password123', role: 'admin', mobile: '+91 98221 44556', propertyId: 'HS-GOA', status: 'Active' },
  { name: 'Anand Pillai', email: 'anand.pillai@hourstay.com', password: 'password123', role: 'admin', mobile: '+91 94470 55667', propertyId: 'HS-KER', status: 'Active' },
  { name: 'Sanjana Kapoor', email: 'sanjana@hourstay.com', password: 'password123', role: 'admin', mobile: '+91 98110 22334', propertyId: 'HS-DEL', status: 'Suspended' },
  { name: 'Rehan Shaikh', email: 'rehan@hourstay.com', password: 'password123', role: 'admin', mobile: '+91 99300 77889', propertyId: 'HS-MUM', status: 'Active' }
];

const SEED_PROPERTIES = [
  { name: 'Rambagh Residency', city: 'Jaipur', rooms: 50, occupancy: 76, adr: 8500, revpar: 6460, status: 'Active', gm: 'Vikramaditya Singh', subscriptionTier: 'Enterprise', subscriptionStatus: 'Active' },
  { name: 'Lake Palace View', city: 'Udaipur', rooms: 30, occupancy: 70, adr: 9500, revpar: 6650, status: 'Active', gm: 'Suryaveer Rathore', subscriptionTier: 'Premium', subscriptionStatus: 'Active' },
  { name: 'Candolim Beach Resort', city: 'Goa', rooms: 80, occupancy: 60, adr: 7500, revpar: 4500, status: 'Active', gm: 'Manuel D\'Souza', subscriptionTier: 'Premium', subscriptionStatus: 'Active' },
  { name: 'Backwater Retreat', city: 'Alleppey', rooms: 15, occupancy: 30, adr: 12000, revpar: 3600, status: 'Onboarding', gm: 'Unassigned', subscriptionTier: 'None', subscriptionStatus: 'None' }
];

const SEED_BOOKINGS = [
  { guest: 'Karan Malhotra', phone: '+91 98765 43210', room: 'Suite Room 302', checkIn: '2026-08-13', checkOut: '2026-08-15', nights: 2, pax: '2 Adults', source: 'MakeMyTrip', status: 'Checked-in', amount: 15400, balance: 0 },
  { guest: 'Aisha Sharma', phone: '+91 99112 23344', room: 'Deluxe Room 104', checkIn: '2026-08-13', checkOut: '2026-08-14', nights: 1, pax: '1 Adult', source: 'Direct', status: 'Checked-in', amount: 8900, balance: 0 },
  { guest: 'Rohan Varma', phone: '+91 98300 12345', room: 'Executive Room 205', checkIn: '2026-08-12', checkOut: '2026-08-14', nights: 2, pax: '2 Adults', source: 'Booking.com', status: 'Confirmed', amount: 12500, balance: 0 },
  { guest: 'Meera Nair', phone: '+91 97777 88888', room: 'Villa Suite 101', checkIn: '2026-08-14', checkOut: '2026-08-17', nights: 3, pax: '3 Adults', source: 'Agoda', status: 'Pending', amount: 4500, balance: 4500 }
];

const SEED_AUDITS = [
  { user: 'superadmin@hourstay.com', action: 'Admin session started', entity: 'System Auth', ip: '192.168.1.1', time: '2 hours ago' },
  { user: 'superadmin@hourstay.com', action: 'Onboarded Backwater Retreat', entity: 'Property', ip: '192.168.1.1', time: '5 hours ago' },
  { user: 'superadmin@hourstay.com', action: 'Assigned GM to Rambagh Residency', entity: 'Staffing', ip: '192.168.1.1', time: '1 day ago' }
];

const SEED_ANNOUNCEMENTS = [
  { title: 'System Engine Upgrade', body: 'The PMS allocation speed has been enhanced by 23% following optimization of core Mongoose schemas.', tone: 'success', time: '3 hours ago' },
  { title: 'Jaipur Rate Parity Warning', body: 'Goibibo shows a lower tariff than configured. Please update pricing maps immediately.', tone: 'warning', time: '5 hours ago' },
  { title: 'Atlas DB Cluster Synced', body: 'Local file-based system successfully synchronized with MongoDB cloud cluster.', tone: 'info', time: '1 day ago' }
];

const SEED_CMS = [
  { type: 'blog', title: 'Hospitality Trends in India', slug: 'hospitality-trends-2026', excerpt: 'An in-depth review of post-monsoon boutique occupancy trends.', author: 'Super Admin', role: 'Global Editor', date: '10 Aug 2026', readTime: '5 min read', tag: 'Analytics', content: 'India is experiencing high RevPAR growth...' },
  { type: 'faq', question: 'How is slab GST calculated?', answer: 'A slab rate of 12% is applied for room tariffs below ₹7,500; a rate of 18% is applied for tariffs above ₹7,500.', category: 'billing' },
  { type: 'contact', name: 'Naveen Reddy', email: 'naveen@resortshub.in', subject: 'Integration Inquiry', message: 'Looking to integrate our 3 properties in Ooty with Hour Stay PMS.', date: '11 Aug 2026' }
];

export const seedUsers = async () => {
  try {
    // 1. Seed Users
    for (const u of SEED_USERS) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        await User.create(u);
        console.log(`🌱 Seeded user: ${u.email}`);
      }
    }

    // 2. Seed Properties
    const activeProps = await Property.find();
    if (activeProps.length === 0) {
      for (const p of SEED_PROPERTIES) {
        await Property.create(p);
        console.log(`🏨 Seeded property: ${p.name}`);
      }
    }

    // 3. Seed Bookings
    const activeBookings = await Booking.find();
    if (activeBookings.length === 0) {
      // Find a property to map
      const props = await Property.find();
      const defaultPropId = props[0]?._id?.toString() || '669a84a6c4293fcfd4615ff2';
      
      for (const b of SEED_BOOKINGS) {
        await Booking.create({ ...b, propertyId: defaultPropId });
        console.log(`📅 Seeded booking: ${b.guest}`);
      }
    }

    // 4. Seed Audits
    const activeAudits = await AuditLog.find();
    if (activeAudits.length === 0) {
      for (const a of SEED_AUDITS) {
        await AuditLog.create(a);
      }
      console.log(`🛡️ Seeded security audit logs.`);
    }

    // 5. Seed Announcements
    const activeAnnouncements = await Announcement.find();
    if (activeAnnouncements.length === 0) {
      for (const an of SEED_ANNOUNCEMENTS) {
        await Announcement.create(an);
      }
      console.log(`📢 Seeded system notifications.`);
    }

    // 6. Seed CMS
    const activeCms = await Cms.find();
    if (activeCms.length === 0) {
      for (const c of SEED_CMS) {
        await Cms.create(c);
      }
      console.log(`📝 Seeded CMS landing components.`);
    }

    console.log('✅ Seeding checks completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
  }
};
