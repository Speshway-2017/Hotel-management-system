import React from "react";
import retreatKerala from "@/assets/retreat_kerala.png";

export function AuthLayout({
  image = retreatKerala,
  badge = "Hour Stay Experience",
  description = "Indulge in premium boutique hospitality shaped around your schedule. Unlock flexible workspace bookings, top-tier property amenities, and a seamless reception experience.",
  children
}) {
  return (
    <main className="relative min-h-screen w-full font-ui overflow-x-hidden bg-navy selection:bg-gold selection:text-navy flex flex-col justify-center">
      {/* 100% Viewport Full-Screen Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center transition-transform duration-[12000ms] ease-out scale-125 hover:scale-135 pointer-events-none"
        style={{ 
          backgroundImage: `url(${image})` 
        }} 
      />
      
      {/* Full-Screen Subtle Dark Overlay for high image visibility and readability */}
      <div className="fixed inset-0 bg-gradient-to-r from-navy/85 via-navy/55 to-navy/70 pointer-events-none" />

      {/* Main Full-Screen Layout Container */}
      <div className="relative z-10 min-h-screen w-full flex flex-col md:flex-row items-center justify-between p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20 gap-8">
        
        {/* Left Side: Fixed Brand Content (Consistent across all Auth pages) */}
        <div className="text-white max-w-xl space-y-4 md:space-y-6 animate-fade-in drop-shadow-lg hidden md:block my-auto text-left">
          <span className="inline-flex items-center text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-gold bg-navy/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-gold/30">
            {badge}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-cream leading-[1.15]">
            <span className="block">Welcome to</span>
            <span className="block text-gold mt-1 sm:mt-2">Hour Stay</span>
          </h1>
          <div className="h-[3px] w-16 bg-gold/90 rounded-full my-4" />
          <p className="text-xs sm:text-sm text-cream/80 leading-relaxed font-normal max-w-lg">
            {description}
          </p>
        </div>

        {/* Right Side: Floating Auth Card (Changes per page) */}
        <div className="w-full md:max-w-[480px] flex justify-center md:justify-end items-center my-auto animate-fade-up">
          {children}
        </div>
      </div>
    </main>
  );
}
