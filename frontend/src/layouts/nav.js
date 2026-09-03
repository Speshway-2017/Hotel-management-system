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
  User,
  Wrench
} from "lucide-react";

export const roleMeta = {
  "super-admin": {
    name: "Super Admin",
    person: "Nandini Rao Rao",
    caption: "Hour Stay Group · 6 properties",
    initials: "NRR"
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
    person: "Surya",
    caption: "Guest Member",
    initials: "SU"
  }
};

export const navByRole = {
  "super-admin": [
    {
      group: "",
      items: [
        { label: "Dashboard", to: "/super-admin", icon: LayoutDashboard },
        { label: "Operations", to: "/super-admin/properties", icon: CalendarCheck },
        { label: "Analytics & Reports", to: "/super-admin/reports", icon: TrendingUp },
        { label: "Access & Security", to: "/super-admin/users", icon: ShieldCheck },
        { label: "System", to: "/super-admin/branding", icon: Settings },
        { label: "Subscription", to: "/super-admin/subscription", icon: BadgeIndianRupee }
      ]
    }
  ],

  admin: [
    {
      group: "Admin Console",
      items: [
        { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
        { label: "Operations", to: "/admin/reservations", icon: CalendarCheck },
        { label: "Payments", to: "/admin/payments", icon: CreditCard },
        { label: "Management", to: "/admin/staff", icon: UserCog },
        { label: "Settings", to: "/admin/settings", icon: Settings }
      ]
    }
  ],

  manager: [
    {
      group: "Manager Console",
      items: [
        { label: "Dashboard", to: "/manager", icon: LayoutDashboard },
        { label: "Operations", to: "/manager/operations", icon: CalendarCheck },
        { label: "Management", to: "/manager/approvals", icon: UserCog },
        { label: "Feedback", to: "/manager/feedback", icon: MessageSquareHeart },
        { label: "Payments", to: "/manager/payments", icon: CreditCard }
      ]
    }
  ],

  reception: [
    {
      group: "Front Desk Console",
      items: [
        { label: "Dashboard", to: "/reception", icon: LayoutDashboard },
        { label: "Front Desk", to: "/reception/check-in", icon: ConciergeBell },
        { label: "Reservations", to: "/reception/reservations", icon: CalendarCheck },
        { label: "Payments", to: "/reception/payments", icon: CreditCard }
      ]
    }
  ],

  guest: [
    {
      group: "Guest Portal",
      items: [
        { label: "Dashboard", to: "/guest", icon: LayoutDashboard },
        { label: "My Bookings", to: "/guest/bookings", icon: CalendarCheck },
        { label: "Digital Folio", to: "/guest/folio", icon: FileText },
        { label: "Feedback", to: "/guest/reviews", icon: MessageSquareHeart },
        { label: "Settings", to: "/guest/settings", icon: Settings }
      ]
    }
  ]
};

export const gaugeIcon = Gauge;