import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Check, ArrowRight, CalendarDays, 
  LayoutGrid, Receipt, RefreshCw, HardHat, 
  Smartphone, BarChart3, Building2, Hotel, Compass, Wallet, Target 
} from "lucide-react";

// Import Resort Images for Visual Assets
import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import beachImg from "@/assets/beach_goa.png";
import retreatImg from "@/assets/retreat_kerala.png";

const CORE_PILLARS = [
  {
    icon: LayoutGrid,
    title: "Simple Operations",
    desc: "An intuitive check-in grid that requires zero learning curve for new reception desk staff.",
    panelBg: "from-[#7C3AED] via-[#6D28D9] to-[#4F46E5]",
    panelShadow: "shadow-[0_10px_25px_-4px_rgba(124,58,237,0.5)]",
    panelBorder: "border-[#C4B5FD]/40",
    accentLine: "bg-[#A78BFA]",
    cardBorderHover: "group-hover:border-[#8B5CF6]/50",
  },
  {
    icon: CalendarDays,
    title: "Connected Workflows",
    desc: "Seamless operations connecting your booking desk, housekeeping team, and billing folios instantly.",
    panelBg: "from-[#0284C7] via-[#0369A1] to-[#0D9488]",
    panelShadow: "shadow-[0_10px_25px_-4px_rgba(2,132,199,0.5)]",
    panelBorder: "border-[#7DD3FC]/40",
    accentLine: "bg-[#38BDF8]",
    cardBorderHover: "group-hover:border-[#0284C7]/50",
  },
  {
    icon: Receipt,
    title: "GST-Ready Billing",
    desc: "Automatic split tax invoices generating accurate CGST, SGST, and IGST breakdowns dynamically.",
    panelBg: "from-[#D97706] via-[#EA580C] to-[#C2410C]",
    panelShadow: "shadow-[0_10px_25px_-4px_rgba(234,88,12,0.5)]",
    panelBorder: "border-[#FDBA74]/40",
    accentLine: "bg-[#FBBF24]",
    cardBorderHover: "group-hover:border-[#F59E0B]/50",
  },
  {
    icon: Wallet,
    title: "UPI-First Payments",
    desc: "Native Indian payment flows via quick UPI QR generation and instant automated reconciliation.",
    panelBg: "from-[#059669] via-[#047857] to-[#10B981]",
    panelShadow: "shadow-[0_10px_25px_-4px_rgba(16,185,129,0.5)]",
    panelBorder: "border-[#A7F3D0]/40",
    accentLine: "bg-[#34D399]",
    cardBorderHover: "group-hover:border-[#10B981]/50",
  },
  {
    icon: RefreshCw,
    title: "Direct & OTA Bookings",
    desc: "Real-time 2-way channel sync avoiding double bookings across MakeMyTrip, Booking.com, and Agoda.",
    panelBg: "from-[#E11D48] via-[#BE123C] to-[#E11D48]",
    panelShadow: "shadow-[0_10px_25px_-4px_rgba(225,29,72,0.5)]",
    panelBorder: "border-[#FECDD3]/40",
    accentLine: "bg-[#FB7185]",
    cardBorderHover: "group-hover:border-[#F43F5E]/50",
  },
  {
    icon: Smartphone,
    title: "Better Guest Experience",
    desc: "Mobile-first pre check-in sheets, custom service requests, and digital bills.",
    panelBg: "from-[#C026D3] via-[#A21CAF] to-[#EC4899]",
    panelShadow: "shadow-[0_10px_25px_-4px_rgba(192,38,211,0.5)]",
    panelBorder: "border-[#F5D0FE]/40",
    accentLine: "bg-[#F472B6]",
    cardBorderHover: "group-hover:border-[#EC4899]/50",
  },
];

function CorePillarCard({ pillar, idx }) {
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
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const PillarIcon = pillar.icon;
  const staggerDelay = `${(idx % 2) * 100 + Math.floor(idx / 2) * 90}ms`;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: staggerDelay }}
      className={`relative pl-3.5 sm:pl-4 pt-2 pb-3 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7 pointer-events-none"
      }`}
    >
      {/* Horizontal Rounded Card */}
      <div
        className={`group relative flex flex-col justify-center min-h-[116px] bg-[#111F33]/95 hover:bg-[#15263E] rounded-2xl sm:rounded-3xl pl-22 sm:pl-26 pr-6 py-5 sm:py-5.5 border border-white/10 ${pillar.cardBorderHover} shadow-[0_10px_28px_rgba(0,0,0,0.35)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition-all duration-300 ease-out hover:-translate-y-1.5 cursor-default`}
      >
        {/* Large circular/rounded colored icon panel overlapping the left side & extending slightly below */}
        <div
          className={`absolute -left-3.5 sm:-left-4 top-1/2 -translate-y-1/2 -bottom-2.5 w-17 sm:w-20 h-[calc(100%+16px)] sm:h-[calc(100%+20px)] rounded-[24px] sm:rounded-[28px] rounded-br-md sm:rounded-br-lg bg-gradient-to-b ${pillar.panelBg} ${pillar.panelShadow} border ${pillar.panelBorder} flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105 group-hover:-rotate-2 z-10`}
        >
          {/* Subtle inner highlight */}
          <div className="absolute inset-0.5 rounded-[22px] sm:rounded-[26px] rounded-br-sm bg-white/10 pointer-events-none" />
          {/* Centered White Icon */}
          <PillarIcon
            className="size-7 sm:size-8 text-white relative z-10 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6"
            strokeWidth={2}
          />
        </div>

        {/* Card Content */}
        <div className="relative z-10 text-left">
          {/* Card title in bold white */}
          <h3 className="font-display text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
            {pillar.title}
          </h3>

          {/* Thin accent line under the title */}
          <div
            className={`h-[2px] w-9 sm:w-11 rounded-full mt-1.5 mb-2 ${pillar.accentLine} transition-all duration-300 ease-out group-hover:w-16 opacity-90`}
          />

          {/* Short muted description */}
          <p className="font-sans text-xs sm:text-[13px] text-gray-300 group-hover:text-slate-200/90 leading-relaxed font-normal">
            {pillar.desc}
          </p>
        </div>
      </div>
    </div>
  );
}

const OPERATIONAL_STEPS = [
  {
    step: "01",
    icon: CalendarDays,
    label: "Reservations",
    desc: "Direct/OTA booking incoming",
    tabBg: "from-[#7C3AED] to-[#6366F1]",
    tabShadow: "shadow-[0_4px_14px_rgba(124,58,237,0.35)]",
    tabBorder: "border-[#C4B5FD]/50",
    titleColor: "text-[#7C3AED]",
    accentBar: "bg-[#7C3AED]",
    cardBorderHover: "group-hover:border-[#7C3AED]/40",
  },
  {
    step: "02",
    icon: LayoutGrid,
    label: "Front Desk",
    desc: "ID capture and room assign",
    tabBg: "from-[#0284C7] to-[#06B6D4]",
    tabShadow: "shadow-[0_4px_14px_rgba(2,132,199,0.35)]",
    tabBorder: "border-[#7DD3FC]/50",
    titleColor: "text-[#0284C7]",
    accentBar: "bg-[#0284C7]",
    cardBorderHover: "group-hover:border-[#0284C7]/40",
  },
  {
    step: "03",
    icon: HardHat,
    label: "Housekeeping",
    desc: "Auto clean/dirty status toggle",
    tabBg: "from-[#059669] to-[#10B981]",
    tabShadow: "shadow-[0_4px_14px_rgba(16,185,129,0.35)]",
    tabBorder: "border-[#A7F3D0]/50",
    titleColor: "text-[#059669]",
    accentBar: "bg-[#059669]",
    cardBorderHover: "group-hover:border-[#059669]/40",
  },
  {
    step: "04",
    icon: Receipt,
    label: "GST Billing",
    desc: "UPI invoice folio creation",
    tabBg: "from-[#D97706] to-[#F59E0B]",
    tabShadow: "shadow-[0_4px_14px_rgba(245,158,11,0.35)]",
    tabBorder: "border-[#FDE68A]/50",
    titleColor: "text-[#D97706]",
    accentBar: "bg-[#D97706]",
    cardBorderHover: "group-hover:border-[#D97706]/40",
  },
  {
    step: "05",
    icon: Smartphone,
    label: "Guest App",
    desc: "Pre-check-in & digital key",
    tabBg: "from-[#E11D48] to-[#F43F5E]",
    tabShadow: "shadow-[0_4px_14px_rgba(244,63,94,0.35)]",
    tabBorder: "border-[#FECDD3]/50",
    titleColor: "text-[#E11D48]",
    accentBar: "bg-[#E11D48]",
    cardBorderHover: "group-hover:border-[#E11D48]/40",
  },
];

function OperationalCycleCard({ item, idx }) {
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
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const ItemIcon = item.icon;
  const staggerDelay = `${idx * 80}ms`;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: staggerDelay }}
      className={`group relative pt-4 pl-3.5 pb-2 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7 pointer-events-none"
      }`}
    >
      {/* Bold Colored Tab at top-left extending slightly outside */}
      <div
        className={`absolute -top-1 -left-1 sm:-left-1.5 size-11 sm:size-12 rounded-xl rounded-bl-sm bg-gradient-to-br ${item.tabBg} ${item.tabShadow} border ${item.tabBorder} flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 z-20`}
      >
        <ItemIcon
          className="size-5 sm:size-5.5 text-white transition-transform duration-300 group-hover:rotate-6"
          strokeWidth={2}
        />
      </div>

      {/* White Rounded Rectangular Content Area */}
      <div
        className={`relative z-10 bg-white rounded-2xl border border-slate-200/90 ${item.cardBorderHover} p-5 sm:p-5.5 pt-7.5 sm:pt-8.5 shadow-[0_4px_18px_rgba(13,27,42,0.06)] hover:shadow-[0_16px_36px_rgba(13,27,42,0.12)] transition-all duration-300 ease-out group-hover:-translate-y-1.5 flex flex-col justify-between h-full text-left min-h-[160px]`}
      >
        <div>
          {/* Top Row: Step Number at top-right */}
          <div className="flex justify-end mb-1">
            <span className="font-mono text-[11px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors tracking-wider">
              {item.step}
            </span>
          </div>

          {/* Card Title in Accent Color */}
          <h4 className={`font-display text-base sm:text-lg font-bold ${item.titleColor} tracking-tight mb-1.5`}>
            {item.label}
          </h4>

          {/* Short Muted Description */}
          <p className="font-sans text-xs sm:text-[12.5px] text-gray-600 leading-relaxed font-normal">
            {item.desc}
          </p>
        </div>

        {/* Small Colored Accent Bar at Bottom-Right */}
        <div className="flex justify-end pt-3 mt-3">
          <div
            className={`h-1 sm:h-1.5 w-7 sm:w-8.5 rounded-full ${item.accentBar} transition-all duration-300 ease-out group-hover:w-14 opacity-90`}
          />
        </div>
      </div>
    </div>
  );
}

function PurposeFutureCard({ item, idx }) {
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
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const IconComponent = item.icon;
  const staggerDelay = `${idx * 120}ms`;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: staggerDelay }}
      className={`group relative flex items-center min-h-[160px] sm:min-h-[175px] pl-3.5 sm:pl-4 pr-12 sm:pr-14 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7 pointer-events-none"
      }`}
    >
      {/* Large Colored Arrow / Hexagonal Back Shape Extending to the Right */}
      <div
        className={`absolute inset-y-1.5 left-7 sm:left-8 right-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${item.gradient} flex items-center justify-end pr-3.5 sm:pr-4.5 shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] z-0`}
        style={{
          clipPath: "polygon(0% 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 0% 100%)",
        }}
      >
        {/* Large Step Number on the Right */}
        <span className="font-mono text-2xl sm:text-3xl font-black text-white/95 tracking-tight select-none">
          {item.step}
        </span>
      </div>

      {/* Small Colored Icon Badge Overlapping the Left Edge */}
      <div
        className={`absolute -left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 size-11 sm:size-12 rounded-xl rounded-bl-sm bg-gradient-to-br ${item.gradient} border ${item.badgeBorder} shadow-[0_4px_14px_rgba(0,0,0,0.16)] flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 z-20`}
      >
        <IconComponent className="size-5 sm:size-5.5 text-white transition-transform duration-300 group-hover:rotate-6" strokeWidth={2} />
      </div>

      {/* White Rounded Front Card */}
      <div
        className={`relative z-10 w-full bg-white rounded-2xl border border-slate-200/90 ${item.cardBorderHover} shadow-[0_4px_20px_rgba(13,27,42,0.06)] group-hover:shadow-[0_14px_32px_rgba(13,27,42,0.12)] p-5 sm:p-6 pl-12 sm:pl-14 transition-all duration-300 ease-out group-hover:-translate-y-1 flex flex-col justify-center h-full text-left`}
      >
        <span className={`text-[11px] font-bold uppercase tracking-widest ${item.tagColor}`}>
          {item.category}
        </span>
        <h3 className={`mt-0.5 font-display text-lg sm:text-xl font-bold ${item.titleColor} tracking-tight`}>
          {item.title}
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-gray-600 leading-relaxed font-ui font-medium">
          {item.desc}
        </p>
      </div>
    </div>
  );
}

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
  const [mediaMap, setMediaMap] = useState({});
  const [aboutData, setAboutData] = useState({
    title: "Built for the way Indian hospitality works.",
    description: "We believe in technology that respects the hustle behind the desk. Hour Stay is engineered to simplify operations, remove dashboard clutter, and streamline guest management.",
    story: "Hour Stay began with a simple observation: most hotel management software is too complicated. Properties were forced to juggle separate systems for front desk check-ins, guest billing, housekeeping lists, and OTA channel managers.\n\nWe set out to rebuild this stack from scratch. Hour Stay is a unified, cloud-based Hotel Management System that connects reservations, front desk check-in/out, GST billing, housekeeping tasks, guest mobile apps, and analytics in one cohesive platform.\n\nToday, properties across India use Hour Stay to run clean, efficient, and profitable operations without the operational noise of legacy tools.",
    mission: "To empower Indian hoteliers with modern, reliable, and intuitive cloud technology to run smooth daily check-ins and check-outs.",
    vision: "To be the preferred core PMS system across 5,000+ boutique, heritage, and independent hotels in South Asia.",
    imageUrl: ""
  });

  useEffect(() => {
    publicService.getAbout()
      .then(res => {
        if (res.success && res.data) {
          const config = res.data;
          setAboutData({
            title: config.title || "Built for the way Indian hospitality works.",
            description: config.excerpt || "We believe in technology that respects the hustle behind the desk. Hour Stay is engineered to simplify operations, remove dashboard clutter, and streamline guest management.",
            story: config.author || "",
            mission: config.tag || "To empower Indian hoteliers with modern, reliable, and intuitive cloud technology to run smooth daily check-ins and check-outs.",
            vision: config.role || "To be the preferred core PMS system across 5,000+ boutique, heritage, and independent hotels in South Asia.",
            imageUrl: config.content || ""
          });
        }
      })
      .catch(err => {});

    publicService.getMedia()
      .then(res => {
        if (res.success && res.data) {
          setMediaMap(res.data);
        }
      })
      .catch(err => {});

    const fetchActiveProperty = () => {
      const activeId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
      publicService.getProperty(activeId)
        .then(res => {
          if (res.success && res.data) {
            const p = res.data;
            setAboutData(prev => ({
              ...prev,
              title: `About ${p.name}`,
              description: p.settings?.description || prev.description,
              mission: `Classification: ${p.settings?.classification || 'Standard Boutique'} · Located in ${p.city}, ${p.settings?.state || ''}`,
              vision: `Cancellation Policy: ${p.settings?.cancellationPolicy || prev.vision}`,
              imageUrl: p.settings?.photos?.[0] || p.settings?.logo || prev.imageUrl
            }));
          }
        })
        .catch(() => {});
    };

    fetchActiveProperty();
    window.addEventListener('selected-property-changed', fetchActiveProperty);
    return () => window.removeEventListener('selected-property-changed', fetchActiveProperty);
  }, []);

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
                {aboutData.title}
              </h1>
              <p className="text-base leading-relaxed text-gray-300 sm:text-lg font-ui font-medium">
                {aboutData.description}
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="overflow-hidden rounded-2xl border border-cream/10 shadow-lift group">
                <img 
                  src={aboutData.imageUrl || palaceImg} 
                  alt="Hour Stay visual resort asset" 
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
              <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">Our Story</h2>
            </div>
            <div className="lg:col-span-8 space-y-6 text-base text-gray-600 font-ui leading-relaxed">
              {aboutData.story.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2.5. Mission & Vision Section (Purpose & Future) */}
      <section className="bg-white py-16 sm:py-20 border-t border-slate-100 relative z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-7 sm:gap-8 md:grid-cols-2 text-left">
            <PurposeFutureCard
              idx={0}
              item={{
                step: "01",
                category: "Purpose",
                title: "Our Mission",
                desc: aboutData.mission,
                icon: Target,
                gradient: "from-[#5B21B6] via-[#6D28D9] to-[#7C3AED]",
                badgeBorder: "border-[#DDD6FE]/60",
                tagColor: "text-[#5B21B6]",
                titleColor: "text-[#5B21B6]",
                cardBorderHover: "group-hover:border-[#5B21B6]/40",
              }}
            />
            <PurposeFutureCard
              idx={1}
              item={{
                step: "02",
                category: "Future",
                title: "Our Vision",
                desc: aboutData.vision,
                icon: Compass,
                gradient: "from-[#B45309] via-[#D97706] to-[#F59E0B]",
                badgeBorder: "border-[#FDE68A]/60",
                tagColor: "text-[#B45309]",
                titleColor: "text-[#B45309]",
                cardBorderHover: "group-hover:border-[#D97706]/40",
              }}
            />
          </div>
        </div>
      </section>

      {/* 3. Why Hour Stay Section (Core Pillars) */}
      <section className="bg-[#0B1528] py-20 lg:py-28 relative overflow-hidden border-y border-slate-800/80">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#0284C7]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
          <div className="text-center mb-14 sm:mb-16">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#C4B5FD] bg-[#7C3AED]/20 border border-[#7C3AED]/30 px-3.5 py-1 rounded-full mb-3 shadow-[0_0_15px_rgba(124,58,237,0.25)]">
              Core Pillars
            </span>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
              Why Indian hotels run on Hour Stay
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-base text-gray-400 font-ui leading-relaxed">
              Built from the ground up to eliminate desk friction, connect departments, and deliver seamless Indian hospitality.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 lg:gap-7 max-w-5xl mx-auto">
            {CORE_PILLARS.map((pillar, idx) => (
              <CorePillarCard key={idx} pillar={pillar} idx={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Built for Indian Hospitality Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Engineered For Scale</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              Powering diverse property structures
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            {[
              { label: "Hotels", desc: "City business hotels and luxury boutique properties.", img: mediaMap.jaipur || jaipurImg },
              { label: "Resorts", desc: "Sprawling coastal properties and hill retreats.", img: mediaMap.goa || beachImg },
              { label: "Boutique Havelis", desc: "Historic palaces requiring custom room architectures.", img: mediaMap.palace || palaceImg },
              { label: "Multi-Property Chains", desc: "Centrally managed portfolios and transit keys.", img: mediaMap.kerala || retreatImg }
            ].map((cat, idx) => (
              <div key={idx} className="group overflow-hidden rounded-xl border border-navy/5 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1">
                <div className="h-44 overflow-hidden relative">
                  <img src={cat.img} alt={cat.label} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 font-display text-lg font-bold text-cream">{cat.label}</h3>
                </div>
                <div className="p-4 text-left font-ui">
                  <p className="text-xs text-gray-600 leading-relaxed">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. One Platform, Every Operation Section (Operational Cycle) */}
      <section className="bg-[#FAF9F5] py-20 lg:py-24 border-t border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#5B21B6] bg-[#F3E8FF] px-3.5 py-1 rounded-full mb-2">
              Operational Cycle
            </span>
            <h2 className="mt-1 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              One platform, every operation
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-gray-600 font-ui leading-relaxed">
              See how reservations, front desk check-in, housekeeping tasks, billing invoices, and guest experience components link together in one closed loop.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-6 lg:gap-5 max-w-7xl mx-auto font-ui">
            {OPERATIONAL_STEPS.map((item, idx) => (
              <OperationalCycleCard key={idx} item={item} idx={idx} />
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}