import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, Check, ArrowRight, CalendarDays, 
  LayoutGrid, Receipt, RefreshCw, HardHat, 
  Smartphone, BarChart3, Building2, Hotel, Compass, Wallet 
} from "lucide-react";

// Import Resort Images for Visual Assets
import jaipurImg from "@/assets/resort_jaipur.png";
import palaceImg from "@/assets/palace_udaipur.png";
import beachImg from "@/assets/beach_goa.png";
import retreatImg from "@/assets/retreat_kerala.png";

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
              <p className="text-base leading-relaxed text-cream/70 sm:text-lg font-ui font-medium">
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
            <div className="lg:col-span-8 space-y-6 text-base text-[#4A4F58] font-ui leading-relaxed">
              {aboutData.story.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2.5. Mission & Vision Section */}
      <section className="bg-cream/50 py-16 border-t border-navy/5">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 text-left">
            <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-soft">
              <span className="text-xs font-bold uppercase tracking-widest text-purple">Purpose</span>
              <h3 className="mt-2 font-display text-xl font-bold text-navy">Our Mission</h3>
              <p className="mt-3 text-xs sm:text-sm text-[#4A4F58] leading-relaxed font-ui font-medium">
                {aboutData.mission}
              </p>
            </div>
            <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-soft">
              <span className="text-xs font-bold uppercase tracking-widest text-purple">Future</span>
              <h3 className="mt-2 font-display text-xl font-bold text-navy">Our Vision</h3>
              <p className="mt-3 text-xs sm:text-sm text-[#4A4F58] leading-relaxed font-ui font-medium">
                {aboutData.vision}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why Hour Stay Section (Core Pillars) */}
      <section className="bg-cream/40 py-20 border-t border-navy/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-[#5B21B6] bg-[#F3E8FF] px-3 py-1 rounded-full mb-2">
              Core Pillars
            </span>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[#0D1B2A]">
              Why Indian hotels run on Hour Stay
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                icon: LayoutGrid,
                title: "Simple Operations",
                desc: "An intuitive check-in grid that requires zero learning curve for new reception desk staff."
              },
              {
                icon: CalendarDays,
                title: "Connected Workflows",
                desc: "Seamless operations connecting your booking desk, housekeeping team, and billing folios instantly."
              },
              {
                icon: Receipt,
                title: "GST-Ready Billing",
                desc: "Automatic split tax invoices generating accurate CGST, SGST, and IGST breakdowns dynamically."
              },
              {
                icon: Wallet,
                title: "UPI-First Payments",
                desc: "Native Indian payment flows via quick UPI QR generation and instant automated reconciliation."
              },
              {
                icon: RefreshCw,
                title: "Direct & OTA Bookings",
                desc: "Real-time 2-way channel sync avoiding double bookings across MakeMyTrip, Booking.com, and Agoda."
              },
              {
                icon: Smartphone,
                title: "Better Guest Experience",
                desc: "Mobile-first pre check-in sheets, custom service requests, and digital bills."
              }
            ].map((p, idx) => {
              const PillarIcon = p.icon;
              return (
                <div
                  key={idx}
                  className="group relative rounded-2xl p-[1.5px] bg-gradient-to-br from-[#E9D5FF]/80 via-[#FCE7F3]/70 to-[#DDD6FE]/80 shadow-[0_4px_16px_rgba(91,33,182,0.06)] hover:shadow-[0_10px_24px_rgba(91,33,182,0.12)] transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="bg-white rounded-[14.5px] p-5 sm:p-6 h-full flex flex-col text-left">
                    {/* Small pastel-purple rounded icon box */}
                    <div className="size-9 sm:size-10 rounded-xl bg-[#F3E8FF] text-[#5B21B6] flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform duration-300 shadow-[0_2px_8px_rgba(91,33,182,0.08)]">
                      <PillarIcon className="size-4 sm:size-4.5 text-[#5B21B6]" />
                    </div>

                    {/* Bold Playfair Display title */}
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#0D1B2A] tracking-tight mb-1.5">
                      {p.title}
                    </h3>

                    {/* Short Inter description in muted gray */}
                    <p className="font-sans text-xs sm:text-[13px] text-[#8A8F98] leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </div>
              );
            })}
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
                  <p className="text-xs text-[#4A4F58] leading-relaxed">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. One Platform, Every Operation Section */}
      <section className="bg-cream py-20 border-t border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Operational Cycle</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              One platform, every operation
            </h2>
            <p className="mt-4 mx-auto max-w-2xl text-base text-[#4A4F58] font-ui leading-relaxed">
              See how reservations, front desk check-in, housekeeping tasks, billing invoices, and guest experience components link together in one closed loop.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5 text-center font-ui">
            {[
              { step: "01", icon: CalendarDays, label: "Reservations", desc: "Direct/OTA booking incoming" },
              { step: "02", icon: LayoutGrid, label: "Front Desk", desc: "ID capture and room assign" },
              { step: "03", icon: HardHat, label: "Housekeeping", desc: "Auto clean/dirty status toggle" },
              { step: "04", icon: Receipt, label: "GST Billing", desc: "UPI invoice folio creation" },
              { step: "05", icon: Smartphone, label: "Guest App", desc: "Pre-check-in & digital key" }
            ].map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div key={idx} className="relative bg-white border border-navy/5 p-5 rounded-xl shadow-soft">
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-gold">{item.step}</span>
                  <span className="inline-flex size-10 items-center justify-center rounded-full bg-purple/10 text-purple mb-4">
                    <ItemIcon className="size-5" />
                  </span>
                  <h4 className="text-sm font-bold text-navy">{item.label}</h4>
                  <p className="mt-1 text-[11px] text-[#4A4F58] leading-normal">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}