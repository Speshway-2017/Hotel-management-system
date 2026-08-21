import mongoose from 'mongoose';
import User from '../models/user.model.js';
import Property from '../models/property.model.js';
import Booking from '../models/booking.model.js';
import AuditLog from '../models/auditLog.model.js';
import Announcement from '../models/announcement.model.js';
import Cms from '../models/cms.model.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadImageToCloudinary } from '../utils/uploader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  { _id: 'HS-JAI', name: 'Rambagh Residency', city: 'Madhapur,Hyderabad', rooms: 50, occupancy: 76, adr: 8500, revpar: 6460, status: 'Active', gm: 'Vikramaditya Singh', subscriptionTier: 'Enterprise', subscriptionStatus: 'Active' },
  { _id: 'HS-UDA', name: 'Lake Palace View', city: 'Udaipur', rooms: 30, occupancy: 70, adr: 9500, revpar: 6650, status: 'Active', gm: 'Suryaveer Rathore', subscriptionTier: 'Premium', subscriptionStatus: 'Active' },
  { _id: 'HS-GOA', name: 'Candolim Beach Resort', city: 'Goa', rooms: 80, occupancy: 60, adr: 7500, revpar: 4500, status: 'Active', gm: 'Manuel D\'Souza', subscriptionTier: 'Premium', subscriptionStatus: 'Active' },
  { _id: 'HS-KER', name: 'Backwater Retreat', city: 'Alleppey', rooms: 15, occupancy: 30, adr: 12000, revpar: 3600, status: 'Onboarding', gm: 'Unassigned', subscriptionTier: 'None', subscriptionStatus: 'None' }
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
  {
    type: "branding",
    name: "Hour Stay",
    slug: "hour-stay",
    tag: "Hospitality software from Jaipur",
    excerpt: "Built by hoteliers and engineers in Jaipur for Indian properties.",
    author: "#0D1B2A",
    role: "#5B21B6",
    readTime: "/favicon.ico",
    content: "/assets/logo-Bk15F6S5.png"
  },
  {
    type: "home",
    title: "Built for the way Indian hospitality works.",
    excerpt: "We believe in technology that respects the hustle behind the desk. Hour Stay is engineered to simplify operations, remove dashboard clutter, and streamline guest management.",
    author: "Start Free Trial",
    tag: "Heritage properties, city boutique hotels, and coastal resorts.",
    content: "/assets/palace_udaipur-CU7rhatd.png"
  },
  {
    type: "about",
    title: "Built for the way Indian hospitality works.",
    excerpt: "Hour Stay is a unified, cloud-based Hotel Management System that connects reservations, front desk check-in/out, GST billing, housekeeping tasks, guest mobile apps, and analytics in one cohesive platform.",
    author: "Hour Stay began with a simple observation: most hotel management software is too complicated. Properties were forced to juggle separate systems. We set out to rebuild this stack from scratch.",
    tag: "To empower Indian hoteliers with modern, reliable, and intuitive cloud technology to run smooth daily check-ins and check-outs.",
    role: "To be the preferred core PMS system across 5,000+ boutique, heritage, and independent hotels in South Asia.",
    content: "/assets/palace_udaipur-CU7rhatd.png"
  },
  // Features (19 items)
  { type: "feature", title: "Reservation & Booking", excerpt: "Direct booking engine, live availability search, tax-inclusive rate selectors, group reservations, and source tags.", icon: "CalendarDays", tag: "Dynamic rate calendars, MMT / Agoda parity alerts, Deposit adjustments" },
  { type: "feature", title: "Front Desk Console", excerpt: "Walk-in management, digital Aadhaar OCR capture, Form C registration cards, auto room suggestion, and check-out checkout.", icon: "LayoutGrid", tag: "Real-time status grid, Offline mode sync, Shift handovers" },
  { type: "feature", title: "Housekeeping App", excerpt: "Mobile task assignment lists, status lifecycles, real-time sync with front desk, and lost & found logs.", icon: "Check", tag: "Linen tracking, Auto-dirty toggle on check-out, Turnaround metrics" },
  { type: "feature", title: "Room & Rate Master", excerpt: "Configurable dynamic/demand pricing, seasonal calendars, peak day rules, rate plans, and bulk allocation changes.", icon: "RefreshCw", tag: "Negotiated rate plans, Owner occupancy blocks, Room type limits" },
  { type: "feature", title: "Invoicing & Billing", excerpt: "GST split billing (CGST, SGST, IGST), SAC code compliance, master folios, corporate tag splits, and refund credits.", icon: "Receipt", tag: "Automatic tax-slab mapping, Invoice WhatsApp dispatch, Outstanding ledger" },
  { type: "feature", title: "Unified Payments", excerpt: "UPI dynamic QR codes, integrated card payments, net banking, automated Settlements, and original payment refunds.", icon: "CreditCard", tag: "Instant UPI verification, Partial checks tracking, Commission-free payments" },
  { type: "feature", title: "POS Integrations", excerpt: "In-house restaurant dining bills, bar/spa outlet charges, laundry postings, and room service order folio links.", icon: "Receipt", tag: "Unified POS reports, Direct checkout mapping, Outlet commission audits" },
  { type: "feature", title: "Guest CRM & Loyalty", excerpt: "Central guest profiles, stay logs, preferences notes, loyalty tier points, and repeat guest marketing offers.", icon: "Users", tag: "Personalized check-in, Blacklist tags, Occasion notifications" },
  { type: "feature", title: "Maintenance Tickets", excerpt: "Guest-initiated service requests via mobile app (housekeeping, room service, maintenance), ticketing assignments, and SLAs.", icon: "Wrench", tag: "Out-of-order inventory hold, Staff assignment notifications, Problem details photo logs" },
  { type: "feature", title: "Staff Roster & Shifts", excerpt: "Granular role-based accounts, geo-tagged mobile attendance sheets, shift rosters, and performance indexes.", icon: "Users", tag: "Biometric optional link, Salary/wage calculations, Shift handover logs" },
  { type: "feature", title: "Reports & Analytics", excerpt: "Consolidated occupancy charts, RevPAR, ADR logs, statutory tax summaries, and multi-branch benchmarks.", icon: "BarChart3", tag: "Custom PDF/CSV export, Payment gateway audits, YoY comparative graphs" },
  { type: "feature", title: "Channel Sync Manager", excerpt: "Centralized room pushes, rate parity conflict flags, commission percentages tracking, and instant stop-sells.", icon: "RefreshCw", tag: "2-way API synchronization, MMT, Goibibo, Booking.com, Overbooking safeguards" },
  { type: "feature", title: "Multi-Property Hub", excerpt: "Centralized Super Admin console, cross-property guest tracking, central catalog sync, and central invoicing.", icon: "Building2", tag: "Branch comparisons, Centrally pushed rate plans, Consolidated tax ledger" },
  { type: "feature", title: "Smart Notifications", excerpt: "SMS reminders, WhatsApp API confirmations, digital invoice dispatches, and internal staff alert pushes.", icon: "Bell", tag: "Low inventory notifications, AC/pest maintenance alerts, Payment confirmations" },
  { type: "feature", title: "Guest Self-Service", excerpt: "Mobile check-in ID uploads, digital room keys, in-stay service requests, and digital folio access.", icon: "Smartphone", tag: "Contactless entry, Check-out request, Front desk chat support" },
  { type: "feature", title: "Post-Stay Feedback", excerpt: "Automated WhatsApp feedback request logs, guest review dashboard, and review responses templates.", icon: "Star", tag: "Google Business hooks, Sentiment trend reports, Issue resolution alerts" },
  { type: "feature", title: "Travel Agent Portal", excerpt: "Partner logins, contract rate pricing bookings, credit invoice registers, and agent commissions records.", icon: "Users", tag: "Agent performance matrix, Direct credit settlement, Commission tracking logs" },
  { type: "feature", title: "Security & Audit Logs", excerpt: "Role-based access controls, two-factor logins (2FA), encrypted PII storage, and full database audit trails.", icon: "ShieldCheck", tag: "Discount audit logs, Session timeout guards, Data export alerts" },
  { type: "feature", title: "Localizations", excerpt: "Regional Indian languages localization (Hindi, etc.), multi-currency converters, and language parameters per guest.", icon: "Sparkles", tag: "Dynamic exchange rates, Invoice regional text, Staff dashboard translations" },

  {
    type: "contact",
    name: "Hour Stay Headquarters",
    email: "contact@hourstay.com",
    phone: "+91 141 220 9900",
    address: "Hour Stay HQ, Heritage Plaza, Madhapur,Hyderabad 500081",
    hours: "Mon - Sat: 09:00 AM - 06:00 PM IST",
    description: "Our support engineers are available for phone check-ins during working hours. Reach out for deployment queries.",
    subject: "Madhapur,Hyderabad, India",
    message: "https://twitter.com/hourstay, https://linkedin.com/company/hourstay"
  },
  // Blogs (6 items)
  {
    type: "blog",
    slug: "pms-simplifies-operations",
    title: "How Hotel PMS Software Simplifies Daily Operations",
    excerpt: "Discover how a unified property management system connects your reservations, housekeeping logs, and front-desk check-ins in one calm workflow.",
    author: "Meera Nair",
    role: "General Manager, Udaipur",
    date: "02 Aug 2026",
    readTime: "5 min read",
    tag: "Hotel Management",
    content: "On any given Saturday in wedding season, a 120-key property in Jaipur will process forty arrivals between 13:00 and 16:00. The difference between a calm lobby and a queue at the desk is rarely staffing — it is how many decisions each receptionist has to make per guest.\n\nEvery operational habit eventually shows up on the folio. When room moves, late check-outs and F&B postings are captured as they happen, the night audit becomes a five-minute review rather than a two-hour reconciliation.\n\n“The fastest check-in we ever built was the one where the guest had already told us everything, twice.”\n\nWhat to change this week:\n\n- Pre-assign rooms for all arrivals with a confirmed ETA before 11:00.\n- Move ID capture to pre check-in so the desk only verifies, never types.\n- Set rate-parity alerts on your top two OTAs and review them at the morning brief."
  },
  {
    type: "blog",
    slug: "direct-bookings-indian-hotels",
    title: "Why Direct Bookings Matter for Indian Hotels",
    excerpt: "Break free from heavy OTA commissions. Learn how to optimize your brand website, build trust, and drive high-yield direct bookings in India.",
    author: "Vikram Rathore",
    role: "General Manager, Jaipur",
    date: "12 Aug 2026",
    readTime: "6 min read",
    tag: "Hospitality Trends",
    content: "With OTA commissions reaching up to 18-25%, direct booking strategies are no longer optional. Independent boutique hotels must create a premium direct reservation experience on their own brand website.\n\nOffering exclusive benefits (like free cancellation, complimentary breakfast, early check-in slots) is the fastest way to drive guest conversion without violating OTA parity rules. Connect with guests on WhatsApp post-stay to offer direct loyal rates."
  },
  {
    type: "blog",
    slug: "gst-billing-guide-hotels",
    title: "GST Billing Guide for Hotels in India",
    excerpt: "Slab changes, SGST/CGST/IGST mapping, input tax credits, and the three billing mistakes that cost hotel owners lakhs annually.",
    author: "Harpreet Singh",
    role: "Revenue Analyst, Hour Stay",
    date: "08 Aug 2026",
    readTime: "8 min read",
    tag: "GST & Finance",
    content: "GST billing in Indian hospitality requires strict compliance with dynamic tax slabs. Standard rules dictate that daily room rates under ₹7,500 are taxed at 12%, while tariffs at or above ₹7,500 attract 18% GST.\n\nIncorrectly itemizing SAC codes for dining folios, extra beds, or wellness packages leads to expensive audit failures during tax returns filing. Ensure your PMS splits taxes automatically."
  },
  {
    type: "blog",
    slug: "ota-channel-management-overbooking",
    title: "How OTA Channel Management Prevents Overbooking",
    excerpt: "Understand how real-time 2-way channel sync ensures rate parity and avoids expensive overbooking issues across major booking channels.",
    author: "Joaquim Fernandes",
    role: "Owner, Goa Candolim Resort",
    date: "26 Jul 2026",
    readTime: "6 min read",
    tag: "Technology",
    content: "When a guest books a Deluxe pool view villa via MakeMyTrip, the room must be taken offline on Agoda and Booking.com in under 2 seconds. Legacy PMS grids that rely on manual channel syncing invite overbookings, frustrated travelers, and poor ranking marks.\n\nHour Stay integrates a direct 2-way XML channel manager that updates availability live to all OTAs instantly."
  },
  {
    type: "blog",
    slug: "dynamic-pricing-hotel-revenue",
    title: "Improving Hotel Revenue with Dynamic Pricing",
    excerpt: "How to design demand-based pricing tariffs that capture high booking rates during wedding seasons and regional festivals.",
    author: "Sneha Deshpande",
    role: "Front Office Manager",
    date: "18 Jul 2026",
    readTime: "7 min read",
    tag: "Revenue & Pricing",
    content: "Flat room rates are a relic of the past. Modern hotels leverage automated occupancy triggers and peak seasonal rules to adjust tariffs dynamically. For instance, pricing should increase during wedding seasons, regional conventions, or festival weekends in tourist hubs like Jaipur and Goa."
  },
  {
    type: "blog",
    slug: "modern-housekeeping-management",
    title: "Modern Housekeeping Management for Faster Room Turnaround",
    excerpt: "A practical guide to implementing mobile checklists, cleaning priority loops, and real-time room status updates to decrease wait times.",
    author: "Amit Malhotra",
    role: "Operations Consultant",
    date: "10 Jul 2026",
    readTime: "5 min read",
    tag: "Hotel Management",
    content: "A guest waiting in the lobby for check-in is the highest risk factor for negative reviews. Front desk teams must have live visibility on room status. Mobile-first checklists allow housekeeping staff to mark clean rooms instantly, updating the PMS grid with zero lag."
  },

  {
    type: "faq",
    question: "How do I split a guest bill?",
    answer: "Navigate to the front-desk room layout grid, click on the active room folio, select 'Split Bill', choose the split method (e.g. personal vs. corporate), and generate the split invoices."
  },
  {
    type: "faq",
    question: "Does the system support GST slab billing?",
    answer: "Yes, tariff under ₹7,500 attracts 12% GST and at or above ₹7,500 tariff attracts 18% GST dynamically."
  },
  {
    type: "settings",
    content: "{\"platformName\":\"Hour Stay\",\"currency\":\"INR\",\"language\":\"English\",\"timezone\":\"Asia/Kolkata\",\"dateFormat\":\"DD-MM-YYYY\",\"bookingConfirmMode\":\"Automatic\",\"cancellationPolicy\":\"Free up to 24h\",\"maxReservationsPerUser\":5,\"gstMode\":\"Slab\",\"defaultTaxRate\":18,\"invoicePrefix\":\"HS-\",\"emailNotificationsEnabled\":true,\"smsNotificationsEnabled\":true,\"whatsappNotificationsEnabled\":true,\"pushNotificationsEnabled\":false,\"sessionTimeoutMinutes\":30,\"passwordMinLength\":8,\"tfaEnabled\":false,\"maxLoginAttempts\":5,\"paymentGatewayProvider\":\"UPI\",\"channelManagerEnabled\":true,\"smsGatewayProvider\":\"MSG91\",\"publicBookingsEnabled\":true,\"maintenanceMode\":false,\"websiteVisibility\":\"Public\"}"
  }
];

const seedMediaAssets = async () => {
  try {
    const list = await Cms.find({ type: 'media_assets' });
    const mediaDoc = list[0];
    if (mediaDoc && mediaDoc.content.includes('"url"')) {
      console.log('✅ Media assets are already mapped.');
      return JSON.parse(mediaDoc.content);
    }
    if (mediaDoc) {
      await Cms.findByIdAndDelete(mediaDoc.id || mediaDoc._id);
    }

    console.log('🔄 Auditing and seeding media assets to Cloudinary/local fallback...');
    const assetsDir = path.resolve(__dirname, '../../frontend/src/assets');
    const uploadsDir = path.resolve(__dirname, '../uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filesToUpload = [
      { key: 'logo', filename: 'logo.png' },
      { key: 'jaipur', filename: 'resort_jaipur.png' },
      { key: 'goa', filename: 'beach_goa.png' },
      { key: 'palace', filename: 'palace_udaipur.png' },
      { key: 'kerala', filename: 'retreat_kerala.png' }
    ];

    const mapping = {};

    for (const item of filesToUpload) {
      const srcPath = path.join(assetsDir, item.filename);
      if (!fs.existsSync(srcPath)) {
        console.warn(`⚠️ Source asset file not found: ${srcPath}`);
        continue;
      }

      // Copy file temporarily to backend uploads/ so uploader can process it
      const tempDestPath = path.join(uploadsDir, 'temp_' + item.filename);
      fs.copyFileSync(srcPath, tempDestPath);

      // Upload to Cloudinary (or local fallback)
      const uploadResult = await uploadImageToCloudinary(tempDestPath);
      mapping[item.key] = { url: uploadResult.url, publicId: uploadResult.publicId };
      console.log(`📸 Seeding image '${item.filename}' -> ${uploadResult.url}`);
    }

    // Save to CMS collection
    await Cms.create({
      type: 'media_assets',
      content: JSON.stringify(mapping)
    });

    console.log('✅ Media assets seeded successfully.');
    return mapping;
  } catch (error) {
    console.error('❌ Media assets seeding failed:', error.message);
    return {};
  }
};

export const seedUsers = async () => {
  try {
    // 0. Seed Media Assets
    const mediaMapping = await seedMediaAssets();
    if (mediaMapping.logo) SEED_CMS[0].content = mediaMapping.logo.url || mediaMapping.logo;
    if (mediaMapping.palace) {
      SEED_CMS[1].content = mediaMapping.palace.url || mediaMapping.palace;
      SEED_CMS[2].content = mediaMapping.palace.url || mediaMapping.palace;
    }
    // Set cover images for seeded blogs dynamically using media mapping
    const setBlogMedia = (index, media) => {
      if (media) {
        SEED_CMS[index].imageUrl = media.url || media;
        SEED_CMS[index].imagePublicId = media.publicId || 'local_fallback';
        SEED_CMS[index].description = media.url || media;
      }
    };
    setBlogMedia(23, mediaMapping.kerala);
    setBlogMedia(24, mediaMapping.jaipur);
    setBlogMedia(25, mediaMapping.palace);
    setBlogMedia(26, mediaMapping.goa);
    setBlogMedia(27, mediaMapping.palace);
    setBlogMedia(28, mediaMapping.jaipur);
    // 1. Seed Users
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/users.json'), 'utf8'));
    for (const u of usersData) {
      const exists = await User.findOne({ email: u.email });
      const targetId = u.id || u._id;
      if (exists) {
        if (exists._id.toString() !== targetId) {
          if (mongoose.connection.readyState === 1) {
            await mongoose.model('User').deleteMany({ $or: [{ email: u.email }, { _id: targetId }] });
          } else {
            await User.findByIdAndDelete(exists._id || exists.id);
          }
          await User.create({
            _id: targetId,
            name: u.name,
            email: u.email,
            password: u.password,
            role: u.role,
            mobile: u.mobile,
            propertyId: u.propertyId || null,
            status: u.status || 'Active'
          });
          console.log(`🔄 Re-seeded user with correct string ID: ${u.email}`);
        }
      } else {
        await User.create({
          _id: targetId,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          mobile: u.mobile,
          propertyId: u.propertyId || null,
          status: u.status || 'Active'
        });
        console.log(`🌱 Seeded user: ${u.email}`);
      }
    }

    // 2. Seed Properties
    const existingProperties = await Property.find();
    if (existingProperties.length === 0) {
      for (const p of SEED_PROPERTIES) {
        await Property.create(p);
        console.log(`🏨 Seeded property: ${p.name}`);
      }
    }

    // 3. Seed Bookings
    const existingBookings = await Booking.find();
    if (existingBookings.length === 0) {
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
    const hasLocalAssets = activeCms.some(item => 
      (item.type === 'branding' || item.type === 'home' || item.type === 'about') &&
      item.content && item.content.includes('/assets/')
    ) || activeCms.some(item => item.type === 'blog' && !item.imageUrl) || activeCms.some(item => item.type === 'media_assets' && !item.content.includes('"url"'));

    if (activeCms.length < 25 || hasLocalAssets) {
      console.log('🔄 CMS seeding update required (local assets or new seed mapping). Reloading...');
      for (const item of activeCms) {
        await Cms.findByIdAndDelete(item._id || item.id);
      }
      for (const c of SEED_CMS) {
        await Cms.create(c);
      }
      console.log(`📝 Seeded CMS landing components successfully.`);
    }

    console.log('✅ Seeding checks completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
  }
};
