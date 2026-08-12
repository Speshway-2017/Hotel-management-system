import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, Check, LayoutGrid, Receipt, RefreshCw, 
  Sparkles, HardHat, Smartphone, BarChart3 
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Hour Stay Hotel Management Suite" },
      {
        name: "description",
        content: "Room-status grid, reservations, seasonal rates, GST billing, channel manager, CRM and a guest app — every module in the Hour Stay suite."
      },
      { property: "og:title", content: "Features — Hour Stay" },
      { property: "og:description", content: "Every module in the Hour Stay hotel management suite." }
    ]
  }),
  component: Features
});

const featureTabs = [
  {
    id: "reservations",
    label: "Reservations & Booking",
    icon: CalendarDays,
    title: "Reservations & Bookings",
    description: "Take complete control of your room inventory. Smoothly handle front-desk walk-ins, digital direct bookings, group reservation holds, and OTA allocations in a unified grid.",
    points: [
      "Direct hotel bookings",
      "Walk-in registrations",
      "OTA reservation tags",
      "Group bookings & holds",
      "Cancellations & refunds",
      "Overbooking safeguards"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift w-full text-left font-ui">
        <div className="flex items-center justify-between border-b border-navy/5 pb-3 mb-4">
          <span className="text-xs font-bold text-navy uppercase">Reservation Stream</span>
          <span className="size-2 rounded-full bg-success animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-cream/40 border border-gold/30">
            <div>
              <p className="text-xs font-bold text-navy">Vikram Rathore</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Deluxe Haveli · Direct</p>
            </div>
            <span className="rounded bg-gold text-navy text-[8px] font-bold px-2 py-0.5">CONFIRMED</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-purple/5 border border-purple/10">
            <div>
              <p className="text-xs font-bold text-navy">Sunita Sharma</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Suite 302 · MakeMyTrip</p>
            </div>
            <span className="rounded bg-purple/10 text-purple text-[8px] font-bold px-2 py-0.5">OTA SYNC</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-navy/5 border border-navy/10">
            <div>
              <p className="text-xs font-bold text-navy">Amit Malhotra</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Royal Villa · Group Block</p>
            </div>
            <span className="rounded bg-navy/10 text-navy text-[8px] font-bold px-2 py-0.5">HOLD</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "frontdesk",
    label: "Front Desk Operations",
    icon: LayoutGrid,
    title: "Front Desk Operations",
    description: "Speed up check-in and check-out workflows. Track room status in real-time with visual clean/dirty flags, assign rooms instantly, capture guest IDs, and handle early check-ins.",
    points: [
      "Rapid check-in / check-out",
      "Auto room assignments",
      "Guest ID & Form C capture",
      "Room-status grid updates",
      "Early check-in logs",
      "Split billing folios"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift w-full text-left font-ui">
        <div className="flex items-center justify-between border-b border-navy/5 pb-3 mb-4">
          <span className="text-xs font-bold text-navy uppercase">Room Status Grid</span>
          <span className="text-[10px] text-muted-foreground">Floor 1</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-lg border border-success/30 bg-success/5">
            <p className="text-xs font-bold text-success">101 · Deluxe</p>
            <p className="text-[9px] text-success/80 mt-1 uppercase font-semibold">Clean / Vacant</p>
          </div>
          <div className="p-3.5 rounded-lg border border-navy/30 bg-navy/5">
            <p className="text-xs font-bold text-navy">102 · Suite</p>
            <p className="text-[9px] text-navy/80 mt-1 uppercase font-semibold">Occupied</p>
          </div>
          <div className="p-3.5 rounded-lg border border-warning/30 bg-warning/5">
            <p className="text-xs font-bold text-warning">103 · Haveli</p>
            <p className="text-[9px] text-warning/80 mt-1 uppercase font-semibold">Dirty / Check-out</p>
          </div>
          <div className="p-3.5 rounded-lg border border-purple/30 bg-purple/5">
            <p className="text-xs font-bold text-purple">104 · Suite</p>
            <p className="text-[9px] text-purple/80 mt-1 uppercase font-semibold">Cleaning</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "billing",
    label: "Billing & GST",
    icon: Receipt,
    title: "Billing & GST Compliance",
    description: "Generate GST-ready hotel invoices instantly. Calculate and split CGST, SGST, and IGST components automatically based on room rates and transaction types.",
    points: [
      "GST-ready invoice templates",
      "Automated CGST/SGST/IGST",
      "Multi-account folios",
      "Partial payment splits",
      "Corporate billing codes",
      "UPI payment reconciliation"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift w-full text-left font-ui">
        <div className="flex items-center justify-between border-b border-navy/5 pb-3 mb-4">
          <span className="text-xs font-bold text-navy uppercase">Folio #HS-8820</span>
          <span className="text-[9px] font-bold text-navy bg-gold px-1.5 py-0.5 rounded">GST ACTIVE</span>
        </div>
        <div className="space-y-2 text-xs text-navy">
          <div className="flex justify-between">
            <span>Room Tariff (3 Nights)</span>
            <span className="font-semibold">₹26,700.00</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>CGST @ 9%</span>
            <span>₹2,403.00</span>
          </div>
          <div className="flex justify-between text-muted-foreground border-b border-navy/5 pb-2">
            <span>SGST @ 9%</span>
            <span>₹2,403.00</span>
          </div>
          <div className="flex justify-between font-bold pt-1.5 text-sm text-purple">
            <span>Total Amount</span>
            <span>₹31,506.00</span>
          </div>
        </div>
        <div className="mt-4 bg-cream/40 p-2.5 rounded border border-gold/20 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">UPI Payment Received</span>
          <span className="text-[10px] font-bold text-success">Verified (UTR Ok)</span>
        </div>
      </div>
    )
  },
  {
    id: "ota",
    label: "OTA & Channel Sync",
    icon: RefreshCw,
    title: "OTA & Channel Synchronization",
    description: "Say goodbye to double bookings. Instantly sync rates and room availability across MakeMyTrip, Goibibo, Booking.com, and Agoda in real-time.",
    points: [
      "2-way inventory updates",
      "MakeMyTrip integration",
      "Booking.com inventory sync",
      "Agoda channel connection",
      "Goibibo rate synchronization",
      "Instant rate parity alerts"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift w-full text-left font-ui">
        <div className="flex items-center justify-between border-b border-navy/5 pb-3 mb-4">
          <span className="text-xs font-bold text-navy uppercase">OTA Channel Sync</span>
          <span className="flex items-center gap-1 text-[9px] text-success font-semibold">
            <RefreshCw className="size-2.5 animate-spin" /> Live Sync
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-navy">MakeMyTrip</span>
            <span className="text-success text-[10px] font-bold bg-success/5 border border-success/15 px-2 py-0.5 rounded">Synced</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-navy">Booking.com</span>
            <span className="text-success text-[10px] font-bold bg-success/5 border border-success/15 px-2 py-0.5 rounded">Synced</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-navy">Agoda</span>
            <span className="text-success text-[10px] font-bold bg-success/5 border border-success/15 px-2 py-0.5 rounded">Synced</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-navy/5 pt-2.5 mt-2">
            <span className="text-[10px] text-muted-foreground">Rate Parity Audit</span>
            <span className="text-[10px] text-success font-bold">No Discrepancies</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "housekeeping",
    label: "Housekeeping & Maintenance",
    icon: HardHat,
    title: "Housekeeping & Maintenance",
    description: "Streamline daily room cleanings. Assign cleaning tasks to personnel, track maintenance tickets, and mark out-of-order rooms in seconds.",
    points: [
      "Cleaning status tracking",
      "Staff task allocation",
      "Maintenance ticket logs",
      "Out-of-order management",
      "Real-time front desk updates",
      "Linen usage checklists"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift w-full text-left font-ui">
        <div className="flex items-center justify-between border-b border-navy/5 pb-3 mb-4">
          <span className="text-xs font-bold text-navy uppercase">Staff Tasks</span>
          <span className="text-[10px] text-muted-foreground">Today</span>
        </div>
        <div className="space-y-3.5 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded bg-cream/40 border border-gold/10">
            <input type="checkbox" defaultChecked className="accent-gold rounded" readOnly />
            <span className="line-through text-muted-foreground">Deep clean Room 204</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded bg-cream/40 border border-gold/10">
            <input type="checkbox" defaultChecked className="accent-gold rounded" readOnly />
            <span className="line-through text-muted-foreground">Linen change Room 102</span>
          </div>
          <div className="flex items-center gap-2.5 p-2 rounded">
            <input type="checkbox" className="accent-gold rounded" readOnly />
            <span className="font-semibold text-navy">AC filter check Room 112</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "guest",
    label: "Guest Experience",
    icon: Smartphone,
    title: "Guest App & Experience",
    description: "Offer guests a modern mobile experience. Give them access to pre-check-in documents, online service requests, digital invoices, and simple feedback prompts.",
    points: [
      "Mobile pre-check-in",
      "UPI payment triggers",
      "In-room dining requests",
      "Digital folio copies",
      "Instant feedback stars",
      "Loyalty tier rewards"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift max-w-[250px] mx-auto w-full text-left font-ui">
        <div className="bg-navy p-3 text-cream -mx-6 -mt-6 mb-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider">Guest WebApp</span>
          <span className="text-[9px] text-gold font-bold bg-gold/15 px-1.5 py-0.5 rounded">Silver Member</span>
        </div>
        <p className="text-[10px] text-muted-foreground">Welcome back,</p>
        <p className="text-xs font-bold text-navy">Vikram Rathore</p>
        <div className="mt-4 space-y-2">
          <div className="bg-cream/40 p-2.5 rounded border border-gold/25 text-center">
            <p className="text-[10px] text-navy font-semibold">Pre check-in Completed</p>
          </div>
          <div className="bg-purple/5 p-2.5 rounded border border-purple/15 text-center">
            <p className="text-[10px] text-purple font-semibold">Request Room Service</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "analytics",
    label: "Reports & Analytics",
    icon: BarChart3,
    title: "Reports & Performance Metrics",
    description: "Unlock actionable hotel insights. Export audit logs, track seasonal occupancy rates, and measure average daily rates (ADR) and RevPAR to maximize yield.",
    points: [
      "Real-time occupancy trends",
      "ADR & RevPAR dashboards",
      "Booking source breakdown",
      "Daily night audit reports",
      "Tax reporting summaries",
      "Excel/PDF MIS exports"
    ],
    mockup: (
      <div className="relative rounded-2xl border border-navy/5 bg-white p-6 shadow-lift w-full text-left font-ui">
        <div className="flex items-center justify-between border-b border-navy/5 pb-3 mb-4">
          <span className="text-xs font-bold text-navy uppercase">Performance Metrics</span>
          <span className="text-[9px] text-purple font-bold bg-purple/15 px-1.5 py-0.5 rounded">MIS AUDIT</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground">Occupancy</p>
            <p className="text-sm font-bold text-navy">84.2%</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">ADR</p>
            <p className="text-sm font-bold text-navy">₹9,200</p>
          </div>
        </div>
        <svg className="w-full h-12 text-purple" viewBox="0 0 100 30" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 25C10 20 20 5 30 15C40 25 50 10 60 5C70 0 80 18 100 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    )
  }
];

function Features() {
  const [activeIdx, setActiveIdx] = useState(0);
  const currentTab = featureTabs[activeIdx];
  const Icon = currentTab.icon;

  return (
    <SiteLayout>
      {/* Premium Hero Section */}
      <section className="relative w-full overflow-hidden bg-navy py-20 lg:py-24">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(91,33,182,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(245,192,106,0.08),transparent_50%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-semibold tracking-wider text-gold uppercase font-ui">
            <Sparkles className="size-3 text-gold" /> System Capabilities
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.15] font-bold text-cream sm:text-6xl max-w-4xl mx-auto">
            Everything you need to run your hotel, <span className="text-[#F5C06A]">in one place</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cream/70 sm:text-xl font-ui">
            Hour Stay unifies your operations, syncs your channels, and manages your billing in an intuitive, calm operating system designed specifically for Indian hospitality.
          </p>
        </div>
      </section>

      {/* Interactive Tabs Explorer Section */}
      <section className="bg-cream py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[280px_1fr] items-start">
            
            {/* Left Column (Vertical Tabs Menu) */}
            <div className="flex flex-row overflow-x-auto gap-2 pb-4 lg:pb-0 lg:flex-col lg:overflow-visible">
              {featureTabs.map((tab, idx) => {
                const TabIcon = tab.icon;
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveIdx(idx)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-semibold whitespace-nowrap transition-all duration-300 border cursor-pointer ${
                      isActive 
                        ? "bg-navy text-cream border-navy shadow-lift" 
                        : "bg-white text-navy/70 border-navy/5 hover:border-gold/30 hover:bg-gold/5"
                    }`}
                  >
                    <TabIcon className={`size-4.5 ${isActive ? "text-gold" : "text-purple"}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right Column (Dynamic Showcase Content Card) */}
            <div className="rounded-2xl border border-navy/5 bg-white p-6 sm:p-10 shadow-lift transition-all duration-500 animate-fade-in">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                
                {/* Details Side */}
                <div className="space-y-6 text-left">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-purple/10 text-purple">
                    <Icon className="size-6" />
                  </span>
                  <div>
                    <h2 className="font-display text-2xl font-bold tracking-tight text-navy sm:text-3xl">
                      {currentTab.title}
                    </h2>
                    <p className="mt-4 text-sm sm:text-base leading-relaxed text-muted-foreground font-ui">
                      {currentTab.description}
                    </p>
                  </div>
                  
                  <ul className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-navy/5">
                    {currentTab.points.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-xs sm:text-sm text-navy font-semibold font-ui">
                        <Check className="size-4 text-purple shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Dashboard Mockup Side */}
                <div className="flex items-center justify-center bg-cream/30 p-6 rounded-2xl border border-navy/5 min-h-[250px]">
                  <div className="w-full max-w-sm">
                    {currentTab.mockup}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

    </SiteLayout>
  );
}