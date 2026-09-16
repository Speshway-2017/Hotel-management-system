import React from "react";
import { Hotel, Sparkles, Landmark, ShieldCheck, Users, ArrowUpRight } from "lucide-react";

export const categoryData = [
  {
    id: "01",
    name: "Hotels",
    description: "City business hotels, airport transit stays, and commercial lodging hubs.",
    tag: "Business & Transit",
    icon: Hotel,
    // Purple Theme (#5B21B6)
    backBg: "bg-[#5B21B6]/10",
    backBorder: "border-[#5B21B6]/25",
    iconBg: "bg-[#5B21B6]/10 text-[#5B21B6]",
    badgeBg: "bg-[#5B21B6]/10 text-[#5B21B6] border-[#5B21B6]/25",
    tagColor: "text-[#5B21B6]",
    accentGlow: "rgba(91, 33, 182, 0.18)",
    initialTilt: "-rotate-[2.5deg]",
    hoverTilt: "group-hover:-rotate-[4.5deg] group-hover:scale-[1.02]",
  },
  {
    id: "02",
    name: "Resorts",
    description: "Sprawling leisure retreats, beachfront getaways, and hillside spa locations.",
    tag: "Experiential Luxury",
    icon: Sparkles,
    // Gold Theme (#F5C06A)
    backBg: "bg-[#F5C06A]/20",
    backBorder: "border-[#F5C06A]/35",
    iconBg: "bg-[#F5C06A]/20 text-[#0D1B2A]",
    badgeBg: "bg-[#F5C06A]/25 text-[#0D1B2A] border-[#F5C06A]/40",
    tagColor: "text-[#0D1B2A]",
    accentGlow: "rgba(245, 192, 106, 0.25)",
    initialTilt: "rotate-[2.5deg]",
    hoverTilt: "group-hover:rotate-[4.5deg] group-hover:scale-[1.02]",
  },
  {
    id: "03",
    name: "Boutique Havelis",
    description: "Historic palaces, heritage properties, and design-forward boutique villas.",
    tag: "Cultural Heritage",
    icon: Landmark,
    // Pink / Blush Theme (#FF6B8B)
    backBg: "bg-[#FF6B8B]/12",
    backBorder: "border-[#FF6B8B]/25",
    iconBg: "bg-[#FF6B8B]/12 text-[#FF6B8B]",
    badgeBg: "bg-[#FF6B8B]/12 text-[#FF6B8B] border-[#FF6B8B]/30",
    tagColor: "text-[#FF6B8B]",
    accentGlow: "rgba(255, 107, 139, 0.20)",
    initialTilt: "-rotate-[2deg]",
    hoverTilt: "group-hover:-rotate-[4deg] group-hover:scale-[1.02]",
  },
  {
    id: "04",
    name: "Lodges & Stays",
    description: "Mid-scale highway retreats, pilgrimage accommodation, and homestays.",
    tag: "Comfort Stays",
    icon: ShieldCheck,
    // Deep Navy Theme (#0D1B2A)
    backBg: "bg-[#0D1B2A]/10",
    backBorder: "border-[#0D1B2A]/20",
    iconBg: "bg-[#0D1B2A]/10 text-[#0D1B2A]",
    badgeBg: "bg-[#0D1B2A]/10 text-[#0D1B2A] border-[#0D1B2A]/25",
    tagColor: "text-[#0D1B2A]",
    accentGlow: "rgba(13, 27, 42, 0.18)",
    initialTilt: "rotate-[2deg]",
    hoverTilt: "group-hover:rotate-[4deg] group-hover:scale-[1.02]",
  },
  {
    id: "05",
    name: "Multi-Property Chains",
    description: "Consolidated enterprise control across multiple cities and property codes.",
    tag: "Enterprise Scale",
    icon: Users,
    // Purple & Pink Hybrid Theme (#5B21B6 & #FF6B8B)
    backBg: "bg-gradient-to-br from-[#5B21B6]/12 via-[#FF6B8B]/10 to-[#0D1B2A]/10",
    backBorder: "border-[#5B21B6]/25",
    iconBg: "bg-[#5B21B6]/10 text-[#5B21B6]",
    badgeBg: "bg-[#0D1B2A] text-[#FFF7E6] border-[#0D1B2A]",
    tagColor: "text-[#5B21B6]",
    accentGlow: "rgba(91, 33, 182, 0.18)",
    initialTilt: "-rotate-[2.5deg]",
    hoverTilt: "group-hover:-rotate-[4.5deg] group-hover:scale-[1.02]",
  },
];

export function CategoryLayeredCards() {
  return (
    <section className="relative bg-white py-24 sm:py-28 overflow-hidden border-y border-[#0D1B2A]/5">
      {/* Subtle Ambient Background Accents */}
      <div className="absolute top-0 left-1/4 size-96 rounded-full bg-[#5B21B6]/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-[#F5C06A]/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5B21B6]/10 border border-[#5B21B6]/20 mb-3">
            <span className="size-1.5 rounded-full bg-[#5B21B6] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#5B21B6] font-sans">
              Flexible Framework
            </span>
          </div>
          
          <h2
            className="mt-1 font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0D1B2A] leading-[1.15]"
            style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
          >
            Powering every category of Indian stays
          </h2>
          
          <p
            className="mt-4 text-sm sm:text-base text-[#4A4F58] leading-relaxed font-sans max-w-2xl mx-auto"
            style={{ fontFamily: '"Inter", sans-serif' }}
          >
            From historic royal palaces to modern transit suites, Hour Stay provides custom operational models for diverse property architectures.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* CARDS CONTAINER: Horizontal Layout with Layered 3D Paper Effect           */}
        {/* ========================================================================= */}
        <div className="mt-16 sm:mt-20">
          {/* Mobile Scroll Indicator Banner */}
          <div className="flex sm:hidden items-center justify-between text-xs text-[#8A8F98] mb-3 px-1 font-sans font-medium">
            <span>Swipe categories</span>
            <span className="text-[#5B21B6] flex items-center gap-1 font-semibold">
              5 Models <ArrowUpRight className="size-3" />
            </span>
          </div>

          {/* Horizontal Grid / Responsive Scrollable Layout */}
          <div className="flex overflow-x-auto pb-8 pt-4 px-2 sm:px-0 gap-5 sm:gap-6 snap-x snap-mandatory scrollbar-none sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:overflow-visible sm:pb-0">
            {categoryData.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  className="group relative w-[275px] shrink-0 snap-center sm:w-auto sm:shrink flex flex-col pt-3 pb-2 cursor-pointer"
                >
                  {/* ========================================================= */}
                  {/* TILTED BACK LAYER (Colored 3D Paper Shadow)               */}
                  {/* ========================================================= */}
                  <div
                    className={`absolute inset-0 rounded-3xl border ${item.backBg} ${item.backBorder} ${item.initialTilt} ${item.hoverTilt} transition-transform duration-500 ease-out shadow-sm origin-center pointer-events-none`}
                    style={{
                      boxShadow: `0 12px 28px -10px ${item.accentGlow}`,
                    }}
                  />

                  {/* ========================================================= */}
                  {/* FRONT CARD (Crisp White Floating Infographic Paper Card)  */}
                  {/* ========================================================= */}
                  <div className="relative z-10 flex flex-col justify-between h-full min-h-[340px] lg:min-h-[350px] rounded-3xl bg-white border border-[#0D1B2A]/8 p-6 shadow-[0_10px_28px_-8px_rgba(13,27,42,0.08)] transition-all duration-400 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_22px_45px_-12px_rgba(13,27,42,0.16)] group-hover:border-[#0D1B2A]/15 overflow-hidden">
                    {/* Top Subtle Light Gradient Overlay */}
                    <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/[0.015] to-transparent pointer-events-none" />

                    <div>
                      {/* Card Header: Minimal Icon & Circular Number Badge */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`size-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-xs ${item.iconBg}`}
                        >
                          <Icon className="size-6 stroke-[1.8]" />
                        </div>

                        {/* Circular Number Badge */}
                        <div
                          className={`size-8 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 group-hover:scale-105 shadow-xs ${item.badgeBg}`}
                        >
                          {item.id}
                        </div>
                      </div>

                      {/* Tag / Subtitle */}
                      <span
                        className={`mt-6 block text-[11px] font-bold uppercase tracking-wider font-sans ${item.tagColor}`}
                      >
                        {item.tag}
                      </span>

                      {/* Category Name in Playfair Display */}
                      <h3
                        className="mt-1.5 font-serif text-xl lg:text-[21px] font-bold text-[#0D1B2A] tracking-tight leading-snug group-hover:text-[#5B21B6] transition-colors duration-300"
                        style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                      >
                        {item.name}
                      </h3>

                      {/* Short Description in Inter */}
                      <p
                        className="mt-2.5 text-xs lg:text-[12.5px] leading-relaxed text-[#4A4F58] font-sans font-normal"
                        style={{ fontFamily: '"Inter", sans-serif' }}
                      >
                        {item.description}
                      </p>
                    </div>

                    {/* Bottom Polished Paper Detail */}
                    <div className="mt-6 pt-3.5 border-t border-[#0D1B2A]/6 flex items-center justify-between">
                      <span className="text-[10.5px] font-medium text-[#8A8F98] font-sans">
                        Operational Model
                      </span>
                      <div className="size-1.5 rounded-full bg-[#0D1B2A]/20 group-hover:bg-[#5B21B6] transition-colors" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
