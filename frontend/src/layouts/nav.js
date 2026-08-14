import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Bell,
  Bed,
  Building2,
  CalendarCheck,
  CalendarClock,
  ClipboardCheck,
  ConciergeBell,
  CreditCard,
  FileText,
  Gauge,
  Gift,
  Grid3x3,
  Heart,
  IdCard,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  MessageSquareHeart,
  Percent,
  Receipt,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserCog,
  Users,
  Wrench } from
"lucide-react";






export const roleMeta =


{
  "super-admin": {
    name: "Super Admin",
    person: "Nandini Rao",
    caption: "Hour Stay Group · 6 properties",
    initials: "NR"
  },
  admin: {
    name: "Admin / Owner",
    person: "Vikram Rathore",
    caption: "Rambagh Residency, Jaipur",
    initials: "VR"
  },
  manager: {
    name: "Manager",
    person: "Sneha Deshpande",
    caption: "Front Office · Jaipur",
    initials: "SD"
  },
  reception: {
    name: "Front Desk",
    person: "Imran Sheikh",
    caption: "Reception · Shift 15:00–23:00",
    initials: "IS"
  },
  guest: {
    name: "Guest",
    person: "Aarav Mehta",
    caption: "Platinum member · 24 stays",
    initials: "AM"
  }
};

export const navByRole = {
  "super-admin": [
    {
      group: "Super Admin Panel",
      items: [
        { label: "Dashboard", to: "/super-admin", icon: LayoutDashboard },
        { label: "Property Management", to: "/super-admin/properties", icon: Building2 },
        { label: "Operations", to: "/super-admin/reservations", icon: CalendarCheck },
        { label: "Analytics & Reports", to: "/super-admin/occupancy", icon: TrendingUp },
        { label: "Access & Security", to: "/super-admin/users", icon: ShieldCheck },
        { label: "Integrations", to: "/super-admin/channel-manager", icon: Activity },
        { label: "System", to: "/super-admin/branding", icon: Settings }
      ]
    }
  ],

  admin: [
  {
    group: "Overview",
    items: [
    { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
    { label: "Front Desk Overview", to: "/admin/front-desk", icon: ConciergeBell },
    { label: "Reports & Analytics", to: "/admin/reports", icon: BarChart3 }]

  },
  {
    group: "Inventory",
    items: [
    { label: "Rooms & Room Types", to: "/admin/rooms", icon: Bed },
    { label: "Rates & Seasons", to: "/admin/rates", icon: CalendarClock },
    { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
    { label: "OTA / Channels", to: "/admin/channels", icon: Activity }]

  },
  {
    group: "Revenue",
    items: [
    { label: "Billing & Invoices", to: "/admin/billing", icon: Receipt },
    { label: "Payments", to: "/admin/payments", icon: CreditCard },
    { label: "Discounts & Refunds", to: "/admin/approvals", icon: Percent },
    { label: "Taxes & GST", to: "/admin/taxes", icon: FileText }]

  },
  {
    group: "People",
    items: [
    { label: "Guests / CRM", to: "/admin/guests", icon: Users },
    { label: "Staff Management", to: "/admin/staff", icon: UserCog },
    { label: "Notifications", to: "/admin/notifications", icon: Bell },
    { label: "Settings", to: "/admin/settings", icon: Settings }]

  }],

  manager: [
  {
    group: "Today",
    items: [
    { label: "Dashboard", to: "/manager", icon: LayoutDashboard },
    { label: "Arrivals & Departures", to: "/manager/arrivals", icon: CalendarCheck },
    { label: "Room Status", to: "/manager/room-status", icon: Grid3x3 }]

  },
  {
    group: "Performance",
    items: [
    { label: "Occupancy & Revenue", to: "/manager/occupancy", icon: TrendingUp },
    { label: "Reservations", to: "/manager/reservations", icon: CalendarClock },
    { label: "Reports", to: "/manager/reports", icon: BarChart3 }]

  },
  {
    group: "Team & Guests",
    items: [
    { label: "Guests / CRM", to: "/manager/guests", icon: Users },
    { label: "Approvals", to: "/manager/approvals", icon: ClipboardCheck },
    { label: "Staff Shifts", to: "/manager/shifts", icon: UserCog },
    { label: "Guest Feedback", to: "/manager/feedback", icon: MessageSquareHeart },
    { label: "Notifications", to: "/manager/notifications", icon: Bell }]

  }],

  reception: [
  {
    group: "Front Desk",
    items: [
    { label: "Room Status Grid", to: "/reception", icon: Grid3x3 },
    { label: "Reservations", to: "/reception/reservations", icon: CalendarCheck },
    { label: "New / Walk-in", to: "/reception/new-booking", icon: CalendarClock },
    { label: "Guest Search", to: "/reception/guest-search", icon: Search }]

  },
  {
    group: "Stay Flow",
    items: [
    { label: "Check-in", to: "/reception/check-in", icon: LogIn },
    { label: "ID Capture", to: "/reception/id-capture", icon: IdCard },
    { label: "Room Assignment", to: "/reception/room-assignment", icon: KeyRound },
    { label: "Check-out", to: "/reception/check-out", icon: LogOut }]

  },
  {
    group: "Money & Service",
    items: [
    { label: "Folio & Billing", to: "/reception/folio", icon: Receipt },
    { label: "Payments", to: "/reception/payments", icon: CreditCard },
    { label: "Maintenance", to: "/reception/maintenance", icon: Wrench },
    { label: "Notifications", to: "/reception/notifications", icon: Bell }]

  }],

  guest: [
  {
    group: "Your Stay",
    items: [
    { label: "Home", to: "/guest", icon: LayoutDashboard },
    { label: "My Bookings", to: "/guest/bookings", icon: CalendarCheck },
    { label: "Pre Check-in", to: "/guest/pre-check-in", icon: ClipboardCheck },
    { label: "Service Requests", to: "/guest/services", icon: ConciergeBell }]

  },
  {
    group: "Book",
    items: [
    { label: "Search Availability", to: "/guest/search", icon: Search },
    { label: "Booking", to: "/guest/booking", icon: Bed },
    { label: "Payment", to: "/guest/payment", icon: CreditCard }]

  },
  {
    group: "Account",
    items: [
    { label: "Digital Folio", to: "/guest/folio", icon: Receipt },
    { label: "Loyalty", to: "/guest/loyalty", icon: Gift },
    { label: "Reviews", to: "/guest/reviews", icon: Star },
    { label: "Profile", to: "/guest/profile", icon: Heart },
    { label: "Notifications", to: "/guest/notifications", icon: Bell }]

  }]

};

export const gaugeIcon = Gauge;