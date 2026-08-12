// Static mock data for the Hour Stay UI. No backend — everything here is sample content.

export const inr = (n) =>
"₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });









export const roomStatusMeta =


{
  clean: {
    label: "Clean / Inspected",
    icon: "✓",
    dot: "bg-success",
    chip: "bg-success/12 text-success border-success/30"
  },
  occupied: {
    label: "Occupied",
    icon: "●",
    dot: "bg-navy",
    chip: "bg-navy/10 text-navy border-navy/30 dark:text-foreground dark:bg-white/10"
  },
  dirty: {
    label: "Dirty",
    icon: "!",
    dot: "bg-warning",
    chip: "bg-warning/12 text-warning border-warning/30"
  },
  cleaning: {
    label: "Cleaning",
    icon: "◐",
    dot: "bg-info",
    chip: "bg-info/12 text-info border-info/30"
  },
  ooo: {
    label: "Out of Order",
    icon: "✕",
    dot: "bg-error",
    chip: "bg-error/12 text-error border-error/30"
  },
  blocked: {
    label: "Blocked",
    icon: "▣",
    dot: "bg-muted-foreground",
    chip: "bg-muted text-muted-foreground border-border"
  }
};

export const properties = [
{
  id: "HS-JAI",
  name: "Hour Stay Rambagh Residency",
  city: "Jaipur, Rajasthan",
  rooms: 128,
  occupancy: 84,
  adr: 11400,
  revpar: 9576,
  status: "Active",
  gm: "Vikram Rathore"
},
{
  id: "HS-UDA",
  name: "Hour Stay Lake Palace View",
  city: "Udaipur, Rajasthan",
  rooms: 96,
  occupancy: 91,
  adr: 16800,
  revpar: 15288,
  status: "Active",
  gm: "Meera Nair"
},
{
  id: "HS-GOA",
  name: "Hour Stay Candolim Beach Resort",
  city: "Candolim, Goa",
  rooms: 142,
  occupancy: 76,
  adr: 13250,
  revpar: 10070,
  status: "Active",
  gm: "Joaquim Fernandes"
},
{
  id: "HS-KER",
  name: "Hour Stay Backwater Retreat",
  city: "Alleppey, Kerala",
  rooms: 64,
  occupancy: 68,
  adr: 9800,
  revpar: 6664,
  status: "Active",
  gm: "Anand Pillai"
},
{
  id: "HS-DEL",
  name: "Hour Stay Aerocity",
  city: "New Delhi",
  rooms: 210,
  occupancy: 88,
  adr: 10250,
  revpar: 9020,
  status: "Onboarding",
  gm: "Sanjana Kapoor"
},
{
  id: "HS-MUM",
  name: "Hour Stay Marine Drive",
  city: "Mumbai, Maharashtra",
  rooms: 156,
  occupancy: 82,
  adr: 14600,
  revpar: 11972,
  status: "Active",
  gm: "Rehan Shaikh"
}];


export const roomTypes = [
{
  id: "RT-DLX",
  name: "Deluxe Courtyard Room",
  size: "34 sqm",
  beds: "1 King",
  occupancy: 2,
  inventory: 42,
  baseRate: 8900,
  amenities: ["Courtyard view", "Rain shower", "Complimentary breakfast"]
},
{
  id: "RT-PRE",
  name: "Premier Haveli Room",
  size: "42 sqm",
  beds: "1 King / 2 Twin",
  occupancy: 3,
  inventory: 36,
  baseRate: 12400,
  amenities: ["Jharokha balcony", "Butler service", "Lounge access"]
},
{
  id: "RT-SUI",
  name: "Maharaja Suite",
  size: "68 sqm",
  beds: "1 King + Living",
  occupancy: 4,
  inventory: 14,
  baseRate: 24500,
  amenities: ["Private terrace", "Jacuzzi", "Airport transfer"]
},
{
  id: "RT-VIL",
  name: "Garden Pool Villa",
  size: "96 sqm",
  beds: "1 King",
  occupancy: 3,
  inventory: 8,
  baseRate: 38900,
  amenities: ["Private pool", "Ayurvedic spa credit", "Personal chef"]
}];


export const reservations = [
{
  id: "HS24-10241",
  guest: "Aarav Mehta",
  phone: "+91 98204 33121",
  room: "312 · Premier Haveli",
  checkIn: "12 Aug 2026",
  checkOut: "15 Aug 2026",
  nights: 3,
  pax: "2 Adults",
  source: "Direct",
  status: "Confirmed",
  amount: 37200,
  balance: 0
},
{
  id: "HS24-10242",
  guest: "Priya Iyer",
  phone: "+91 90031 87740",
  room: "204 · Deluxe Courtyard",
  checkIn: "12 Aug 2026",
  checkOut: "13 Aug 2026",
  nights: 1,
  pax: "1 Adult",
  source: "MakeMyTrip",
  status: "Checked-in",
  amount: 8900,
  balance: 2100
},
{
  id: "HS24-10243",
  guest: "Rohan & Sneha Kulkarni",
  phone: "+91 99870 21145",
  room: "501 · Maharaja Suite",
  checkIn: "13 Aug 2026",
  checkOut: "17 Aug 2026",
  nights: 4,
  pax: "2 Adults, 1 Child",
  source: "Booking.com",
  status: "Confirmed",
  amount: 98000,
  balance: 49000
},
{
  id: "HS24-10244",
  guest: "Devendra Shastri",
  phone: "+91 93450 09912",
  room: "108 · Deluxe Courtyard",
  checkIn: "11 Aug 2026",
  checkOut: "12 Aug 2026",
  nights: 1,
  pax: "1 Adult",
  source: "Walk-in",
  status: "Checked-out",
  amount: 9400,
  balance: 0
},
{
  id: "HS24-10245",
  guest: "Ananya Bose",
  phone: "+91 98311 55420",
  room: "410 · Premier Haveli",
  checkIn: "14 Aug 2026",
  checkOut: "16 Aug 2026",
  nights: 2,
  pax: "2 Adults",
  source: "Goibibo",
  status: "Pending",
  amount: 24800,
  balance: 24800
},
{
  id: "HS24-10246",
  guest: "Karthik Subramaniam",
  phone: "+91 94440 76210",
  room: "602 · Garden Pool Villa",
  checkIn: "15 Aug 2026",
  checkOut: "18 Aug 2026",
  nights: 3,
  pax: "2 Adults",
  source: "Direct",
  status: "Confirmed",
  amount: 116700,
  balance: 58350
},
{
  id: "HS24-10247",
  guest: "Fatima Qureshi",
  phone: "+91 99205 41188",
  room: "215 · Deluxe Courtyard",
  checkIn: "12 Aug 2026",
  checkOut: "14 Aug 2026",
  nights: 2,
  pax: "1 Adult",
  source: "Agoda",
  status: "Cancelled",
  amount: 17800,
  balance: 0
}];


export const guests = [
{
  id: "G-2201",
  name: "Aarav Mehta",
  city: "Mumbai",
  tier: "Platinum",
  stays: 24,
  spend: 942000,
  lastStay: "12 Aug 2026",
  email: "aarav.mehta@example.in"
},
{
  id: "G-2202",
  name: "Priya Iyer",
  city: "Bengaluru",
  tier: "Gold",
  stays: 11,
  spend: 318500,
  lastStay: "12 Aug 2026",
  email: "priya.iyer@example.in"
},
{
  id: "G-2203",
  name: "Rohan Kulkarni",
  city: "Pune",
  tier: "Gold",
  stays: 9,
  spend: 274300,
  lastStay: "13 Aug 2026",
  email: "rohan.k@example.in"
},
{
  id: "G-2204",
  name: "Ananya Bose",
  city: "Kolkata",
  tier: "Silver",
  stays: 4,
  spend: 96400,
  lastStay: "14 Aug 2026",
  email: "ananya.bose@example.in"
},
{
  id: "G-2205",
  name: "Karthik Subramaniam",
  city: "Chennai",
  tier: "Platinum",
  stays: 31,
  spend: 1284000,
  lastStay: "15 Aug 2026",
  email: "karthik.s@example.in"
}];


export const staff = [
{ id: "E-101", name: "Vikram Rathore", role: "General Manager", shift: "General (9:00–18:00)", status: "On duty", phone: "+91 98290 11223" },
{ id: "E-114", name: "Sneha Deshpande", role: "Front Office Manager", shift: "Morning (7:00–15:00)", status: "On duty", phone: "+91 98290 44190" },
{ id: "E-127", name: "Imran Sheikh", role: "Receptionist", shift: "Evening (15:00–23:00)", status: "Off duty", phone: "+91 90045 77120" },
{ id: "E-133", name: "Lakshmi Menon", role: "Receptionist", shift: "Night (23:00–7:00)", status: "On leave", phone: "+91 90045 88231" },
{ id: "E-140", name: "Harpreet Singh", role: "Revenue Analyst", shift: "General (9:00–18:00)", status: "On duty", phone: "+91 98110 66334" }];


export const invoices = [
{ id: "INV-2026-0841", guest: "Aarav Mehta", folio: "F-3312", date: "12 Aug 2026", amount: 37200, gst: 6696, status: "Paid", mode: "UPI" },
{ id: "INV-2026-0842", guest: "Priya Iyer", folio: "F-3313", date: "12 Aug 2026", amount: 8900, gst: 1068, status: "Partial", mode: "Card" },
{ id: "INV-2026-0843", guest: "Rohan Kulkarni", folio: "F-3314", date: "13 Aug 2026", amount: 98000, gst: 17640, status: "Unpaid", mode: "—" },
{ id: "INV-2026-0844", guest: "Devendra Shastri", folio: "F-3315", date: "12 Aug 2026", amount: 9400, gst: 1128, status: "Paid", mode: "Cash" },
{ id: "INV-2026-0845", guest: "Karthik Subramaniam", folio: "F-3316", date: "15 Aug 2026", amount: 116700, gst: 21006, status: "Partial", mode: "NetBanking" }];


export const payments = [
{ id: "PAY-99120", guest: "Aarav Mehta", mode: "UPI · @okhdfcbank", amount: 37200, time: "Today, 09:12", status: "Success" },
{ id: "PAY-99121", guest: "Priya Iyer", mode: "Card · HDFC ••4412", amount: 6800, time: "Today, 10:40", status: "Success" },
{ id: "PAY-99122", guest: "Rohan Kulkarni", mode: "NetBanking · ICICI", amount: 49000, time: "Today, 11:05", status: "Pending" },
{ id: "PAY-99123", guest: "Fatima Qureshi", mode: "UPI · @ybl", amount: 17800, time: "Yesterday, 18:22", status: "Refunded" }];


export const revenueTrend = [
{ m: "Feb", revenue: 3820000, occupancy: 71 },
{ m: "Mar", revenue: 4410000, occupancy: 76 },
{ m: "Apr", revenue: 3980000, occupancy: 69 },
{ m: "May", revenue: 3210000, occupancy: 61 },
{ m: "Jun", revenue: 3640000, occupancy: 66 },
{ m: "Jul", revenue: 4880000, occupancy: 81 },
{ m: "Aug", revenue: 5240000, occupancy: 86 }];


export const sourceMix = [
{ name: "Direct", value: 38 },
{ name: "MakeMyTrip", value: 22 },
{ name: "Booking.com", value: 18 },
{ name: "Goibibo", value: 12 },
{ name: "Agoda", value: 10 }];


export const channels = [
{ name: "MakeMyTrip", status: "Connected", rooms: 42, lastSync: "2 min ago", parity: "In parity" },
{ name: "Booking.com", status: "Connected", rooms: 38, lastSync: "6 min ago", parity: "In parity" },
{ name: "Goibibo", status: "Connected", rooms: 30, lastSync: "11 min ago", parity: "Rate mismatch" },
{ name: "Agoda", status: "Syncing", rooms: 24, lastSync: "Syncing…", parity: "In parity" },
{ name: "Airbnb", status: "Disconnected", rooms: 0, lastSync: "3 days ago", parity: "—" }];


export const notifications = [
{ id: 1, title: "Rate parity alert — Goibibo", body: "Deluxe Courtyard is ₹450 below direct rate.", time: "8 min ago", tone: "warning" },
{ id: 2, title: "Suite 501 checked in", body: "Rohan & Sneha Kulkarni, 4 nights, anniversary note added.", time: "22 min ago", tone: "success" },
{ id: 3, title: "Refund awaiting approval", body: "₹17,800 for booking HS24-10247 (Fatima Qureshi).", time: "1 hr ago", tone: "info" },
{ id: 4, title: "Housekeeping backlog", body: "6 rooms on Floor 2 pending inspection before 14:00.", time: "2 hrs ago", tone: "error" }];


export const auditLogs = [
{ id: "L-88231", user: "vikram.rathore@hourstay.in", action: "Updated seasonal rate plan", entity: "Diwali Peak · Jaipur", ip: "103.21.58.14", time: "11 Aug 2026, 18:42" },
{ id: "L-88230", user: "sneha.d@hourstay.in", action: "Approved refund", entity: "HS24-10247", ip: "103.21.58.22", time: "11 Aug 2026, 17:10" },
{ id: "L-88229", user: "superadmin@hourstay.in", action: "Created property", entity: "Hour Stay Aerocity", ip: "49.36.180.5", time: "10 Aug 2026, 12:03" },
{ id: "L-88228", user: "imran.s@hourstay.in", action: "Checked in guest", entity: "HS24-10242", ip: "103.21.58.30", time: "10 Aug 2026, 09:28" }];


export const feedback = [
{ id: "R-551", guest: "Aarav Mehta", rating: 5, title: "Spotless service", body: "The haveli courtyard breakfast was the highlight. Butler remembered our filter coffee order.", date: "10 Aug 2026", source: "Direct" },
{ id: "R-552", guest: "Priya Iyer", rating: 4, title: "Great stay, slow check-in", body: "Room was lovely. Check-in took 20 minutes during the wedding rush.", date: "09 Aug 2026", source: "Google" },
{ id: "R-553", guest: "Ananya Bose", rating: 3, title: "AC noisy", body: "Room 410 AC was noisy at night, engineering fixed it next morning.", date: "07 Aug 2026", source: "Booking.com" }];


export const arrivals = reservations.filter((r) => r.checkIn === "12 Aug 2026");
export const departures = reservations.filter((r) => r.checkOut === "13 Aug 2026" || r.checkOut === "12 Aug 2026");

const statuses = ["clean", "occupied", "dirty", "cleaning", "ooo", "blocked"];
const typeShort = ["Deluxe", "Premier", "Suite", "Villa"];
const guestNames = ["Aarav Mehta", "Priya Iyer", "R. Kulkarni", "K. Subramaniam", "Ananya Bose", "N. Chatterjee", "S. Grewal", "—"];

export const rooms = Array.from({ length: 48 }, (_, i) => {
  const floor = Math.floor(i / 12) + 1;
  const num = `${floor}${String(i % 12 + 1).padStart(2, "0")}`;
  const status = statuses[(i * 7 + floor) % 6];
  return {
    number: num,
    floor,
    type: typeShort[i % 4],
    status,
    guest: status === "occupied" ? guestNames[i % 7] : "—",
    nights: status === "occupied" ? i % 4 + 1 : 0,
    rate: [8900, 12400, 24500, 38900][i % 4]
  };
});

export const blogPosts = [
  {
    slug: "pms-simplifies-operations",
    title: "How Hotel PMS Software Simplifies Daily Operations",
    excerpt: "Discover how a unified property management system connects your reservations, housekeeping logs, and front-desk check-ins in one calm workflow.",
    author: "Meera Nair",
    role: "General Manager, Udaipur",
    date: "02 Aug 2026",
    readTime: "5 min read",
    tag: "Hotel Management"
  },
  {
    slug: "direct-bookings-indian-hotels",
    title: "Why Direct Bookings Matter for Indian Hotels",
    excerpt: "Break free from heavy OTA commissions. Learn how to optimize your brand website, build trust, and drive high-yield direct bookings in India.",
    author: "Vikram Rathore",
    role: "General Manager, Jaipur",
    date: "12 Aug 2026",
    readTime: "6 min read",
    tag: "Hospitality Trends"
  },
  {
    slug: "gst-billing-guide-hotels",
    title: "GST Billing Guide for Hotels in India",
    excerpt: "Slab changes, SGST/CGST/IGST mapping, input tax credits, and the three billing mistakes that cost hotel owners lakhs annually.",
    author: "Harpreet Singh",
    role: "Revenue Analyst, Hour Stay",
    date: "08 Aug 2026",
    readTime: "8 min read",
    tag: "GST & Finance"
  },
  {
    slug: "ota-channel-management-overbooking",
    title: "How OTA Channel Management Prevents Overbooking",
    excerpt: "Understand how real-time 2-way channel sync ensures rate parity and avoids expensive overbooking issues across major booking channels.",
    author: "Joaquim Fernandes",
    role: "Owner, Goa Candolim Resort",
    date: "26 Jul 2026",
    readTime: "6 min read",
    tag: "Technology"
  },
  {
    slug: "dynamic-pricing-hotel-revenue",
    title: "Improving Hotel Revenue with Dynamic Pricing",
    excerpt: "How to design demand-based pricing tariffs that capture high booking rates during wedding seasons and regional festivals.",
    author: "Sneha Deshpande",
    role: "Front Office Manager",
    date: "18 Jul 2026",
    readTime: "7 min read",
    tag: "Revenue & Pricing"
  },
  {
    slug: "modern-housekeeping-management",
    title: "Modern Housekeeping Management for Faster Room Turnaround",
    excerpt: "A practical guide to implementing mobile checklists, cleaning priority loops, and real-time room status updates to decrease wait times.",
    author: "Amit Malhotra",
    role: "Operations Consultant",
    date: "10 Jul 2026",
    readTime: "5 min read",
    tag: "Hotel Management"
  }
];


export const searchResults = [
{ id: "HS-JAI", name: "Hour Stay Rambagh Residency", city: "Jaipur", rating: 4.8, reviews: 1284, price: 8900, tags: ["Heritage haveli", "Courtyard pool", "Free breakfast"] },
{ id: "HS-UDA", name: "Hour Stay Lake Palace View", city: "Udaipur", rating: 4.9, reviews: 962, price: 14200, tags: ["Lake view", "Rooftop dining", "Spa"] },
{ id: "HS-GOA", name: "Hour Stay Candolim Beach Resort", city: "Goa", rating: 4.6, reviews: 2140, price: 11400, tags: ["Beachfront", "Kids club", "Sunset bar"] },
{ id: "HS-KER", name: "Hour Stay Backwater Retreat", city: "Alleppey", rating: 4.7, reviews: 738, price: 7600, tags: ["Backwaters", "Ayurveda", "Houseboat tour"] }];


export const myBookings = [
{ id: "HS24-10241", hotel: "Hour Stay Rambagh Residency", city: "Jaipur", room: "Premier Haveli Room", dates: "12–15 Aug 2026", status: "Upcoming", amount: 37200 },
{ id: "HS24-09877", hotel: "Hour Stay Lake Palace View", city: "Udaipur", room: "Maharaja Suite", dates: "02–05 Mar 2026", status: "Completed", amount: 88400 },
{ id: "HS24-09122", hotel: "Hour Stay Candolim Beach Resort", city: "Goa", room: "Garden Pool Villa", dates: "24–28 Dec 2025", status: "Completed", amount: 142600 },
{ id: "HS24-08810", hotel: "Hour Stay Backwater Retreat", city: "Alleppey", room: "Deluxe Courtyard", dates: "09–10 Sep 2025", status: "Cancelled", amount: 7600 }];


export const serviceRequests = [
{ id: "SR-4410", type: "Housekeeping", detail: "Extra towels and pillows", room: "312", status: "In progress", time: "10 min ago" },
{ id: "SR-4409", type: "In-room dining", detail: "Masala chai for two, 6:30 AM", room: "312", status: "Scheduled", time: "40 min ago" },
{ id: "SR-4402", type: "Concierge", detail: "Amber Fort cab at 8:00 AM", room: "312", status: "Completed", time: "Yesterday" }];