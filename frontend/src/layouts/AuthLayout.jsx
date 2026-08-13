import React from "react";
import retreatKerala from "@/assets/retreat_kerala.png";

export function AuthLayout({
  image = retreatKerala,
  badge = "Hour Stay Experience",
  title = "Welcome to",
  titleHighlight = "Hour Stay",
  subtitle = "",
  description = "Indulge in premium boutique hospitality shaped around your schedule. Unlock flexible workspace bookings, top-tier property amenities, and a seamless reception experience.",
  children
}) {
  return (
    <main className="relative min-h-screen w-full font-ui overflow-x-hidden bg-navy selection:bg-gold selection:text-navy">
      {/* 100% Viewport Full-Screen Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center transition-transform duration-[12000ms] ease-out scale-125 hover:scale-135 pointer-events-none"
        style={{ 
          backgroundImage: `url(${image})` 
        }} 
      />
      
      {/* Full-Screen Subtle Dark Overlay for high image visibility and readability */}
      <div className="fixed inset-0 bg-gradient-to-r from-navy/80 via-navy/40 to-navy/60 pointer-events-none" />

      {/* Main Full-Screen Layout Container */}
      <div className="relative z-10 min-h-screen w-full flex flex-col md:flex-row items-center justify-between p-6 sm:p-10 md:p-14 lg:p-20 gap-8">
        
        {/* Left Side: Brand Text Overlay (Visible on Desktop & Tablet) */}
        <div className="text-white max-w-xl space-y-4 md:space-y-6 animate-fade-in drop-shadow-lg hidden md:block my-auto">
          <span className="inline-flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-gold bg-navy/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-gold/30">
            {badge}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-cream leading-[1.15]">
            {title} <span className="text-gold">{titleHighlight}</span>
          </h1>
          {subtitle && (
            <p className="text-base sm:text-lg md:text-xl font-medium text-cream/90 tracking-wide italic font-display">
              {subtitle}
            </p>
          )}
          <div className="h-[3px] w-16 bg-gold/90 rounded-full my-4" />
          <p className="text-xs sm:text-sm text-cream/80 leading-relaxed font-normal max-w-lg">
            {description}
          </p>
        </div>

        {/* Right Side: Floating Auth Card Overlapping the Right Side of the Image */}
        <div className="w-full md:max-w-[480px] flex justify-center md:justify-end items-center my-auto animate-fade-up">
          {children}
        </div>
      </div>
    </main>
  );
}
