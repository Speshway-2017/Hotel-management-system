import React, { useState, useEffect, useRef } from "react";
import { Hotel, Sparkles, Landmark, ShieldCheck, Users, RotateCw, CheckCircle2 } from "lucide-react";

export const categoryData = [
  {
    id: "01",
    stepLabel: "Step 01",
    name: "Hotels",
    description: "City business hotels, airport transit stays, and commercial lodging hubs.",
    tag: "Business & Transit",
    icon: Hotel,
    // Hour Stay Purple Theme (#5B21B6)
    frontBorder: "border-[#5B21B6]/30 hover:border-[#5B21B6]",
    backBorder: "border-[#5B21B6]/60",
    stepBg: "bg-[#F3E8FF] text-[#5B21B6] border-[#DDD6FE]",
    stepNumberColor: "text-[#5B21B6]",
    tagColor: "text-[#5B21B6]",
    titleHoverColor: "text-[#5B21B6]",
    iconBoxBg: "bg-[#F3E8FF]",
    iconBoxBorder: "border-[#DDD6FE]",
    iconColor: "text-[#5B21B6]",
    dotBg: "bg-[#5B21B6]",
    features: ["Hourly & 24h stays", "Express desk ID sync", "Corporate GST bills"],
  },
  {
    id: "02",
    stepLabel: "Step 02",
    name: "Resorts",
    description: "Sprawling leisure retreats, beachfront getaways, and hillside spa locations.",
    tag: "Experiential Luxury",
    icon: Sparkles,
    // Jaipur Amber / Gold Theme (#D97706)
    frontBorder: "border-[#D97706]/30 hover:border-[#D97706]",
    backBorder: "border-[#D97706]/60",
    stepBg: "bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]",
    stepNumberColor: "text-[#D97706]",
    tagColor: "text-[#B45309]",
    titleHoverColor: "text-[#D97706]",
    iconBoxBg: "bg-[#FEF3C7]",
    iconBoxBorder: "border-[#FDE68A]",
    iconColor: "text-[#D97706]",
    dotBg: "bg-[#D97706]",
    features: ["Villa / cottage keys", "Spa & dining folios", "Multi-day packages"],
  },
  {
    id: "03",
    stepLabel: "Step 03",
    name: "Boutique Havelis",
    description: "Historic palaces, heritage properties, and design-forward boutique villas.",
    tag: "Cultural Heritage",
    icon: Landmark,
    // Blush / Coral Pink Theme (#E11D48)
    frontBorder: "border-[#E11D48]/30 hover:border-[#E11D48]",
    backBorder: "border-[#E11D48]/60",
    stepBg: "bg-[#FFE4E6] text-[#BE123C] border-[#FECDD3]",
    stepNumberColor: "text-[#E11D48]",
    tagColor: "text-[#E11D48]",
    titleHoverColor: "text-[#E11D48]",
    iconBoxBg: "bg-[#FFE4E6]",
    iconBoxBorder: "border-[#FECDD3]",
    iconColor: "text-[#E11D48]",
    dotBg: "bg-[#E11D48]",
    features: ["Heritage room types", "Custom royal tariffs", "Concierge add-ons"],
  },
  {
    id: "04",
    stepLabel: "Step 04",
    name: "Lodges & Stays",
    description: "Mid-scale highway retreats, pilgrimage accommodation, and homestays.",
    tag: "Comfort Stays",
    icon: ShieldCheck,
    // Ocean Teal / Emerald Theme (#0D9488)
    frontBorder: "border-[#0D9488]/30 hover:border-[#0D9488]",
    backBorder: "border-[#0D9488]/60",
    stepBg: "bg-[#CCFBF1] text-[#0F766E] border-[#99F6E4]",
    stepNumberColor: "text-[#0D9488]",
    tagColor: "text-[#0D9488]",
    titleHoverColor: "text-[#0D9488]",
    iconBoxBg: "bg-[#CCFBF1]",
    iconBoxBorder: "border-[#99F6E4]",
    iconColor: "text-[#0D9488]",
    dotBg: "bg-[#0D9488]",
    features: ["Highway transit keys", "Instant UPI folios", "Shift reconciliation"],
  },
  {
    id: "05",
    stepLabel: "Step 05",
    name: "Multi-Property Chains",
    description: "Consolidated enterprise control across multiple cities and property codes.",
    tag: "Enterprise Scale",
    icon: Users,
    // Deep Navy / Cobalt Theme (#0D1B2A / #2563EB)
    frontBorder: "border-[#1E3A8A]/30 hover:border-[#1E3A8A]",
    backBorder: "border-[#1E3A8A]/60",
    stepBg: "bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]",
    stepNumberColor: "text-[#0D1B2A]",
    tagColor: "text-[#1E40AF]",
    titleHoverColor: "text-[#1E3A8A]",
    iconBoxBg: "bg-[#DBEAFE]",
    iconBoxBorder: "border-[#BFDBFE]",
    iconColor: "text-[#1E40AF]",
    dotBg: "bg-[#1E3A8A]",
    features: ["Multi-unit PMS hub", "Cross-city bookings", "Unified tax reports"],
  },
];

function FlipFrameworkCard({ item, idx }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchFlipped, setIsTouchFlipped] = useState(false);
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

  const Icon = item.icon;
  const staggerDelay = `${idx * 75}ms`;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: staggerDelay }}
      onClick={() => setIsTouchFlipped((prev) => !prev)}
      className={`group relative w-[280px] sm:w-[320px] shrink-0 snap-center lg:w-auto lg:shrink h-[320px] xl:h-[330px] [perspective:1000px] cursor-pointer transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7 pointer-events-none"
      }`}
    >
      {/* 3D Flipper Container */}
      <div
        className={`relative w-full h-full transition-transform duration-700 ease-in-out [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${
          isTouchFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* ========================================================================= */}
        {/* FRONT FACE: Shows ONLY 01-05 + Step Title + Category                      */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl bg-white border-2 ${item.frontBorder} shadow-[0_6px_22px_rgba(13,27,42,0.06)] group-hover:shadow-[0_16px_36px_rgba(13,27,42,0.12)] p-6 flex flex-col justify-between items-center text-center [backface-visibility:hidden] transition-shadow duration-300 z-10`}
        >
          {/* Top: Step Badge */}
          <div className="w-full flex justify-between items-center">
            <span className={`font-mono text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md border ${item.stepBg} shadow-xs`}>
              {item.stepLabel}
            </span>
            <div className={`size-2 rounded-full ${item.dotBg} opacity-70`} />
          </div>

          {/* Center: Large Step Number + Step Name */}
          <div className="my-auto flex flex-col items-center">
            <span
              className={`font-mono text-5xl xl:text-6xl font-black ${item.stepNumberColor} tracking-tighter leading-none select-none transition-transform duration-300 group-hover:scale-105`}
            >
              {item.id}
            </span>

            <span className={`mt-3.5 block text-[11px] font-bold uppercase tracking-wider font-sans ${item.tagColor}`}>
              {item.tag}
            </span>

            <h3 className="mt-1 font-display text-xl xl:text-[22px] font-bold text-[#0D1B2A] tracking-tight leading-snug">
              {item.name}
            </h3>
          </div>

          {/* Bottom: Smooth Flip Hint Indicator */}
          <div className="w-full pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-400 font-mono group-hover:text-[#5B21B6] transition-colors">
            <RotateCw className="size-3.5 transition-transform duration-700 group-hover:rotate-180" />
            <span>Hover to reveal details</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BACK FACE: Reveals Step #, Title, Description, Icon & Key Details          */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full rounded-2xl bg-white border-2 ${item.backBorder} shadow-[0_16px_36px_rgba(13,27,42,0.14)] p-5 xl:p-5.5 flex flex-col justify-between text-left [backface-visibility:hidden] [transform:rotateY(180deg)] z-20`}
        >
          <div>
            {/* Top Row: Step Tag + Relevant Icon */}
            <div className="flex items-center justify-between">
              <span className={`font-mono text-[10.5px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${item.stepBg}`}>
                {item.stepLabel}
              </span>

              <div
                className={`size-8.5 rounded-lg flex items-center justify-center border ${item.iconBoxBg} ${item.iconBoxBorder} ${item.iconColor} shadow-xs`}
              >
                <Icon className="size-4.5" strokeWidth={1.9} />
              </div>
            </div>

            {/* Title & Tag */}
            <h4 className={`font-display text-lg font-bold ${item.titleHoverColor} tracking-tight leading-snug mt-2.5`}>
              {item.name}
            </h4>

            {/* Short Description */}
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600 font-sans font-normal">
              {item.description}
            </p>

            {/* Key Details / Highlights */}
            <div className="mt-3.5 pt-2.5 border-t border-slate-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono block mb-1.5">
                Key Operations:
              </span>
              <ul className="space-y-1">
                {item.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-1.5 text-[11.5px] text-gray-700 font-medium font-sans">
                    <CheckCircle2 className={`size-3.5 shrink-0 ${item.iconColor}`} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Row: Model Tag & Indicator */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider font-mono">
              Operational Model
            </span>
            <div className={`size-2 rounded-full ${item.dotBg}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CategoryLayeredCards() {
  return (
    <section className="relative bg-[#FAFAF8] py-24 sm:py-28 overflow-hidden border-y border-[#0D1B2A]/5">
      {/* Light Abstract / Map Contour Vector Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 600"
        fill="none"
        stroke="#0D1B2A"
        strokeWidth="1.2"
      >
        <path d="M-100 140 C 300 40, 600 240, 1000 110 C 1200 50, 1400 190, 1600 140" />
        <path d="M-100 270 C 250 170, 700 370, 1100 210 C 1300 150, 1500 310, 1600 270" />
        <path d="M-100 410 C 400 310, 800 490, 1200 350 C 1350 300, 1500 440, 1600 390" />
        <path d="M 200 -50 C 250 200, 150 400, 220 650" strokeDasharray="6 6" />
        <path d="M 720 -50 C 750 250, 680 450, 740 650" strokeDasharray="6 6" />
        <path d="M 1240 -50 C 1200 200, 1280 400, 1220 650" strokeDasharray="6 6" />
      </svg>

      {/* Subtle Dot Matrix Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#0D1B2A_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      {/* Subtle Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/12 size-96 rounded-full bg-[#5B21B6]/4 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/12 size-96 rounded-full bg-[#D97706]/5 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B21B6]/10 border border-[#5B21B6]/20 mb-3">
            <span className="size-1.5 rounded-full bg-[#5B21B6] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#5B21B6] font-sans">
              Flexible Framework
            </span>
          </div>
          
          <h2 className="mt-1 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0D1B2A] leading-[1.15]">
            Powering every category of Indian stays
          </h2>
          
          <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed font-sans max-w-2xl mx-auto">
            From historic royal palaces to modern transit suites, Hour Stay provides custom operational models for diverse property architectures.
          </p>
        </div>

        {/* Mobile Swipe Hint Banner */}
        <div className="flex lg:hidden items-center justify-between text-xs text-gray-400 mb-3 px-1 font-sans font-medium">
          <span>Swipe or tap to flip categories</span>
          <span className="text-[#5B21B6] font-semibold">
            5 Models
          </span>
        </div>

        {/* Exactly 5 Compact Horizontal Flip Cards in 1 Row on Desktop, Horizontal Scroll on Mobile/Tablet */}
        <div className="flex overflow-x-auto pb-6 pt-2 px-1 sm:px-0 gap-4 snap-x snap-mandatory scrollbar-none lg:grid lg:grid-cols-5 lg:overflow-visible lg:p-0 lg:gap-4 xl:gap-5">
          {categoryData.map((item, idx) => (
            <FlipFrameworkCard key={item.id} item={item} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
}
