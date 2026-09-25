import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, ArrowRight, BookOpen } from "lucide-react";
import { blogPosts } from "@/data/hs-data";

export function InsightsStackedCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = blogPosts.length;
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Auto-advance carousel smoothly every 2.5 seconds (2500ms)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % total);
    }, 2500);

    return () => clearInterval(interval);
  }, [total]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) {
      handleNext();
    } else if (diff < -50) {
      handlePrev();
    }
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Preset badge & gradient themes for editorial cards
  const cardThemes = [
    {
      gradient: "from-[#5B21B6]/15 via-[#5B21B6]/5 to-transparent",
      badge: "bg-[#5B21B6]/10 text-[#5B21B6] border-[#5B21B6]/20",
      accent: "#5B21B6",
    },
    {
      gradient: "from-[#2563EB]/15 via-[#2563EB]/5 to-transparent",
      badge: "bg-blue-600/10 text-blue-700 border-blue-600/20",
      accent: "#2563EB",
    },
    {
      gradient: "from-[#D97706]/15 via-[#D97706]/5 to-transparent",
      badge: "bg-amber-600/10 text-amber-700 border-amber-600/20",
      accent: "#D97706",
    },
    {
      gradient: "from-[#10B981]/15 via-[#10B981]/5 to-transparent",
      badge: "bg-emerald-600/10 text-emerald-700 border-emerald-600/20",
      accent: "#10B981",
    },
    {
      gradient: "from-[#7C3AED]/15 via-[#7C3AED]/5 to-transparent",
      badge: "bg-purple-600/10 text-purple-700 border-purple-600/20",
      accent: "#7C3AED",
    },
    {
      gradient: "from-[#0D1B2A]/15 via-[#0D1B2A]/5 to-transparent",
      badge: "bg-[#0D1B2A]/10 text-[#0D1B2A] border-[#0D1B2A]/20",
      accent: "#0D1B2A",
    },
  ];

  return (
    <div
      className="relative w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ========================================================================= */}
      {/* DESKTOP & TABLET: 3-Card Stacked Overlapping Continuous Carousel            */}
      {/* ========================================================================= */}
      <div className="hidden md:block relative h-[440px] lg:h-[460px] w-full max-w-4xl mx-auto overflow-hidden">
        {blogPosts.map((post, idx) => {
          // Calculate relative position from activeIndex
          const offset = (idx - activeIndex + total) % total;
          const isCenter = offset === 0;
          const isRight = offset === 1;
          const isLeft = offset === total - 1;
          const isPreRight = offset === 2;
          const isPreLeft = offset === total - 2;

          let transform = "translateX(-50%) translateY(calc(-50% + 40px)) scale(0.65)";
          let left = "50%";
          let zIndex = 0;
          let opacity = 0;
          let pointerEvents = "none";
          let boxShadow = "none";

          if (isCenter) {
            transform = "translateX(-50%) translateY(-50%) scale(1.05)";
            left = "50%";
            zIndex = 30;
            opacity = 1;
            pointerEvents = "auto";
            boxShadow = "0 25px 45px -12px rgba(13, 27, 42, 0.22), 0 0 0 1.5px rgba(91, 33, 182, 0.18)";
          } else if (isRight) {
            transform = "translateX(-50%) translateY(calc(-50% + 12px)) scale(0.88)";
            left = "calc(50% + 205px)";
            zIndex = 10;
            opacity = 0.78;
            pointerEvents = "auto";
            boxShadow = "0 12px 26px -8px rgba(13, 27, 42, 0.12), 0 0 0 1px rgba(13, 27, 42, 0.06)";
          } else if (isLeft) {
            transform = "translateX(-50%) translateY(calc(-50% + 12px)) scale(0.88)";
            left = "calc(50% - 205px)";
            zIndex = 10;
            opacity = 0.78;
            pointerEvents = "auto";
            boxShadow = "0 12px 26px -8px rgba(13, 27, 42, 0.12), 0 0 0 1px rgba(13, 27, 42, 0.06)";
          } else if (isPreRight) {
            transform = "translateX(-50%) translateY(calc(-50% + 28px)) scale(0.72)";
            left = "calc(50% + 350px)";
            zIndex = 5;
            opacity = 0;
            pointerEvents = "none";
          } else if (isPreLeft) {
            transform = "translateX(-50%) translateY(calc(-50% + 28px)) scale(0.72)";
            left = "calc(50% - 350px)";
            zIndex = 5;
            opacity = 0;
            pointerEvents = "none";
          }

          const theme = cardThemes[idx % cardThemes.length];

          return (
            <div
              key={post.slug}
              onClick={() => {
                if (isRight) handleNext();
                if (isLeft) handlePrev();
              }}
              style={{
                position: "absolute",
                top: "50%",
                left,
                transform,
                zIndex,
                opacity,
                pointerEvents,
                boxShadow,
                transition: "all 700ms cubic-bezier(0.25, 1, 0.5, 1)",
              }}
              className={`w-[285px] md:w-[305px] lg:w-[325px] h-[355px] lg:h-[375px] rounded-3xl bg-white border border-[#0D1B2A]/10 p-5 lg:p-6 flex flex-col justify-between cursor-pointer overflow-hidden ${
                isCenter ? "ring-1 ring-[#5B21B6]/20 cursor-default" : "hover:opacity-95"
              }`}
            >
              {/* Top Ambient Glow Strip */}
              <div
                className={`absolute top-0 inset-x-0 h-28 bg-gradient-to-b ${theme.gradient} pointer-events-none opacity-80`}
              />

              {/* Top Meta Info (Tag & Read Time) */}
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider font-sans ${theme.badge}`}
                  >
                    {post.tag}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 font-sans">
                    <Clock className="size-3.5 text-[#5B21B6]" /> {post.readTime}
                  </span>
                </div>

                {/* Title in Playfair Display */}
                <h3
                  className={`mt-2 font-serif text-lg lg:text-xl font-bold text-[#0D1B2A] leading-snug tracking-tight transition-colors line-clamp-2 ${
                    isCenter ? "hover:text-[#5B21B6]" : ""
                  }`}
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  <Link to="/blog/$slug" params={{ slug: post.slug }} className="hover:text-[#5B21B6] transition-colors">
                    {post.title}
                  </Link>
                </h3>

                {/* Body excerpt in Inter */}
                <p
                  className="mt-2.5 text-xs lg:text-[12.5px] leading-relaxed text-gray-600 font-sans line-clamp-3"
                  style={{ fontFamily: '"Inter", sans-serif' }}
                >
                  {post.excerpt}
                </p>
              </div>

              {/* Bottom Editorial Footer: Author & Read Link */}
              <div className="relative z-10 mt-5 pt-3.5 border-t border-[#0D1B2A]/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-[#0D1B2A] text-[#FFF7E6] flex items-center justify-center font-bold text-xs font-serif shadow-sm shrink-0 border border-[#F5C06A]/40">
                    {post.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0D1B2A] leading-tight font-sans">{post.author}</p>
                    <p className="text-[10px] text-gray-500 font-sans">{post.role || post.date}</p>
                  </div>
                </div>

                <Link
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11.5px] font-bold text-[#5B21B6] bg-[#5B21B6]/5 hover:bg-[#5B21B6] hover:text-[#FFF7E6] transition-all duration-300 group"
                >
                  <span>Read</span>
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE: Clean Single-Card Slider with Swipe & Smooth Auto Transitions      */}
      {/* ========================================================================= */}
      <div className="block md:hidden px-4">
        <div className="relative overflow-hidden rounded-3xl bg-white border border-[#0D1B2A]/10 p-5 shadow-xl max-w-[295px] sm:max-w-[325px] mx-auto min-h-[330px] flex flex-col justify-between transition-all duration-500">
          {(() => {
            const currentPost = blogPosts[activeIndex];
            const theme = cardThemes[activeIndex % cardThemes.length];

            return (
              <>
                <div
                  className={`absolute top-0 inset-x-0 h-24 bg-gradient-to-b ${theme.gradient} pointer-events-none opacity-80`}
                />

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider font-sans ${theme.badge}`}
                    >
                      {currentPost.tag}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-500 font-sans">
                      <Clock className="size-3 text-[#5B21B6]" /> {currentPost.readTime}
                    </span>
                  </div>

                  <h3
                    className="mt-2 font-serif text-base sm:text-lg font-bold text-[#0D1B2A] leading-snug"
                    style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                  >
                    <Link to="/blog/$slug" params={{ slug: currentPost.slug }}>
                      {currentPost.title}
                    </Link>
                  </h3>

                  <p
                    className="mt-2.5 text-xs leading-relaxed text-gray-600 font-sans line-clamp-3"
                    style={{ fontFamily: '"Inter", sans-serif' }}
                  >
                    {currentPost.excerpt}
                  </p>
                </div>

                <div className="relative z-10 mt-5 pt-3.5 border-t border-[#0D1B2A]/5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-7 rounded-full bg-[#0D1B2A] text-[#FFF7E6] flex items-center justify-center font-bold text-xs font-serif shrink-0 border border-[#F5C06A]/40">
                      {currentPost.author
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0D1B2A] leading-tight font-sans">{currentPost.author}</p>
                      <p className="text-[10px] text-gray-500 font-sans">{currentPost.date}</p>
                    </div>
                  </div>

                  <Link
                    to="/blog/$slug"
                    params={{ slug: currentPost.slug }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#5B21B6]"
                  >
                    Read <ArrowRight className="size-3" />
                  </Link>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ACTION LINK                                                        */}
      {/* ========================================================================= */}
      <div className="mt-8 flex items-center justify-center">
        <Link
          to="/blog"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-[#0D1B2A] bg-white border border-[#0D1B2A]/10 hover:border-[#5B21B6]/30 hover:text-[#5B21B6] shadow-sm hover:shadow transition-all duration-200"
        >
          <BookOpen className="size-4 text-[#F5C06A]" />
          <span>Explore All Journal Insights</span>
          <ArrowRight className="size-3.5 text-[#5B21B6]" />
        </Link>
      </div>
    </div>
  );
}
