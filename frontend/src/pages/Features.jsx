import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
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

function Features() {
  const [dbFeatures, setDbFeatures] = useState([]);

  useEffect(() => {
    publicService.getFeatures()
      .then(res => {
        if (res.success && res.data) {
          setDbFeatures(res.data);
        }
      })
      .catch(err => {});
  }, []);

  const staticFeatures = [
    {
      title: "01. Reservation & Booking",
      desc: "Direct booking engine, live availability search, tax-inclusive rate selectors, group reservations, and source tags.",
      points: ["Dynamic rate calendars", "MMT / Agoda parity alerts", "Deposit adjustments"]
    },
    {
      title: "02. Front Desk Console",
      desc: "Walk-in management, digital Aadhaar OCR capture, Form C registration cards, auto room suggestion, and check-out checkout.",
      points: ["Real-time status grid", "Offline mode sync", "Shift handovers"]
    },
    {
      title: "03. Housekeeping App",
      desc: "Mobile task assignment lists, status lifecycles, real-time sync with front desk, and lost & found logs.",
      points: ["Linen tracking", "Auto-dirty toggle on check-out", "Turnaround metrics"]
    },
    {
      title: "04. Room & Rate Master",
      desc: "Configurable dynamic/demand pricing, seasonal calendars, peak day rules, rate plans, and bulk allocation changes.",
      points: ["Negotiated rate plans", "Owner occupancy blocks", "Room type limits"]
    },
    {
      title: "05. Invoicing & Billing",
      desc: "GST split billing (CGST, SGST, IGST), SAC code compliance, master folios, corporate tag splits, and refund credits.",
      points: ["Automatic tax-slab mapping", "Invoice WhatsApp dispatch", "Outstanding ledger"]
    },
    {
      title: "06. Unified Payments",
      desc: "UPI dynamic QR codes, integrated card payments, net banking, automated Settlements, and original payment refunds.",
      points: ["Instant UPI verification", "Partial checks tracking", "Commission-free payments"]
    },
    {
      title: "07. POS Integrations",
      desc: "In-house restaurant dining bills, bar/spa outlet charges, laundry postings, and room service order folio links.",
      points: ["Unified POS reports", "Direct checkout mapping", "Outlet commission audits"]
    },
    {
      title: "08. Guest CRM & Loyalty",
      desc: "Central guest profiles, stay logs, preferences notes, loyalty tier points, and repeat guest marketing offers.",
      points: ["Personalized check-in", "Blacklist tags", "Occasion notifications"]
    },
    {
      title: "09. Maintenance Tickets",
      desc: "Guest-initiated service requests via mobile app (housekeeping, room service, maintenance), ticketing assignments, and SLAs.",
      points: ["Out-of-order inventory hold", "Staff assignment notifications", "Problem details photo logs"]
    },
    {
      title: "10. Staff Roster & Shifts",
      desc: "Granular role-based accounts, geo-tagged mobile attendance sheets, shift rosters, and performance indexes.",
      points: ["Biometric optional link", "Salary/wage calculations", "Shift handover logs"]
    },
    {
      title: "11. Reports & Analytics",
      desc: "Consolidated occupancy charts, RevPAR, ADR logs, statutory tax summaries, and multi-branch benchmarks.",
      points: ["Custom PDF/CSV export", "Payment gateway audits", "YoY comparative graphs"]
    },
    {
      title: "12. Channel Sync Manager",
      desc: "Centralized room pushes, rate parity conflict flags, commission percentages tracking, and instant stop-sells.",
      points: ["2-way API synchronization", "MMT, Goibibo, Booking.com", "Overbooking safeguards"]
    },
    {
      title: "13. Multi-Property Hub",
      desc: "Centralized Super Admin console, cross-property guest tracking, central catalog sync, and central invoicing.",
      points: ["Branch comparisons", "Centrally pushed rate plans", "Consolidated tax ledger"]
    },
    {
      title: "14. Smart Notifications",
      desc: "SMS reminders, WhatsApp API confirmations, digital invoice dispatches, and internal staff alert pushes.",
      points: ["Low inventory notifications", "AC/pest maintenance alerts", "Payment confirmations"]
    },
    {
      title: "15. Guest Self-Service",
      desc: "Mobile check-in ID uploads, digital room keys, in-stay service requests, and digital folio access.",
      points: ["Contactless entry", "Check-out request", "Front desk chat support"]
    },
    {
      title: "16. Post-Stay Feedback",
      desc: "Automated WhatsApp feedback request logs, guest review dashboard, and review responses templates.",
      points: ["Google Business hooks", "Sentiment trend reports", "Issue resolution alerts"]
    },
    {
      title: "17. Travel Agent Portal",
      desc: "Partner logins, contract rate pricing bookings, credit invoice registers, and agent commissions records.",
      points: ["Agent performance matrix", "Direct credit settlement", "Commission tracking logs"]
    },
    {
      title: "18. Security & Audit Logs",
      desc: "Role-based access controls, two-factor logins (2FA), encrypted PII storage, and full database audit trails.",
      points: ["Discount audit logs", "Session timeout guards", "Data export alerts"]
    },
    {
      title: "19. Localizations",
      desc: "Regional Indian languages localization (Hindi, etc.), multi-currency converters, and language parameters per guest.",
      points: ["Dynamic exchange rates", "Invoice regional text", "Staff dashboard translations"]
    }
  ];

  const featuresToRender = dbFeatures.length > 0
    ? dbFeatures.map((f, idx) => ({
        title: `${String(idx + 1).padStart(2, "0")}. ${f.title}`,
        desc: f.excerpt,
        points: f.tag ? f.tag.split(", ") : ["Dynamic system module", "Synchronized live via CMS"]
      }))
    : staticFeatures;

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

      {/* Complete Product Feature Directory Section */}
      <section className="bg-cream py-20 border-t border-navy/5 animate-fade-up">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple font-ui">Complete Directory</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              All Platform Modules & Features
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-sm text-muted-foreground font-ui">
              Explore the exhaustive list of modules built to handle every dimension of modern hospitality operations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 text-left font-ui">
            {featuresToRender.map((mod, idx) => (
              <div key={idx} className="card-guest border border-navy/5 bg-white p-6 rounded-xl shadow-soft flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                <div>
                  <h3 className="font-display text-sm font-bold text-navy border-b border-navy/5 pb-2 mb-3">{mod.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{mod.desc}</p>
                </div>
                <ul className="space-y-1.5 pt-2 border-t border-navy/5">
                  {mod.points.map((pt, pIdx) => (
                    <li key={pIdx} className="flex items-center gap-1.5 text-[11px] font-semibold text-navy">
                      <span className="size-1 rounded-full bg-purple" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}