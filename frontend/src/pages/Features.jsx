import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { 
  CalendarDays, Check, LayoutGrid, Receipt, RefreshCw, 
  Sparkles, HardHat, Smartphone, BarChart3, CheckCircle2,
  Building2, ShieldCheck, ArrowRight, Layers, AlertCircle,
  CreditCard, UtensilsCrossed, Users, Wrench, Clock,
  Bell, Star, Briefcase, Languages
} from "lucide-react";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features & Pricing — Hour Stay Hotel Management Suite" },
      {
        name: "description",
        content: "Explore platform modules, room-status grids, seasonal rates, GST billing, and active subscription plans for hotels and resorts."
      },
      { property: "og:title", content: "Features & Pricing — Hour Stay" },
      { property: "og:description", content: "Every module and transparent subscription tier in the Hour Stay suite." }
    ]
  }),
  component: Features
});

const FEATURE_CARD_PALETTES = [
  {
    // Royal Purple
    backBg: "bg-[#7C3AED]/12",
    backBorder: "border-[#7C3AED]/25",
    accentGlow: "rgba(124, 58, 237, 0.18)",
    iconBg: "bg-[#7C3AED]/10 text-[#7C3AED]",
    badgeBg: "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/25",
    bullet: "#7C3AED",
    hoverTitle: "group-hover:text-[#7C3AED]",
  },
  {
    // Ocean Sky Blue
    backBg: "bg-[#0284C7]/12",
    backBorder: "border-[#0284C7]/25",
    accentGlow: "rgba(2, 132, 199, 0.18)",
    iconBg: "bg-[#0284C7]/10 text-[#0284C7]",
    badgeBg: "bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/25",
    bullet: "#0284C7",
    hoverTitle: "group-hover:text-[#0284C7]",
  },
  {
    // Warm Amber / Gold
    backBg: "bg-[#D97706]/12",
    backBorder: "border-[#D97706]/25",
    accentGlow: "rgba(217, 119, 6, 0.18)",
    iconBg: "bg-[#D97706]/10 text-[#D97706]",
    badgeBg: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/25",
    bullet: "#D97706",
    hoverTitle: "group-hover:text-[#D97706]",
  },
  {
    // Emerald Green
    backBg: "bg-[#059669]/12",
    backBorder: "border-[#059669]/25",
    accentGlow: "rgba(5, 150, 105, 0.18)",
    iconBg: "bg-[#059669]/10 text-[#059669]",
    badgeBg: "bg-[#059669]/10 text-[#059669] border-[#059669]/25",
    bullet: "#059669",
    hoverTitle: "group-hover:text-[#059669]",
  },
  {
    // Coral Rose
    backBg: "bg-[#E11D48]/12",
    backBorder: "border-[#E11D48]/25",
    accentGlow: "rgba(225, 29, 72, 0.18)",
    iconBg: "bg-[#E11D48]/10 text-[#E11D48]",
    badgeBg: "bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/25",
    bullet: "#E11D48",
    hoverTitle: "group-hover:text-[#E11D48]",
  },
  {
    // Periwinkle Indigo
    backBg: "bg-[#4F46E5]/12",
    backBorder: "border-[#4F46E5]/25",
    accentGlow: "rgba(79, 70, 229, 0.18)",
    iconBg: "bg-[#4F46E5]/10 text-[#4F46E5]",
    badgeBg: "bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/25",
    bullet: "#4F46E5",
    hoverTitle: "group-hover:text-[#4F46E5]",
  },
  {
    // Aqua Teal
    backBg: "bg-[#0D9488]/12",
    backBorder: "border-[#0D9488]/25",
    accentGlow: "rgba(13, 148, 136, 0.18)",
    iconBg: "bg-[#0D9488]/10 text-[#0D9488]",
    badgeBg: "bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/25",
    bullet: "#0D9488",
    hoverTitle: "group-hover:text-[#0D9488]",
  },
  {
    // Sunset Orange
    backBg: "bg-[#EA580C]/12",
    backBorder: "border-[#EA580C]/25",
    accentGlow: "rgba(234, 88, 12, 0.18)",
    iconBg: "bg-[#EA580C]/10 text-[#EA580C]",
    badgeBg: "bg-[#EA580C]/10 text-[#EA580C] border-[#EA580C]/25",
    bullet: "#EA580C",
    hoverTitle: "group-hover:text-[#EA580C]",
  },
  {
    // Berry Orchid
    backBg: "bg-[#C026D3]/12",
    backBorder: "border-[#C026D3]/25",
    accentGlow: "rgba(192, 38, 211, 0.18)",
    iconBg: "bg-[#C026D3]/10 text-[#C026D3]",
    badgeBg: "bg-[#C026D3]/10 text-[#C026D3] border-[#C026D3]/25",
    bullet: "#C026D3",
    hoverTitle: "group-hover:text-[#C026D3]",
  },
  {
    // Cobalt Blue
    backBg: "bg-[#2563EB]/12",
    backBorder: "border-[#2563EB]/25",
    accentGlow: "rgba(37, 99, 235, 0.18)",
    iconBg: "bg-[#2563EB]/10 text-[#2563EB]",
    badgeBg: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/25",
    bullet: "#2563EB",
    hoverTitle: "group-hover:text-[#2563EB]",
  },
  {
    // Sage Lime
    backBg: "bg-[#65A30D]/12",
    backBorder: "border-[#65A30D]/25",
    accentGlow: "rgba(101, 163, 13, 0.18)",
    iconBg: "bg-[#65A30D]/10 text-[#65A30D]",
    badgeBg: "bg-[#65A30D]/10 text-[#65A30D] border-[#65A30D]/25",
    bullet: "#65A30D",
    hoverTitle: "group-hover:text-[#65A30D]",
  },
  {
    // Midnight Slate / Navy
    backBg: "bg-[#0D1B2A]/10",
    backBorder: "border-[#0D1B2A]/20",
    accentGlow: "rgba(13, 27, 42, 0.15)",
    iconBg: "bg-[#0D1B2A]/10 text-[#0D1B2A]",
    badgeBg: "bg-[#0D1B2A]/10 text-[#0D1B2A] border-[#0D1B2A]/20",
    bullet: "#0D1B2A",
    hoverTitle: "group-hover:text-[#5B21B6]",
  },
];

const TILT_CONFIGS = [
  { initial: "rotate-[2.2deg]", hover: "group-hover:rotate-[3.8deg] group-hover:scale-[1.01]" },
  { initial: "-rotate-[2deg]", hover: "group-hover:-rotate-[3.6deg] group-hover:scale-[1.01]" },
  { initial: "rotate-[1.8deg]", hover: "group-hover:rotate-[3.2deg] group-hover:scale-[1.01]" },
  { initial: "-rotate-[2.2deg]", hover: "group-hover:-rotate-[3.8deg] group-hover:scale-[1.01]" },
  { initial: "rotate-[2deg]", hover: "group-hover:rotate-[3.5deg] group-hover:scale-[1.01]" },
  { initial: "-rotate-[1.8deg]", hover: "group-hover:-rotate-[3.2deg] group-hover:scale-[1.01]" },
];

const FEATURE_ICONS = [
  CalendarDays,
  LayoutGrid,
  Sparkles,
  Layers,
  Receipt,
  CreditCard,
  UtensilsCrossed,
  Users,
  Wrench,
  Clock,
  BarChart3,
  RefreshCw,
  Building2,
  Bell,
  Smartphone,
  Star,
  Briefcase,
  ShieldCheck,
  Languages,
];

function getFeatureIcon(idx, title = "") {
  const t = title.toLowerCase();
  if (t.includes("reserv") || t.includes("book")) return CalendarDays;
  if (t.includes("front desk") || t.includes("console")) return LayoutGrid;
  if (t.includes("housekeep")) return Sparkles;
  if (t.includes("rate") || t.includes("room")) return Layers;
  if (t.includes("invoic") || t.includes("bill")) return Receipt;
  if (t.includes("pay") || t.includes("upi")) return CreditCard;
  if (t.includes("pos") || t.includes("din") || t.includes("food")) return UtensilsCrossed;
  if (t.includes("crm") || (t.includes("guest") && t.includes("profile"))) return Users;
  if (t.includes("maint") || t.includes("ticket")) return Wrench;
  if (t.includes("staff") || t.includes("roster") || t.includes("shift")) return Clock;
  if (t.includes("report") || t.includes("analytic")) return BarChart3;
  if (t.includes("channel") || t.includes("sync")) return RefreshCw;
  if (t.includes("multi-property") || t.includes("hub") || t.includes("hotel")) return Building2;
  if (t.includes("notif") || t.includes("alert")) return Bell;
  if (t.includes("self-service") || t.includes("mobile")) return Smartphone;
  if (t.includes("feedback") || t.includes("review")) return Star;
  if (t.includes("agent") || t.includes("travel")) return Briefcase;
  if (t.includes("security") || t.includes("audit")) return ShieldCheck;
  if (t.includes("local") || t.includes("language")) return Languages;
  return FEATURE_ICONS[idx % FEATURE_ICONS.length] || Layers;
}

function Features() {
  const [dbFeatures, setDbFeatures] = useState([]);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");

  const loadPlans = async (isSilent = false) => {
    if (!isSilent) setPlansLoading(true);
    setPlansError("");
    try {
      const res = await publicService.getSubscriptionPlans();
      if (res && res.success && Array.isArray(res.data)) {
        setPlans(res.data);
      } else {
        setPlans([]);
      }
    } catch (err) {
      if (!isSilent) setPlansError("Unable to load active subscription plans.");
    } finally {
      if (!isSilent) setPlansLoading(false);
    }
  };

  useEffect(() => {
    publicService.getFeatures()
      .then(res => {
        if (res.success && res.data) {
          setDbFeatures(res.data);
        }
      })
      .catch(() => {});

    loadPlans(false);

    const handleFocus = () => loadPlans(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadPlans(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
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
      title: "08. Guest CRM & Profiles",
      desc: "Central guest profiles, stay histories, dining & room preferences notes, and repeat guest communication logs.",
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
            <Sparkles className="size-3 text-gold" /> System Capabilities & Plans
          </span>
          <h1 className="mt-6 font-display text-4xl leading-[1.15] font-bold text-cream sm:text-6xl max-w-4xl mx-auto">
            Everything you need to run your hotel, <span className="text-[#F5C06A]">in one place</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-cream/70 sm:text-xl font-ui">
            Hour Stay unifies your operations, syncs your channels, and manages your billing in an intuitive, calm operating system designed specifically for Indian hospitality.
          </p>
        </div>
      </section>

      {/* 2. DYNAMIC SUBSCRIPTION PLANS & PRICING */}
      <section id="pricing" className="bg-white py-20 border-b border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center font-ui">
          <span className="text-xs font-bold uppercase tracking-widest text-purple">Transparent Pricing</span>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
            Choose the right plan for your property
          </h2>
          <p className="mt-4 mx-auto max-w-2xl text-base text-[#4A4F58] leading-relaxed font-ui">
            All plans include GST compliance, unlimited staff accounts, and dedicated onboarding support.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 inline-flex items-center gap-2 p-1.5 rounded-full bg-cream/70 border border-navy/10 shadow-inner">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                billingCycle === "monthly" 
                  ? "bg-navy text-cream shadow-sm" 
                  : "text-navy/70 hover:text-navy"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                billingCycle === "yearly" 
                  ? "bg-navy text-cream shadow-sm" 
                  : "text-navy/70 hover:text-navy"
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-gold text-navy text-[10px] font-black px-2 py-0.5 rounded-full">Save ~17%</span>
            </button>
          </div>

          {/* Plans Grid */}
          <div className="mt-14">
            {plansLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#4A4F58]">
                <RefreshCw className="size-6 animate-spin text-purple" />
                <p className="text-xs">Loading live subscription plans...</p>
              </div>
            ) : plansError ? (
              <div className="p-6 max-w-md mx-auto rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0" />
                <span>{plansError}</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center text-[#4A4F58] text-xs">
                No active subscription plans found at this time.
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-3 text-left">
                {plans.map((plan, idx) => {
                  const isPopular = idx === 1 || plan.name.toLowerCase().includes("professional") || plan.name.toLowerCase().includes("pro suite");
                  const price = billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12);
                  const period = billingCycle === "monthly" ? "/month" : "/mo (billed annually)";

                  return (
                    <div 
                      key={plan._id || plan.id || idx}
                      className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 ${
                        isPopular 
                          ? "bg-navy text-cream shadow-2xl border-2 border-gold/60 ring-4 ring-gold/10" 
                          : "bg-white text-navy border border-navy/10 shadow-soft"
                      }`}
                    >
                      {isPopular && (
                        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold to-[#e5a840] text-navy text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md">
                          Most Popular
                        </span>
                      )}

                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <h3 className={`font-display text-xl font-bold ${isPopular ? "text-cream" : "text-navy"}`}>
                            {plan.name}
                          </h3>
                        </div>
                        <p className={`text-xs min-h-[32px] leading-relaxed mb-6 font-ui ${isPopular ? "text-cream/70" : "text-[#4A4F58]"}`}>
                          {plan.description || "Complete operations suite for Indian hotels."}
                        </p>

                        {/* Price */}
                        <div className="mb-6 pb-6 border-b border-white/10">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-semibold">₹</span>
                            <span className={`text-4xl font-extrabold tracking-tight ${isPopular ? "text-[#F5C06A]" : "text-navy"}`}>
                              {price?.toLocaleString("en-IN")}
                            </span>
                            <span className={`text-xs ${isPopular ? "text-cream/60" : "text-[#4A4F58]"}`}>
                              {period}
                            </span>
                          </div>
                          {billingCycle === "yearly" && (
                            <p className={`text-[11px] mt-1 font-medium ${isPopular ? "text-gold/90" : "text-purple"}`}>
                              ₹{plan.yearlyPrice?.toLocaleString("en-IN")} billed annually
                            </p>
                          )}
                        </div>

                        {/* Capacity Limits */}
                        <div className={`mb-6 p-3 rounded-lg text-xs space-y-1.5 font-medium ${
                          isPopular ? "bg-white/5 border border-white/10" : "bg-cream/40 border border-navy/5"
                        }`}>
                          <div className="flex justify-between">
                            <span className={isPopular ? "text-cream/70" : "text-[#4A4F58]"}>Property Capacity:</span>
                            <span className="font-bold">{plan.propertyLimit} {plan.propertyLimit === 1 ? "Property" : "Properties"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isPopular ? "text-cream/70" : "text-[#4A4F58]"}>Room Keys Limit:</span>
                            <span className="font-bold">Up to {plan.roomLimit} Rooms</span>
                          </div>
                        </div>

                        {/* Features List */}
                        <div className="space-y-3 mb-8">
                          <p className={`text-[11px] font-bold uppercase tracking-wider ${isPopular ? "text-cream/80" : "text-navy/80"}`}>
                            Included Modules:
                          </p>
                          <ul className="space-y-2.5 text-xs">
                            {(plan.includedFeatures || []).map((feat, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2.5">
                                <CheckCircle2 className={`size-4 shrink-0 mt-0.5 ${isPopular ? "text-gold" : "text-purple"}`} />
                                <span className={isPopular ? "text-cream/90" : "text-navy/90"}>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button
                        asChild
                        size="lg"
                        className={`w-full rounded-full py-6 font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                          isPopular
                            ? "bg-gold text-navy hover:bg-[#e5a840] shadow-lg hover:scale-[1.02]"
                            : "bg-navy text-cream hover:bg-[#081420] shadow-soft hover:scale-[1.02]"
                        }`}
                      >
                        <Link to="/contact">
                          <span>Get Started with {plan.name}</span>
                          <ArrowRight className="size-3.5 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Complete Product Feature Directory Section */}
      <section className="bg-[#F8FAFC] py-20 lg:py-24 border-t border-slate-200/80 animate-fade-up">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple font-ui">Complete Directory</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              All Platform Modules & Features
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-[#4A4F58] font-ui leading-relaxed">
              Explore the exhaustive list of modules built to handle every dimension of modern hospitality operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7 text-left font-ui">
            {featuresToRender.map((mod, idx) => {
              const palette = FEATURE_CARD_PALETTES[idx % FEATURE_CARD_PALETTES.length];
              const tilt = TILT_CONFIGS[idx % TILT_CONFIGS.length];
              const IconComponent = getFeatureIcon(idx, mod.title);

              // Extract badge number and clean Playfair title
              const badgeMatch = mod.title.match(/^(\d+)/);
              const badgeNumber = badgeMatch ? badgeMatch[1].padStart(2, "0") : String(idx + 1).padStart(2, "0");
              const cleanTitle = mod.title.replace(/^\d+[\.\s\-]+\s*/, "") || mod.title;

              return (
                <div 
                  key={idx} 
                  className="group relative pt-2 pb-3.5 px-1.5 flex flex-col justify-stretch cursor-default"
                >
                  {/* Slanted / Tilted Colored Back Layer (Clean 3D Layered Effect) */}
                  <div
                    className={`absolute inset-x-1.5 inset-y-2 rounded-2xl border ${palette.backBg} ${palette.backBorder} ${tilt.initial} ${tilt.hover} transition-all duration-300 ease-out origin-center pointer-events-none`}
                    style={{
                      boxShadow: `0 10px 24px -8px ${palette.accentGlow}`
                    }}
                    aria-hidden="true"
                  />

                  {/* Front White Rounded Card */}
                  <div className="relative z-10 flex flex-col justify-between h-full bg-white rounded-2xl border border-[#0D1B2A]/8 p-5 sm:p-5.5 shadow-[0_8px_20px_-6px_rgba(13,27,42,0.06),0_2px_6px_-1px_rgba(13,27,42,0.03)] transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_32px_-8px_rgba(13,27,42,0.12)] group-hover:border-[#0D1B2A]/15">
                    <div>
                      {/* Top Row: Small Icon & Feature Number Badge */}
                      <div className="flex items-center justify-between mb-3.5">
                        {/* Small Icon in accent-tinted container */}
                        <div 
                          className={`size-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-xs ${palette.iconBg}`}
                        >
                          <IconComponent className="size-4.5" strokeWidth={1.8} />
                        </div>

                        {/* Feature Number Badge */}
                        <span 
                          className={`font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-transform duration-300 group-hover:scale-105 shadow-xs ${palette.badgeBg}`}
                        >
                          #{badgeNumber}
                        </span>
                      </div>

                      {/* Bold Playfair Heading */}
                      <h3 
                        className={`font-display text-[16.5px] sm:text-[17.5px] font-bold text-navy leading-snug tracking-tight mb-2 ${palette.hoverTitle} transition-colors duration-200`}
                        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                      >
                        {cleanTitle}
                      </h3>

                      {/* Short Muted Description */}
                      <p className="text-xs text-[#525F70] leading-relaxed mb-4 font-ui">
                        {mod.desc}
                      </p>
                    </div>

                    {/* Feature Points / Tags */}
                    {mod.points && mod.points.length > 0 && (
                      <ul className="space-y-1.5 pt-3 border-t border-slate-100 font-ui mt-auto">
                        {mod.points.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                            <span 
                              className="size-1.5 rounded-full shrink-0 shadow-xs" 
                              style={{ backgroundColor: palette.bullet }}
                            />
                            <span className="truncate">{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}