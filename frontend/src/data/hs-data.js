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
  city: "Madhapur,Hyderabad",
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
  amenities: ["Courtyard view", "Rain shower", "High-speed WiFi"]
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
  id: "BK-20101",
  guest: "Sunny",
  phone: "+91 98765 20101",
  room: "101 · Standard Room",
  checkIn: "22 Sep 2026",
  checkOut: "24 Sep 2026",
  nights: 2,
  pax: "1 Adult",
  source: "Hour Stay App",
  status: "Checked-in",
  amount: 9500,
  balance: 0
},
{
  id: "BK-10101",
  guest: "Mounika",
  phone: "+91 99443 88120",
  room: "102 · Standard Room",
  checkIn: "22 Sep 2026",
  checkOut: "24 Sep 2026",
  nights: 2,
  pax: "2 Adults",
  source: "MakeMyTrip",
  status: "Checked-in",
  amount: 11400,
  balance: 0
},
{
  id: "BK-10301",
  guest: "Surya",
  phone: "+91 47362 54654",
  room: "103 · Standard Room",
  checkIn: "01 Sep 2026",
  checkOut: "02 Sep 2026",
  nights: 1,
  pax: "2 Adults",
  source: "Direct Web",
  status: "Checked-out",
  amount: 8500,
  balance: 0
},
{
  id: "BK-20202",
  guest: "Aswini",
  phone: "+91 98840 20203",
  room: "202 · Deluxe Room",
  checkIn: "02 Sep 2026",
  checkOut: "05 Sep 2026",
  nights: 3,
  pax: "2 Adults",
  source: "Direct Web",
  status: "Checked-out",
  amount: 14500,
  balance: 0
},
{
  id: "BK-10202",
  guest: "Vamsi",
  phone: "+91 98765 10202",
  room: "102 · Standard Room",
  checkIn: "03 Sep 2026",
  checkOut: "05 Sep 2026",
  nights: 2,
  pax: "2 Adults",
  source: "Direct Web",
  status: "Confirmed",
  amount: 7000,
  balance: 0
},
{
  id: "BK-30101",
  guest: "Sai",
  phone: "+91 98765 10404",
  room: "301 · Executive Suite",
  checkIn: "03 Sep 2026",
  checkOut: "06 Sep 2026",
  nights: 3,
  pax: "2 Adults",
  source: "Booking.com",
  status: "Confirmed",
  amount: 21000,
  balance: 0
}];


export const guests = [
{
  id: "G-10301",
  name: "Surya",
  city: "Hyderabad",
  tier: "Silver",
  stays: 3,
  spend: 25500,
  lastStay: "01 Sep 2026",
  email: "surya@gmail.com"
},
{
  id: "G-10101",
  name: "Mounika",
  city: "Hyderabad",
  tier: "Gold",
  stays: 4,
  spend: 38400,
  lastStay: "02 Sep 2026",
  email: "mounika@gmail.com"
},
{
  id: "G-20202",
  name: "Aswini",
  city: "Hyderabad",
  tier: "Gold",
  stays: 5,
  spend: 43500,
  lastStay: "02 Sep 2026",
  email: "aswini@gmail.com"
},
{
  id: "G-10202",
  name: "Vamsi",
  city: "Hyderabad",
  tier: "Silver",
  stays: 2,
  spend: 14000,
  lastStay: "03 Sep 2026",
  email: "vamsi@gmail.com"
},
{
  id: "G-30101",
  name: "Sai",
  city: "Hyderabad",
  tier: "Platinum",
  stays: 6,
  spend: 63000,
  lastStay: "03 Sep 2026",
  email: "sai@gmail.com"
}];


export const staff = [
{ id: "E-101", name: "Vikram Rathore", role: "General Manager", shift: "General (9:00–18:00)", status: "On duty", phone: "+91 98290 11223" },
{ id: "E-114", name: "Sneha Deshpande", role: "Front Office Manager", shift: "Morning (7:00–15:00)", status: "On duty", phone: "+91 98290 44190" },
{ id: "E-127", name: "Imran Sheikh", role: "Receptionist", shift: "Evening (15:00–23:00)", status: "Off duty", phone: "+91 90045 77120" },
{ id: "E-133", name: "Lakshmi Menon", role: "Receptionist", shift: "Night (23:00–7:00)", status: "On leave", phone: "+91 90045 88231" },
{ id: "E-140", name: "Harpreet Singh", role: "Revenue Analyst", shift: "General (9:00–18:00)", status: "On duty", phone: "+91 98110 66334" }];


export const invoices = [
{ id: "INV-2026-10301", guest: "Surya", folio: "FOL-10301", date: "01 Sep 2026", amount: 8500, gst: 1296, status: "Paid", mode: "UPI" },
{ id: "INV-2026-10101", guest: "Mounika", folio: "FOL-10101", date: "02 Sep 2026", amount: 11400, gst: 1738, status: "Paid", mode: "Card" },
{ id: "INV-2026-20202", guest: "Aswini", folio: "FOL-20202", date: "02 Sep 2026", amount: 14500, gst: 2211, status: "Paid", mode: "UPI" },
{ id: "INV-2026-10202", guest: "Vamsi", folio: "FOL-10202", date: "03 Sep 2026", amount: 7000, gst: 1067, status: "Paid", mode: "Direct" },
{ id: "INV-2026-30101", guest: "Sai", folio: "FOL-30101", date: "03 Sep 2026", amount: 21000, gst: 3203, status: "Paid", mode: "NetBanking" }];


export const payments = [
{ id: "PAY-10301", guest: "Surya", mode: "UPI · @okhdfcbank", amount: 8500, time: "01 Sep, 12:12", status: "Success" },
{ id: "PAY-10101", guest: "Mounika", mode: "Card · HDFC ••4412", amount: 11400, time: "02 Sep, 14:40", status: "Success" },
{ id: "PAY-20202", guest: "Aswini", mode: "UPI · @okaxis", amount: 14500, time: "02 Sep, 15:05", status: "Success" },
{ id: "PAY-10202", guest: "Vamsi", mode: "UPI · @ybl", amount: 7000, time: "03 Sep, 11:30", status: "Success" },
{ id: "PAY-30101", guest: "Sai", mode: "NetBanking · ICICI", amount: 21000, time: "03 Sep, 10:15", status: "Success" }];


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
{ id: 1, title: "Rate parity alert — Goibibo", body: "Deluxe Room is ₹450 below direct rate.", time: "8 min ago", tone: "warning" },
{ id: 2, title: "Room 101 checked in", body: "Mounika, 2 nights stay active.", time: "22 min ago", tone: "success" },
{ id: 3, title: "Checkout Folio Settled", body: "₹8,500 settled for booking BK-10301 (Surya).", time: "1 hr ago", tone: "info" },
{ id: 4, title: "Housekeeping backlog", body: "2 rooms on Floor 1 pending inspection.", time: "2 hrs ago", tone: "error" }];


export const auditLogs = [
{ id: "L-88231", user: "vikram.rathore@hourstay.in", action: "Updated seasonal rate plan", entity: "Diwali Peak · Hyderabad", ip: "103.21.58.14", time: "01 Sep 2026, 18:42" },
{ id: "L-88230", user: "sneha.d@hourstay.in", action: "Completed checkout folio", entity: "BK-10301", ip: "103.21.58.22", time: "02 Sep 2026, 11:10" },
{ id: "L-88229", user: "superadmin@hourstay.in", action: "Synced property rooms", entity: "Hour Stay Rambagh", ip: "49.36.180.5", time: "02 Sep 2026, 12:03" },
{ id: "L-88228", user: "receptionist@hourstay.com", action: "Checked in guest", entity: "BK-10101", ip: "103.21.58.30", time: "02 Sep 2026, 14:28" }];


export const feedback = [
{ id: "R-551", guest: "Surya", rating: 5, title: "Spotless service", body: "The haveli courtyard breakfast was the highlight. Butler remembered our filter coffee order.", date: "02 Sep 2026", source: "Direct" },
{ id: "R-552", guest: "Mounika", rating: 4, title: "Great stay, swift check-in", body: "Room was lovely. Front desk team made check-in seamless.", date: "02 Sep 2026", source: "Google" },
{ id: "R-553", guest: "Aswini", rating: 5, title: "Wonderful experience", body: "The deluxe room was spotless and spacious. Will visit again.", date: "03 Sep 2026", source: "Direct" }];


export const arrivals = reservations.filter((r) => r.checkIn === "12 Aug 2026");
export const departures = reservations.filter((r) => r.checkOut === "13 Aug 2026" || r.checkOut === "12 Aug 2026");

const statuses = ["clean", "occupied", "dirty", "cleaning", "ooo", "blocked"];
const typeShort = ["Deluxe", "Premier", "Suite", "Villa"];
const guestNames = ["Surya", "Mounika", "Aswini", "Vamsi", "Sai", "—"];

export const rooms = Array.from({ length: 48 }, (_, i) => {
  const floor = Math.floor(i / 12) + 1;
  const num = `${floor}${String(i % 12 + 1).padStart(2, "0")}`;
  const status = statuses[(i * 7 + floor) % 6];
  return {
    number: num,
    floor,
    type: typeShort[i % 4],
    status,
    guest: status === "occupied" ? guestNames[i % 5] : "—",
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
{ id: "HS-JAI", name: "Hour Stay Rambagh Residency", city: "Jaipur", rating: 4.8, reviews: 1284, price: 8900, tags: ["Heritage haveli", "Courtyard pool", "High-speed WiFi"] },
{ id: "HS-UDA", name: "Hour Stay Lake Palace View", city: "Udaipur", rating: 4.9, reviews: 962, price: 14200, tags: ["Lake view", "Rooftop dining", "Spa"] },
{ id: "HS-GOA", name: "Hour Stay Candolim Beach Resort", city: "Goa", rating: 4.6, reviews: 2140, price: 11400, tags: ["Beachfront", "Kids club", "Sunset bar"] },
{ id: "HS-KER", name: "Hour Stay Backwater Retreat", city: "Alleppey", rating: 4.7, reviews: 738, price: 7600, tags: ["Backwaters", "Ayurveda", "Houseboat tour"] }];


export const myBookings = [
{ id: "BK-20101", hotel: "Hour Stay Rambagh Residency", city: "Hyderabad", room: "101 · Standard Room", dates: "22–24 Sep 2026", status: "Active", amount: 9500 },
{ id: "BK-10101", hotel: "Hour Stay Rambagh Residency", city: "Hyderabad", room: "102 · Standard Room", dates: "22–24 Sep 2026", status: "Active", amount: 11400 },
{ id: "BK-10301", hotel: "Hour Stay Rambagh Residency", city: "Hyderabad", room: "103 · Standard Room", dates: "01–02 Sep 2026", status: "Completed", amount: 8500 },
{ id: "BK-20202", hotel: "Hour Stay Rambagh Residency", city: "Hyderabad", room: "202 · Deluxe Room", dates: "02–05 Sep 2026", status: "Completed", amount: 14500 },
{ id: "BK-10202", hotel: "Hour Stay Rambagh Residency", city: "Hyderabad", room: "102 · Standard Room", dates: "25–27 Sep 2026", status: "Upcoming", amount: 7000 },
{ id: "BK-30101", hotel: "Hour Stay Rambagh Residency", city: "Hyderabad", room: "301 · Executive Suite", dates: "26–28 Sep 2026", status: "Upcoming", amount: 21000 }];


export const serviceRequests = [
{ id: "SR-4410", type: "Housekeeping", detail: "Extra towels and pillows", room: "312", status: "In progress", time: "10 min ago" },
{ id: "SR-4409", type: "In-room dining", detail: "Masala chai for two, 6:30 AM", room: "312", status: "Scheduled", time: "40 min ago" },
{ id: "SR-4402", type: "Concierge", detail: "Amber Fort cab at 8:00 AM", room: "312", status: "Completed", time: "Yesterday" }];