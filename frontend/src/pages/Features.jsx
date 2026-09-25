import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
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
    // 01. Lavender Purple
    backBg: "bg-[#DDD6FE]",
    backBorder: "border-[#C4B5FD]",
    iconBg: "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]",
    badgeBg: "bg-[#EDE9FE] text-[#6D28D9] border-[#C4B5FD]",
    bullet: "#7C3AED",
    hoverTitle: "group-hover:text-[#6D28D9]",
  },
  {
    // 02. Ocean Sky Blue
    backBg: "bg-[#BAE6FD]",
    backBorder: "border-[#7DD3FC]",
    iconBg: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
    badgeBg: "bg-[#E0F2FE] text-[#0369A1] border-[#7DD3FC]",
    bullet: "#0284C7",
    hoverTitle: "group-hover:text-[#0284C7]",
  },
  {
    // 03. Warm Amber Gold
    backBg: "bg-[#FDE68A]",
    backBorder: "border-[#FCD34D]",
    iconBg: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
    badgeBg: "bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]",
    bullet: "#D97706",
    hoverTitle: "group-hover:text-[#D97706]",
  },
  {
    // 04. Mint Emerald Green
    backBg: "bg-[#A7F3D0]",
    backBorder: "border-[#6EE7B7]",
    iconBg: "bg-[#D1FAE5] text-[#047857] border-[#A7F3D0]",
    badgeBg: "bg-[#D1FAE5] text-[#047857] border-[#6EE7B7]",
    bullet: "#059669",
    hoverTitle: "group-hover:text-[#059669]",
  },
  {
    // 05. Rose Coral Pink
    backBg: "bg-[#FECDD3]",
    backBorder: "border-[#FDA4AF]",
    iconBg: "bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]",
    badgeBg: "bg-[#FFE4E6] text-[#BE123C] border-[#FDA4AF]",
    bullet: "#E11D48",
    hoverTitle: "group-hover:text-[#E11D48]",
  },
  {
    // 06. Periwinkle Indigo
    backBg: "bg-[#C7D2FE]",
    backBorder: "border-[#A5B4FC]",
    iconBg: "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]",
    badgeBg: "bg-[#E0E7FF] text-[#4338CA] border-[#A5B4FC]",
    bullet: "#4F46E5",
    hoverTitle: "group-hover:text-[#4F46E5]",
  },
  {
    // 07. Aqua Teal
    backBg: "bg-[#99F6E4]",
    backBorder: "border-[#5EEAD4]",
    iconBg: "bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]",
    badgeBg: "bg-[#CCFBF1] text-[#0F766E] border-[#5EEAD4]",
    bullet: "#0D9488",
    hoverTitle: "group-hover:text-[#0D9488]",
  },
  {
    // 08. Apricot Sunset Orange
    backBg: "bg-[#FED7AA]",
    backBorder: "border-[#FDBA74]",
    iconBg: "bg-[#FFEDD5] text-[#C2410C] border-[#FED7AA]",
    badgeBg: "bg-[#FFEDD5] text-[#C2410C] border-[#FDBA74]",
    bullet: "#EA580C",
    hoverTitle: "group-hover:text-[#EA580C]",
  },
  {
    // 09. Berry Orchid
    backBg: "bg-[#FBCFE8]",
    backBorder: "border-[#F472B6]",
    iconBg: "bg-[#FCE7F3] text-[#A21CAF] border-[#FBCFE8]",
    badgeBg: "bg-[#FCE7F3] text-[#A21CAF] border-[#F472B6]",
    bullet: "#C026D3",
    hoverTitle: "group-hover:text-[#C026D3]",
  },
  {
    // 10. Soft Cobalt Blue
    backBg: "bg-[#BFDBFE]",
    backBorder: "border-[#93C5FD]",
    iconBg: "bg-[#DBEAFE] text-[#1D4ED8] border-[#BFDBFE]",
    badgeBg: "bg-[#DBEAFE] text-[#1D4ED8] border-[#93C5FD]",
    bullet: "#2563EB",
    hoverTitle: "group-hover:text-[#2563EB]",
  },
  {
    // 11. Sage Lime Green
    backBg: "bg-[#D9F99D]",
    backBorder: "border-[#BEF264]",
    iconBg: "bg-[#ECFCCB] text-[#4D7C0F] border-[#D9F99D]",
    badgeBg: "bg-[#ECFCCB] text-[#4D7C0F] border-[#BEF264]",
    bullet: "#65A30D",
    hoverTitle: "group-hover:text-[#65A30D]",
  },
  {
    // 12. Coral Watermelon
    backBg: "bg-[#FECDD3]",
    backBorder: "border-[#FDA4AF]",
    iconBg: "bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]",
    badgeBg: "bg-[#FFF1F2] text-[#E11D48] border-[#FDA4AF]",
    bullet: "#F43F5E",
    hoverTitle: "group-hover:text-[#F43F5E]",
  },
  {
    // 13. Lilac Violet
    backBg: "bg-[#E9D5FF]",
    backBorder: "border-[#D8B4FE]",
    iconBg: "bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]",
    badgeBg: "bg-[#F3E8FF] text-[#7E22CE] border-[#D8B4FE]",
    bullet: "#9333EA",
    hoverTitle: "group-hover:text-[#9333EA]",
  },
  {
    // 14. Ocean Cyan
    backBg: "bg-[#A5F3FC]",
    backBorder: "border-[#67E8F9]",
    iconBg: "bg-[#CFFAFE] text-[#0E7490] border-[#A5F3FC]",
    badgeBg: "bg-[#CFFAFE] text-[#0E7490] border-[#67E8F9]",
    bullet: "#0891B2",
    hoverTitle: "group-hover:text-[#0891B2]",
  },
  {
    // 15. Soft Peach Coral
    backBg: "bg-[#FECACA]",
    backBorder: "border-[#FCA5A5]",
    iconBg: "bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]",
    badgeBg: "bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]",
    bullet: "#EF4444",
    hoverTitle: "group-hover:text-[#EF4444]",
  },
  {
    // 16. Slate Pearl / Navy Tint
    backBg: "bg-[#CBD5E1]",
    backBorder: "border-[#94A3B8]",
    iconBg: "bg-[#E2E8F0] text-[#1E293B] border-[#CBD5E1]",
    badgeBg: "bg-[#E2E8F0] text-[#1E293B] border-[#CBD5E1]",
    bullet: "#334155",
    hoverTitle: "group-hover:text-[#0D1B2A]",
  },
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
}function LayeredFeatureCard({ mod, idx }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const palette = FEATURE_CARD_PALETTES[idx % FEATURE_CARD_PALETTES.length];
  const IconComponent = getFeatureIcon(idx, mod.title);
  const rotationAngle = idx % 2 === 0 ? "rotate-[2.3deg]" : "rotate-[2.7deg]";
  const hoverRotation = idx % 2 === 0 ? "group-hover:rotate-[3.4deg]" : "group-hover:rotate-[3.8deg]";

  // Extract badge number and clean Playfair title
  const badgeMatch = mod.title.match(/^(\d+)/);
  const badgeNumber = badgeMatch ? badgeMatch[1].padStart(2, "0") : String(idx + 1).padStart(2, "0");
  const cleanTitle = mod.title.replace(/^\d+[\.\s\-]+\s*/, "") || mod.title;

  const staggerDelay = `${(idx % 4) * 80 + Math.min(Math.floor(idx / 4) * 60, 240)}ms`;

  return (
    <div 
      ref={cardRef}
      style={{
        transitionDelay: staggerDelay,
      }}
      className={`group relative flex flex-col justify-stretch cursor-default pr-2.5 pb-2.5 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7 pointer-events-none"
      }`}
    >
      {/* Thicker Solid Pastel Colored Back Card (Positioned behind, extending strictly from right & bottom edges, rotated 2-3°) */}
      <div
        className={`absolute top-2.5 left-2.5 w-full h-full rounded-2xl ${palette.backBg} border-2 ${palette.backBorder} ${rotationAngle} origin-top-left transition-all duration-300 ease-out group-hover:translate-x-1.5 group-hover:translate-y-1.5 ${hoverRotation} shadow-xs pointer-events-none`}
        aria-hidden="true"
      />

      {/* Smaller White Front Card (Clearly in front, straight, crisp borders) */}
      <div className="relative z-10 flex flex-col justify-between h-full bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-5.5 shadow-[0_4px_16px_-2px_rgba(13,27,42,0.06),0_1px_4px_-1px_rgba(13,27,42,0.04)] transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_36px_-6px_rgba(13,27,42,0.12),0_4px_12px_-2px_rgba(13,27,42,0.06)] group-hover:border-slate-300">
        <div>
          {/* Top Row: Small Pastel Icon Box & Numbered Circular Badge */}
          <div className="flex items-center justify-between mb-3.5">
            {/* Small Icon in pastel container with hover rotation */}
            <div 
              className={`size-9 rounded-xl flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-[-6deg] border ${palette.backBorder} ${palette.iconBg}`}
            >
              <IconComponent className="size-4.5" strokeWidth={1.9} />
            </div>

            {/* Small Circular Numbered Badge with hover scale */}
            <span 
              className={`font-mono text-[11px] font-bold size-7 rounded-full border flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-xs ${palette.badgeBg}`}
            >
              {badgeNumber}
            </span>
          </div>

          {/* Playfair Display Title */}
          <h3 
            className={`font-display text-[16.5px] sm:text-[17px] font-bold text-navy leading-snug tracking-tight mb-2 ${palette.hoverTitle} transition-colors duration-200`}
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            {cleanTitle}
          </h3>

          {/* Short Inter Description */}
          <p className="text-xs text-gray-600 leading-relaxed mb-4 font-ui">
            {mod.desc}
          </p>
        </div>

        {/* Feature Points / Tags */}
        {mod.points && mod.points.length > 0 && (
          <ul className="space-y-1.5 pt-3 border-t border-slate-100 font-ui mt-auto">
            {mod.points.map((pt, pIdx) => (
              <li key={pIdx} className="flex items-center gap-2 text-[11px] font-medium text-slate-700">
                <span 
                  className="size-1.5 rounded-full shrink-0 shadow-xs transition-transform duration-200 group-hover:scale-125" 
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
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-300 sm:text-xl font-ui">
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
          <p className="mt-4 mx-auto max-w-2xl text-base text-gray-600 leading-relaxed font-ui">
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
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                <RefreshCw className="size-6 animate-spin text-purple" />
                <p className="text-xs">Loading live subscription plans...</p>
              </div>
            ) : plansError ? (
              <div className="p-6 max-w-md mx-auto rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0" />
                <span>{plansError}</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
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
                        <p className={`text-xs min-h-[32px] leading-relaxed mb-6 font-ui ${isPopular ? "text-gray-300" : "text-gray-600"}`}>
                          {plan.description || "Complete operations suite for Indian hotels."}
                        </p>

                        {/* Price */}
                        <div className="mb-6 pb-6 border-b border-white/10">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-semibold">₹</span>
                            <span className={`text-4xl font-extrabold tracking-tight ${isPopular ? "text-[#F5C06A]" : "text-navy"}`}>
                              {price?.toLocaleString("en-IN")}
                            </span>
                            <span className={`text-xs ${isPopular ? "text-gray-400" : "text-gray-500"}`}>
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
                            <span className={isPopular ? "text-gray-300" : "text-gray-600"}>Property Capacity:</span>
                            <span className="font-bold">{plan.propertyLimit} {plan.propertyLimit === 1 ? "Property" : "Properties"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className={isPopular ? "text-gray-300" : "text-gray-600"}>Room Keys Limit:</span>
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
      <section className="bg-[#F8FAFC] py-20 lg:py-24 border-t border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple font-ui">Complete Directory</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              All Platform Modules & Features
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-gray-600 font-ui leading-relaxed">
              Explore the exhaustive list of modules built to handle every dimension of modern hospitality operations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-6 lg:gap-7 text-left font-ui">
            {featuresToRender.map((mod, idx) => (
              <LayeredFeatureCard key={idx} mod={mod} idx={idx} />
            ))}
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}