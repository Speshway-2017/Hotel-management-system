import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Check, ArrowRight, CalendarDays, 
  LayoutGrid, Receipt, RefreshCw, HardHat, 
  Smartphone, BarChart3, Building2, Hotel, Compass, Wallet 
} from "lucide-react";

// Import Resort Images for Visual Assets
import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import beachImg from "@/assets/beach_goa.png";
import retreatImg from "@/assets/retreat_kerala.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Hour Stay — Hospitality software from Jaipur" },
      {
        name: "description",
        content: "Hour Stay is built by hoteliers and engineers in Jaipur for Indian properties — heritage havelis, city hotels and coastal resorts."
      },
      { property: "og:title", content: "About Hour Stay" },
      { property: "og:description", content: "Hospitality software built by hoteliers in Jaipur." }
    ]
  }),
  component: About
});

function About() {
  return (
    <SiteLayout>
      {/* 1. Hero Section */}
      <section className="relative bg-navy py-20 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(91,33,182,0.15),transparent_50%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="text-left space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-semibold tracking-wider text-gold uppercase font-ui">
                <Sparkles className="size-3 text-gold" /> Our Identity
              </span>
              <h1 className="font-display text-4xl leading-[1.1] font-bold text-cream sm:text-5xl lg:text-6xl">
                Built for the way <span className="text-[#F5C06A]">Indian hospitality</span> works.
              </h1>
              <p className="text-base leading-relaxed text-cream/70 sm:text-lg font-ui">
                We believe in technology that respects the hustle behind the desk. Hour Stay is engineered to simplify operations, remove dashboard clutter, and streamline guest management.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-cream/10 shadow-lift group">
                <img 
                  src={palaceImg} 
                  alt="Udaipur palace heritage resort running Hour Stay" 
                  className="w-full h-80 lg:h-96 object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Our Story Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 text-left">
          <div className="grid gap-8 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="text-xs font-bold uppercase tracking-widest text-purple">The Journey</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy">Our Story</h2>
            </div>
            <div className="lg:col-span-8 space-y-6 text-base text-muted-foreground font-ui leading-relaxed">
              <p>
                Hour Stay began with a simple observation: most hotel management software is too complicated. Properties were forced to juggle separate systems for front desk check-ins, guest billing, housekeeping lists, and OTA channel managers.
              </p>
              <p>
                We set out to rebuild this stack from scratch. Hour Stay is a unified, cloud-based Hotel Management System that connects **reservations, front desk check-in/out, GST billing, housekeeping tasks, guest mobile apps, and analytics** in one cohesive platform.
              </p>
              <p>
                Today, properties across India use Hour Stay to run clean, efficient, and profitable operations without the operational noise of legacy tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Hour Stay Section */}
      <section className="bg-cream py-20 border-t border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Core Pillars</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Why Indian hotels run on Hour Stay
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: LayoutGrid,
                title: "Simple Operations",
                desc: "An intuitive check-in grid that requires zero learning curve for new reception desk staff."
              },
              {
                icon: CalendarDays,
                title: "Connected Workflows",
                desc: "Seamless operations connecting your booking desk, housekeeping team, and billing folios instantly."
              },
              {
                icon: Receipt,
                title: "GST-Ready Billing",
                desc: "Automatic split tax invoices generating accurate CGST, SGST, and IGST breakdowns dynamically."
              },
              {
                icon: Wallet,
                title: "UPI-First Payments",
                desc: "Native Indian payment flows via quick UPI QR generation and instant automated reconciliation."
              },
              {
                icon: RefreshCw,
                title: "Direct & OTA Bookings",
                desc: "Real-time 2-way channel sync avoiding double bookings across MakeMyTrip, Booking.com, and Agoda."
              },
              {
                icon: Smartphone,
                title: "Better Guest Experience",
                desc: "Mobile-first pre check-in sheets, custom service requests, and digital bills."
              }
            ].map((p, idx) => {
              const PillarIcon = p.icon;
              return (
                <div key={idx} className="card-guest border border-navy/5 bg-white p-6 text-left shadow-soft hover:-translate-y-1 transition-all duration-300">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-purple/10 text-purple mb-4">
                    <PillarIcon className="size-5" />
                  </span>
                  <h3 className="font-display text-lg font-bold text-navy">{p.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-ui leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Built for Indian Hospitality Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Engineered For Scale</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Powering diverse property structures
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              { label: "Hotels", desc: "City business hotels and luxury boutique properties.", img: jaipurImg },
              { label: "Resorts", desc: "Sprawling coastal properties and hill retreats.", img: beachImg },
              { label: "Boutique Havelis", desc: "Historic palaces requiring custom room architectures.", img: palaceImg },
              { label: "Multi-Property Chains", desc: "Centrally managed portfolios and transit keys.", img: retreatImg }
            ].map((cat, idx) => (
              <div key={idx} className="group overflow-hidden rounded-xl border border-navy/5 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="h-44 overflow-hidden relative">
                  <img src={cat.img} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 font-display text-lg font-bold text-cream">{cat.label}</h3>
                </div>
                <div className="p-4 text-left font-ui">
                  <p className="text-xs text-muted-foreground leading-relaxed">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. One Platform, Every Operation Section */}
      <section className="bg-cream py-20 border-t border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Operational Cycle</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              One platform, every operation
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-sm text-muted-foreground font-ui">
              See how reservations, front desk check-in, housekeeping tasks, billing invoices, and guest experience components link together in one closed loop.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5 text-center font-ui">
            {[
              { step: "01", icon: CalendarDays, label: "Reservations", desc: "Direct/OTA booking incoming" },
              { step: "02", icon: LayoutGrid, label: "Front Desk", desc: "ID capture and room assign" },
              { step: "03", icon: HardHat, label: "Housekeeping", desc: "Auto clean/dirty status toggle" },
              { step: "04", icon: Receipt, label: "GST Billing", desc: "UPI invoice folio creation" },
              { step: "05", icon: Smartphone, label: "Guest App", desc: "Pre-check-in & digital key" }
            ].map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div key={idx} className="relative bg-white border border-navy/5 p-5 rounded-xl shadow-soft">
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-gold">{item.step}</span>
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-purple/10 text-purple mb-4">
                    <ItemIcon className="size-5" />
                  </span>
                  <h4 className="text-sm font-bold text-navy">{item.label}</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-normal">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. System Roles & Platform Targets Section */}
      <section className="bg-white py-20 border-t border-navy/5 animate-fade-up">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-left">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Platform Matrix</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              System Roles & Platform Targets
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-sm text-muted-foreground font-ui">
              Hour Stay is designed with dedicated workspaces tailored for every role in Indian hotel operations.
            </p>
          </div>

          {/* User Roles Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
            {[
              {
                role: "Super Admin",
                desc: "Multi-property management, central audits, global channel sync, and group policies.",
                device: "Desktop & Mobile Monitor"
              },
              {
                role: "Admin / Owner",
                desc: "Property rate setup, tax parameters, staff directories, and financial dashboard reports.",
                device: "Desktop / Laptop"
              },
              {
                role: "Manager",
                desc: "Shift scheduling, discount approvals, arrivals list monitoring, and complaint resolutions.",
                device: "Mobile & Web Portal"
              },
              {
                role: "Receptionist",
                desc: "Express walk-ins, digital Aadhaar OCR capture, folio check-out settlements, and room assignment.",
                device: "Front Desk Console (Web/Tablet)"
              },
              {
                role: "Housekeeping",
                desc: "Real-time clean/dirty status toggle, linen allocations, supervisor sync, and room deep-cleans.",
                device: "Mobile App (Android-first)"
              },
              {
                role: "Maintenance Staff",
                desc: "Room out-of-order logs, technical repair checklists, and facility ticketing operations.",
                device: "Mobile App (Android-first)"
              },
              {
                role: "Accountant",
                desc: "GST invoices, corporate credit limits, CA audits, and payment gateway ledger adjustments.",
                device: "Web Dashboard (Desktop-only)"
              },
              {
                role: "Guest / Customer",
                desc: "Direct booking engine, dynamic check-in, digital check-out, and pre check-in sheets.",
                device: "Responsive Mobile Web"
              },
              {
                role: "Travel Agent / Corporate",
                desc: "Negotiated contract pricing lists, corporate credit limits, and historical booking indexes.",
                device: "Web Partner Portal"
              }
            ].map((r, idx) => (
              <div key={idx} className="card-guest border border-navy/5 bg-cream/20 p-5 rounded-xl shadow-soft font-ui">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-sans text-sm font-bold text-navy">{r.role}</h3>
                  <span className="text-[10px] font-semibold text-purple bg-purple/10 px-2 py-0.5 rounded-full">{r.device}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>

          {/* Platform Targets Table */}
          <div className="border border-navy/5 rounded-xl bg-white shadow-soft overflow-hidden p-6 font-ui">
            <h3 className="font-display text-lg font-bold text-navy mb-4">Role Permission & Device Access Matrix</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-3 text-left">Operational Role</th>
                    <th className="p-3 text-left">Primary Device Target</th>
                    <th className="p-3 text-center">Configure Rates</th>
                    <th className="p-3 text-center">Manage Staff</th>
                    <th className="p-3 text-center">Approve Refunds</th>
                    <th className="p-3 text-center">Tax / Financials</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {[
                    { role: "Super Admin", target: "Web dashboard + Mobile app", rates: "Yes", staff: "Yes", refunds: "Yes", tax: "Yes" },
                    { role: "Admin / Owner", target: "Web dashboard + Mobile app", rates: "Yes", staff: "Yes", refunds: "Yes", tax: "Yes" },
                    { role: "General Manager", target: "Web + Mobile app", rates: "Limited", staff: "Limited", refunds: "Yes", tax: "Yes" },
                    { role: "Receptionist", target: "Tablet or Desk Console", rates: "No", staff: "No", refunds: "No", tax: "No" },
                    { role: "Housekeeping", target: "Android Smartphone", rates: "No", staff: "No", refunds: "No", tax: "No" },
                    { role: "Maintenance", target: "Android Smartphone", rates: "No", staff: "No", refunds: "No", tax: "No" },
                    { role: "Accountant", target: "Desktop / Laptop", rates: "No", staff: "No", refunds: "No", tax: "Yes" },
                    { role: "Guest / Customer", target: "Mobile app + Website", rates: "No", staff: "No", refunds: "No", tax: "No" },
                    { role: "Travel Agent / Corporate", target: "Web portal (responsive)", rates: "No", staff: "No", refunds: "No", tax: "No" }
                  ].map((row, idx) => (
                    <tr key={idx} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3 font-semibold text-navy">{row.role}</td>
                      <td className="p-3 text-muted-foreground">{row.target}</td>
                      <td className="p-3 text-center font-medium">{row.rates}</td>
                      <td className="p-3 text-center font-medium">{row.staff}</td>
                      <td className="p-3 text-center font-medium">{row.refunds}</td>
                      <td className="p-3 text-center font-medium">{row.tax}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}