import React, { useState, useEffect, useRef } from "react";
import { QrCode, Landmark, Zap, Users, Check } from "lucide-react";

export const soilCardsData = [
  {
    step: "01",
    title: "UPI Settlement Pipeline",
    desc: "Incorporate instant dynamic UPI QR codes at checkout. Reduce gateway commissions by up to 82% with automated real-time reconciliation.",
    tag: "Instant Settlement",
    icon: QrCode,
    // Emerald / Mint Theme
    gradient: "from-[#059669] via-[#10B981] to-[#34D399]",
    glowShadow: "shadow-[0_6px_20px_rgba(16,185,129,0.25)]",
    iconBg: "bg-[#ECFDF5]",
    iconColor: "text-[#059669]",
    iconBorder: "border-[#A7F3D0]",
    tagBg: "bg-[#ECFDF5]",
    tagColor: "text-[#059669]",
    tagBorder: "border-[#A7F3D0]",
  },
  {
    step: "02",
    title: "India-First GST Engine",
    desc: "Automated split billing mapping 12% and 18% tax tiers, itemizing SAC/HSN codes dynamically across room stays and dining folios.",
    tag: "Tax Compliance",
    icon: Landmark,
    // Hour Stay Royal Purple Theme
    gradient: "from-[#5B21B6] via-[#7C3AED] to-[#A78BFA]",
    glowShadow: "shadow-[0_6px_20px_rgba(91,33,182,0.25)]",
    iconBg: "bg-[#F3E8FF]",
    iconColor: "text-[#5B21B6]",
    iconBorder: "border-[#DDD6FE]",
    tagBg: "bg-[#F3E8FF]",
    tagColor: "text-[#5B21B6]",
    tagBorder: "border-[#DDD6FE]",
  },
  {
    step: "03",
    title: "Offline Local Cache",
    desc: "Power cuts and internet drops won't freeze your lobby. Front-desk operations run seamlessly offline, syncing cloud data on reconnect.",
    tag: "Zero Downtime",
    icon: Zap,
    // Jaipur Amber / Gold Theme
    gradient: "from-[#D97706] via-[#F59E0B] to-[#FDE68A]",
    glowShadow: "shadow-[0_6px_20px_rgba(217,119,6,0.25)]",
    iconBg: "bg-[#FEF3C7]",
    iconColor: "text-[#D97706]",
    iconBorder: "border-[#FDE68A]",
    tagBg: "bg-[#FEF3C7]",
    tagColor: "text-[#B45309]",
    tagBorder: "border-[#FDE68A]",
  },
  {
    step: "04",
    title: "Multi-Lingual Staff & CRM",
    desc: "Clean dual-language terminology for rapid employee onboarding, paired with rich guest preference, stay history, and VIP profile sheets.",
    tag: "Localized Care",
    icon: Users,
    // Deep Navy / Cobalt Theme
    gradient: "from-[#0D1B2A] via-[#1E3A8A] to-[#3B82F6]",
    glowShadow: "shadow-[0_6px_20px_rgba(13,27,42,0.25)]",
    iconBg: "bg-[#DBEAFE]",
    iconColor: "text-[#1E40AF]",
    iconBorder: "border-[#BFDBFE]",
    tagBg: "bg-[#DBEAFE]",
    tagColor: "text-[#1E40AF]",
    tagBorder: "border-[#BFDBFE]",
  },
];

function CompactCircularCard({ item, idx }) {
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

  const Icon = item.icon;
  const staggerDelay = `${idx * 80}ms`;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: staggerDelay }}
      className={`group relative flex items-center justify-center p-1.5 sm:p-2 transition-all duration-700 ease-out cursor-default ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
      }`}
    >
      {/* Bold Colorful Curved/Pointed Accent Shape Behind the Card */}
      <div
        className={`absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 size-38 sm:size-42 md:size-45 rounded-full rounded-tr-[7px] sm:rounded-tr-[10px] bg-gradient-to-br ${item.gradient} ${item.glowShadow} transition-all duration-500 ease-out group-hover:scale-105 group-hover:rotate-6 z-0 pointer-events-none`}
      >
        {/* Step Number in Top-Right Protrusion */}
        <span className="absolute top-2 right-2.5 sm:top-2.5 sm:right-3 font-mono text-xs sm:text-sm font-black text-white/95 select-none tracking-tight">
          {item.step}
        </span>
      </div>

      {/* Compact Circular White Card */}
      <div
        className="relative z-10 size-35 sm:size-39 md:size-42 rounded-full bg-white border border-slate-200/90 shadow-[0_6px_20px_rgba(13,27,42,0.06)] group-hover:shadow-[0_14px_30px_rgba(13,27,42,0.12)] p-2.5 sm:p-3 md:p-3.5 flex flex-col items-center justify-center text-center transition-all duration-500 ease-out group-hover:-translate-y-1"
      >
        {/* Small Relevant Icon */}
        <div
          className={`size-6 sm:size-6.5 rounded-full flex items-center justify-center ${item.iconBg} ${item.iconColor} border ${item.iconBorder} mb-1 shadow-xs transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
        >
          <Icon className="size-3 sm:size-3.5" strokeWidth={2} />
        </div>

        {/* Step Title */}
        <h3 className="font-display text-[9.5px] sm:text-[10.5px] md:text-[11.5px] font-bold text-navy tracking-tight leading-tight px-1">
          {item.title}
        </h3>

        {/* Short Description */}
        <p className="mt-0.5 text-[7.5px] sm:text-[8px] md:text-[8.5px] leading-snug text-gray-600 font-sans max-w-[110px] sm:max-w-[125px] line-clamp-2 font-normal">
          {item.desc}
        </p>

        {/* Tag Badge */}
        <span
          className={`mt-1 inline-block text-[6.5px] sm:text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${item.tagBg} ${item.tagColor} border ${item.tagBorder}`}
        >
          {item.tag}
        </span>
      </div>
    </div>
  );
}

export function SoilCircularCards() {
  return (
    <section className="relative bg-white py-16 sm:py-20 overflow-hidden border-y border-navy/5">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Two-Column Layout on Desktop: Left text & Right 2x2 grid */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          
          {/* Left Column: Heading & Description */}
          <div className="lg:col-span-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B21B6]/10 border border-[#5B21B6]/20 mb-3">
              <span className="size-1.5 rounded-full bg-[#5B21B6] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#5B21B6] font-sans">
                Built for the Soil
              </span>
            </div>

            <h2 className="mt-1 font-display text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-navy leading-[1.18]">
              Connected hotel operations engineered for India
            </h2>

            <p className="mt-4 text-sm sm:text-base text-gray-600 leading-relaxed font-sans">
              Hospitality platforms built in the West often fail to match the real-world operational challenges of Indian properties. Hour Stay bridges the gap with a hyper-localized feature set.
            </p>

            {/* Quick Feature Checklist */}
            <div className="mt-6 space-y-3 font-sans">
              {[
                "UPI-first instantaneous QR checkout pipeline",
                "Automated GST dual tax tiers (12% & 18%)",
                "Zero-downtime offline local cache resilience",
                "Intuitive dual-language staff onboarding"
              ].map((feat, fIdx) => (
                <div key={fIdx} className="flex items-center gap-2.5 text-xs sm:text-sm text-navy font-semibold">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#5B21B6]/10 text-[#5B21B6]">
                    <Check className="size-3.5 stroke-[2.5]" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: 4 Feature Cards in Compact 2x2 Grid */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4.5 lg:gap-5 justify-items-center items-center w-full max-w-md">
              {soilCardsData.map((item, idx) => (
                <CompactCircularCard key={item.step} item={item} idx={idx} />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
