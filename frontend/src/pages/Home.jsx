import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ArrowRight, 
  CalendarDays, 
  MapPin, 
  ShieldCheck, 
  Sparkles, 
  Star, 
  Users, 
  RefreshCw, 
  QrCode, 
  ClipboardList, 
  TrendingUp, 
  Hotel, 
  Landmark, 
  Zap, 
  Check, 
  ChevronRight, 
  MessageSquare, 
  CreditCard, 
  Receipt,
  FileText,
  Smartphone,
  ChevronLeft,
  Search as SearchIcon,
  ShieldAlert,
  Clock,
  BookOpen
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, searchResults, blogPosts } from "@/data/hs-data";
import { InsightsStackedCarousel } from "@/components/hs/InsightsStackedCarousel";
import { CategoryLayeredCards } from "@/components/hs/CategoryLayeredCards";

// Import Slider Images
import jaipurImg from "@/assets/resort_jaipur.png";
import goaImg from "@/assets/beach_goa.png";
import palaceImg from "@/assets/palace_udaipur.png";
import keralaImg from "@/assets/retreat_kerala.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hour Stay — Premium Hotel Management for Indian Hospitality" },
      {
        name: "description",
        content: "Hour Stay unifies front desk, reservations, revenue and guest experience for heritage havelis, city hotels and resorts across India."
      },
      { property: "og:title", content: "Hour Stay — Premium Hotel Management" },
      {
        property: "og:description",
        content: "One calm workspace for front desk, reservations, revenue and guests."
      }
    ]
  }),
  component: Home
});

const slides = [
  {
    image: jaipurImg,
    title: "Hour Stay Rambagh Residency",
    location: "Jaipur, Rajasthan",
    tagline: "Heritage Haveli Excellence"
  },
  {
    image: goaImg,
    title: "Hour Stay Candolim Beach Resort",
    location: "Candolim, Goa",
    tagline: "Modern Tropical Paradise"
  },
  {
    image: palaceImg,
    title: "Hour Stay Lake Palace View",
    location: "Udaipur, Rajasthan",
    tagline: "Regal Lakeside Luxury"
  },
  {
    image: keralaImg,
    title: "Hour Stay Backwater Retreat",
    location: "Alleppey, Kerala",
    tagline: "Serene Coconut Palms & Canals"
  }
];


function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dynamicSlides, setDynamicSlides] = useState(slides);
  const [homeData, setHomeData] = useState({
    title: "The calm operating system for Indian hospitality",
    description: "Hour Stay unifies reservations, front desk registration, GST tax slab billing, OTA inventory sync, and mobile-first guest experiences. Built for how Indian hotels actually operate."
  });
  const [settings, setSettings] = useState({
    publicBookingsEnabled: true
  });
  const [selectedProperty, setSelectedProperty] = useState(null);

  useEffect(() => {
    publicService.getHome()
      .then(res => {
        if (res.success && res.data) {
          const config = res.data;
          setHomeData({
            title: config.title || "The calm operating system for Indian hospitality",
            description: config.excerpt || "Hour Stay unifies reservations, front desk registration, GST tax slab billing, OTA inventory sync, and mobile-first guest experiences. Built for how Indian hotels actually operate."
          });
        }
      })
      .catch(err => {});

    publicService.getSettings()
      .then(res => {
        if (res.success && res.data && res.data.content) {
          const parsed = JSON.parse(res.data.content);
          setSettings({
            publicBookingsEnabled: parsed.publicBookingsEnabled !== false
          });
        }
      })
      .catch(err => {});

    const fetchActiveProperty = () => {
      const activeId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
      publicService.getProperty(activeId)
        .then(res => {
          if (res.success && res.data) {
            setSelectedProperty(res.data);
          }
        })
        .catch(() => {});
    };

    fetchActiveProperty();
    window.addEventListener('selected-property-changed', fetchActiveProperty);

    publicService.getProperties()
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          const newSlides = res.data.map(p => {
            let img = jaipurImg;
            if (p._id === 'HS-UDA' || p.id === 'HS-UDA') img = palaceImg;
            else if (p._id === 'HS-GOA' || p.id === 'HS-GOA') img = goaImg;
            else if (p._id === 'HS-KER' || p.id === 'HS-KER') img = keralaImg;

            if (p.settings?.logo) img = p.settings.logo;
            else if (p.settings?.photos && p.settings.photos.length > 0) img = p.settings.photos[0];

            return {
              image: img,
              title: p.name,
              location: p.city,
              tagline: p.settings?.classification || "Boutique Luxury Hotel",
              id: p._id || p.id
            };
          });
          setDynamicSlides(newSlides);
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('selected-property-changed', fetchActiveProperty);
    };
  }, []);

  // States for OTA Sync Interaction
  const [otaState, setOtaState] = useState("idle"); // idle, booking_made, syncing_pms, syncing_all, synced
  const [activeOtaChannel, setActiveOtaChannel] = useState(null);

  // States for Hero Room Search (unfilled by default)
  const [heroLocation, setHeroLocation] = useState("");
  const [heroCheckIn, setHeroCheckIn] = useState("");
  const [heroCheckOut, setHeroCheckOut] = useState("");

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    if (heroLocation) localStorage.setItem('search_location', heroLocation);
    if (heroCheckIn) localStorage.setItem('booking_check_in', heroCheckIn);
    if (heroCheckOut) localStorage.setItem('booking_check_out', heroCheckOut);

    const query = new URLSearchParams();
    if (heroLocation) query.set('location', heroLocation);
    if (heroCheckIn) query.set('checkIn', heroCheckIn);
    if (heroCheckOut) query.set('checkOut', heroCheckOut);

    window.location.href = `/search?${query.toString()}`;
  };



  // Slide Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % dynamicSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [dynamicSlides.length]);

  // Trigger OTA Mock Booking Simulation
  const triggerOtaSync = (channelName) => {
    if (otaState !== "idle") return;
    setActiveOtaChannel(channelName);
    setOtaState("booking_made");

    // Timeline of simulation
    setTimeout(() => {
      setOtaState("syncing_pms");
      setTimeout(() => {
        setOtaState("syncing_all");
        setTimeout(() => {
          setOtaState("synced");
          setTimeout(() => {
            setOtaState("idle");
            setActiveOtaChannel(null);
          }, 3000);
        }, 1500);
      }, 1500);
    }, 1200);
  };



  return (
    <SiteLayout>
      {/* Dynamic Hero Slider */}
      <section className="relative w-full overflow-hidden bg-navy py-12 md:py-20 lg:py-24">
        <div className="absolute inset-0 z-0">
          {dynamicSlides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
              }`}
            >
              <img
                src={slide.image}
                alt={slide.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-r from-navy/95 via-navy/70 to-transparent" />
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-10 px-4 sm:px-6">
          <div>
            <h1 className="font-display text-4xl leading-[1.1] font-bold text-cream sm:text-6xl">
              {homeData.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-cream/80 sm:text-xl font-ui">
              {homeData.description}
            </p>
           
          </div>

          {/* Quick Search Card embedded directly inside the hero flow */}
          <div className="w-full max-w-4xl">
            <div className="rounded-xl border border-cream/10 bg-white/95 p-5 shadow-lift sm:p-6 backdrop-blur-sm">
              {!settings.publicBookingsEnabled ? (
                <div className="text-center py-4 text-navy font-semibold flex flex-col items-center gap-1.5 font-ui">
                  <ShieldAlert className="size-8 text-gold" />
                  <p className="text-sm">Online direct bookings are temporarily disabled by the administrator.</p>
                  <p className="text-xs text-muted-foreground font-medium">Please contact our reservation desk or front office directly to book a room.</p>
                </div>
              ) : (
                <form onSubmit={handleHeroSearchSubmit} className="grid gap-4 sm:grid-cols-4">
                  <label className="block text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy/70 font-ui">Destination</span>
                    <span className="relative mt-1.5 block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-navy/50" />
                      <Input 
                        value={heroLocation}
                        onChange={e => setHeroLocation(e.target.value)}
                        className="h-12 border-navy/10 bg-cream/10 pl-10 focus-visible:ring-gold text-navy font-semibold text-xs" 
                        placeholder="Hyderabad, Jaipur, Goa..." 
                      />
                    </span>
                  </label>
                  <label className="block text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy/70 font-ui">Check-in Date</span>
                    <span className="relative mt-1.5 block">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-navy/50" />
                      <Input 
                        type="date" 
                        value={heroCheckIn}
                        onChange={e => setHeroCheckIn(e.target.value)}
                        className="h-12 border-navy/10 bg-cream/10 pl-10 focus-visible:ring-gold text-xs text-navy font-semibold" 
                      />
                    </span>
                  </label>
                  <label className="block text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy/70 font-ui">Check-out Date</span>
                    <span className="relative mt-1.5 block">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-navy/50" />
                      <Input 
                        type="date" 
                        value={heroCheckOut}
                        onChange={e => setHeroCheckOut(e.target.value)}
                        className="h-12 border-navy/10 bg-cream/10 pl-10 focus-visible:ring-gold text-xs text-navy font-semibold" 
                      />
                    </span>
                  </label>
                  <div className="flex items-end">
                    <Button 
                      type="submit"
                      className="h-12 w-full rounded-md bg-navy text-cream hover:bg-navy/90 font-bold gap-2 shadow-soft cursor-pointer text-xs border-none"
                    >
                      <SearchIcon className="size-4" /> Search Rooms
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Slider Caption (Dots Removed) */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end border-t border-cream/15 pt-6">
            {(() => {
              const activeSlide = dynamicSlides[currentSlide] || dynamicSlides[0] || slides[0] || {};
              return (
                <div className="text-right text-xs sm:text-sm">
                  <span className="text-gold font-semibold tracking-wider uppercase">{activeSlide.tagline || "Luxury Stays"}</span>
                  <span className="mx-2 text-cream/35">|</span>
                  <span className="text-cream/70 font-ui">{activeSlide.title || "Hour Stay"}, {activeSlide.location || "India"}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Property Types / Categories Section */}
      <CategoryLayeredCards />

      {/* Why Hour Stay (Built for India) Section */}
      <section className="bg-white border-y border-navy/5 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-widest text-purple">Built for the Soil</span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
                Connected hotel operations engineered for India
              </h2>
              <p className="mt-4 text-base text-[#4A4F58] leading-relaxed font-ui">
                Hospitality platforms built in the West often fail to match the real-world operational challenges of Indian properties. Hour Stay bridges the gap with a hyper-localized feature set.
              </p>

              <div className="mt-8 space-y-6">
                {[
                  {
                    title: "UPI-First Settlement Pipeline",
                    desc: "Skip card commissions. Generate instant dynamic UPI QR codes on front-desk tablets or send payment request links directly to guest WhatsApp."
                  },
                  {
                    title: "India-First GST engine",
                    desc: "Automated billing that correctly maps tax slabs (12% and 18% tiers) and itemizes SAC/HSN codes across split rooms and POS dining folios."
                  },
                  {
                    title: "Offline Local Cache Resilience",
                    desc: "Power cuts and internet drops won't freeze your lobby. Front-desk operations run seamlessly offline, syncing data back to the cloud the moment connectivity returns."
                  },
                  {
                    title: "Multi-lingual Staff Training Mode",
                    desc: "Simplify employee onboarding with clean interfaces and dual-language terminology, catering to staff with varying levels of technical familiarity."
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                      <Check className="size-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-navy">{item.title}</h4>
                      <p className="mt-1 text-sm text-[#4A4F58] font-ui leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              {/* Illustrated Visual Cards */}
              <div className="relative rounded-2xl bg-cream p-8 shadow-soft border border-navy/5 overflow-hidden">
                <div className="absolute -right-10 -top-10 size-40 rounded-full bg-gold/10 blur-2xl" />
                <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-purple/10 blur-2xl" />
                
                <div className="grid gap-6 sm:grid-cols-2 relative z-10">
                  <div className="rounded-xl border border-navy/5 bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-[#2E7D32]/10 p-2.5 text-[#2E7D32]">
                        <QrCode className="size-6" />
                      </div>
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">UPI Settlement</span>
                    </div>
                    <p className="mt-4 text-xs text-[#4A4F58] font-ui leading-relaxed">Incorporate instant UPI QR codes at checkout. Reduce gateway commissions by up to 82%.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-[#4A4F58] uppercase font-bold">Reconciliation</span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#2E7D32]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#2E7D32]">Real-Time</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-navy/5 bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-[#5B21B6]/10 p-2.5 text-[#5B21B6]">
                        <Landmark className="size-6" />
                      </div>
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">GST Compliance</span>
                    </div>
                    <p className="mt-4 text-xs text-[#4A4F58] font-ui leading-relaxed">Automatically handles CGST, SGST, IGST with zero manual tax computations.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-[#4A4F58] uppercase font-bold">Tax Slab</span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#5B21B6]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#5B21B6]">12% / 18% Auto</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-navy/5 bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-[#C77700]/10 p-2.5 text-[#C77700]">
                        <Zap className="size-6" />
                      </div>
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">Offline State</span>
                    </div>
                    <p className="mt-4 text-xs text-[#4A4F58] font-ui leading-relaxed">Local storage cache keeps front desk check-ins active even when broadband fails.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-[#4A4F58] uppercase font-bold">Sync State</span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#C77700]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#C77700]">Auto-Resilient</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-navy/5 bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-navy/10 p-2.5 text-navy">
                        <Users className="size-6" />
                      </div>
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">Guest Profiles</span>
                    </div>
                    <p className="mt-4 text-xs text-[#4A4F58] font-ui leading-relaxed">Build profiles with preferences, special requests, occasion notes, and personalized greetings.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-[#4A4F58] uppercase font-bold">CRM Database</span>
                      <span className="inline-flex items-center gap-1 rounded bg-navy/10 px-1.5 py-0.5 text-[9px] font-bold text-navy">VIP Segment</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* Direct Booking vs OTA Sync Section (Interactive Animation) */}
      <section className="bg-white py-24 border-y border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-widest text-purple">2-Way Channel Hub</span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
                Dynamic inventory sync with major OTAs
              </h2>
              <p className="mt-4 text-base text-[#4A4F58] leading-relaxed font-ui">
                Hour Stay’s lightning-fast synchronization engine links your central inventory pool with MakeMyTrip, Goibibo, Booking.com, and Agoda. 
              </p>
              <p className="mt-3 text-base text-[#4A4F58] leading-relaxed font-ui">
                When a guest books directly or on an OTA, availability updates instantly globally. Zero overbookings, zero manual rate conflicts.
              </p>

              {/* Simulation triggers */}
              <div className="mt-8 border border-purple/10 rounded-xl bg-cream/40 p-5">
                <p className="text-xs font-bold text-navy uppercase tracking-wider mb-3 font-ui">Interactive Demo: Simulate a Booking</p>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => triggerOtaSync("MakeMyTrip")} 
                    disabled={otaState !== "idle"}
                    className="bg-navy text-cream text-xs hover:bg-navy/90 py-2 h-9 px-4 rounded-full cursor-pointer disabled:opacity-50"
                  >
                    MMT Booking
                  </button>
                  <button 
                    onClick={() => triggerOtaSync("Booking.com")} 
                    disabled={otaState !== "idle"}
                    className="bg-navy text-cream text-xs hover:bg-navy/90 py-2 h-9 px-4 rounded-full cursor-pointer disabled:opacity-50"
                  >
                    Booking.com Booking
                  </button>
                  <button 
                    onClick={() => triggerOtaSync("Direct site")} 
                    disabled={otaState !== "idle"}
                    className="bg-gold text-navy text-xs hover:bg-gold/90 py-2 h-9 px-4 rounded-full font-semibold cursor-pointer disabled:opacity-50"
                  >
                    Direct Web Booking
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-[#4A4F58] italic font-ui">Click a channel to watch inventory sync happen across the dashboard and all networks in real-time.</p>
              </div>
            </div>

            <div className="lg:col-span-7">
              {/* Sync Diagram Board */}
              <div className="relative rounded-2xl bg-cream p-10 border border-navy/5 shadow-soft flex flex-col items-center justify-center overflow-hidden min-h-[400px]">
                <div className="absolute inset-0 bg-linear-to-br from-purple/5 to-gold/5 pointer-events-none" />

                {/* Simulated Nodes layout */}
                <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-8">
                  {/* Top Layer: OTA Networks */}
                  <div className="grid grid-cols-3 gap-3 w-full">
                    {[
                      { name: "MakeMyTrip", activeColor: "border-[#1565C0]" },
                      { name: "Booking.com", activeColor: "border-blue-700" },
                      { name: "Agoda", activeColor: "border-purple" }
                    ].map((ota) => {
                      const isActive = activeOtaChannel === ota.name;
                      return (
                        <div 
                          key={ota.name} 
                          className={`rounded-lg bg-white p-3 text-center border shadow-soft transition-all duration-500 ${
                            isActive ? `${ota.activeColor} ring-4 ring-gold/45 scale-105` : "border-navy/5"
                          }`}
                        >
                          <span className="text-[10px] font-bold text-navy block">{ota.name}</span>
                          <span className={`mt-1.5 inline-block size-2 rounded-full ${
                            isActive ? "bg-red-500 animate-ping" : (otaState === "synced" ? "bg-[#2E7D32]" : "bg-[#2E7D32]/40")
                          }`} />
                          <span className="text-[9px] text-[#4A4F58] block mt-1 font-ui">
                            {isActive ? "Booked! -1" : (otaState === "synced" ? "Synced (12 Available)" : "13 Rooms Avail")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Middle Layer: Hour Stay PMS Hub */}
                  <div className="relative flex flex-col items-center">
                    {/* Pulsing Sync Ring */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-1000 ${
                      otaState !== "idle" ? "size-28 border-gold animate-pulse" : "size-24 border-purple/20"
                    }`} />
                    
                    <div className={`relative z-10 flex flex-col items-center justify-center size-24 rounded-full border shadow-lift text-center transition-all duration-500 ${
                      otaState === "syncing_pms" || otaState === "syncing_all" ? "bg-gold border-gold text-navy scale-110" : "bg-navy border-navy text-cream"
                    }`}>
                      <RefreshCw className={`size-7 shrink-0 ${otaState !== "idle" ? "animate-spin" : ""}`} />
                      <span className="text-[9px] font-bold uppercase tracking-wider block mt-1.5 font-ui">PMS Hub</span>
                    </div>
                  </div>

                  {/* Bottom Layer: Hotel Inventory */}
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {/* Hotel Direct Booking Site */}
                    <div className={`rounded-lg bg-white p-4 border shadow-soft transition-all duration-500 text-center ${
                      activeOtaChannel === "Direct site" ? "border-gold ring-4 ring-gold/45 scale-105" : "border-navy/5"
                    }`}>
                      <span className="text-xs font-bold text-navy block font-ui">Direct Stays Website</span>
                      <span className={`mt-1.5 inline-block size-2 rounded-full ${
                        activeOtaChannel === "Direct site" ? "bg-red-500 animate-ping" : (otaState === "synced" ? "bg-[#2E7D32]" : "bg-[#2E7D32]/40")
                      }`} />
                      <span className="text-[10px] text-purple font-semibold block mt-1 font-ui">
                        {otaState === "synced" ? "Synced: 12 Available" : "13 Rooms Available"}
                      </span>
                    </div>

                    {/* Front Desk Room Grid */}
                    <div className="rounded-lg bg-white p-4 border border-navy/5 shadow-soft text-center">
                      <span className="text-xs font-bold text-navy block font-ui">Front-Desk Grid</span>
                      <span className={`mt-1.5 inline-block size-2 rounded-full ${
                        otaState === "syncing_pms" ? "bg-amber-500 animate-pulse" : "bg-[#2E7D32]"
                      }`} />
                      <span className="text-[10px] text-[#4A4F58] block mt-1 font-ui">
                        {otaState === "syncing_pms" ? "Updating allocation..." : "Allocation Grid Synced"}
                      </span>
                    </div>
                  </div>

                  {/* Live Simulation Toast Banner inside canvas */}
                  {otaState !== "idle" && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 rounded-lg bg-navy/95 border border-gold/40 p-3 text-center text-cream shadow-lift animate-fade-in z-20">
                      <p className="text-xs font-bold font-ui">
                        {otaState === "booking_made" && `📥 Reservation received from ${activeOtaChannel}`}
                        {otaState === "syncing_pms" && `⚙️ Syncing room allocation to Hour Stay Hub`}
                        {otaState === "syncing_all" && `🔄 Broad-casting updated inventory pool to OTA channels`}
                        {otaState === "synced" && `✓ Global sync completed in 1.4s!`}
                      </p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Experience Workflow Section */}
      <section className="bg-white py-24 border-y border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Guest Journey Map</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              From reservation checkout to dynamic check-out
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#4A4F58] leading-relaxed font-ui">
              A frictionless digital ecosystem built to increase guest satisfaction scores and take operational pressure off your lobby.
            </p>
          </div>

          {/* Infographic Hanging Cards Layout */}
          <div className="mt-16 pb-6 relative">
            {/* Horizontal card container: scrollable on mobile/tablet, overlapping staggered row on desktop */}
            <div className="flex flex-row overflow-x-auto lg:overflow-visible pb-8 pt-4 px-4 sm:px-6 lg:px-0 lg:justify-center items-start snap-x snap-mandatory scrollbar-none">
              {[
                {
                  step: "01",
                  label: "STEP 01",
                  title: "Instant Booking",
                  desc: "Guest books on your website and receives confirmation via SMS & WhatsApp.",
                  accent: "#F5C06A",
                  zIndex: "z-50",
                  offset: "lg:translate-y-0",
                },
                {
                  step: "02",
                  label: "STEP 02",
                  title: "Mobile Pre-Check-in",
                  desc: "Upload Aadhaar/Passport IDs prior to travel, filling out details from their phone.",
                  accent: "#5B21B6",
                  zIndex: "z-40",
                  offset: "lg:translate-y-7",
                },
                {
                  step: "03",
                  label: "STEP 03",
                  title: "Lobby Key Handover",
                  desc: "Receptionist confirms details, issues room key. Handover takes 45 seconds.",
                  accent: "#0D1B2A",
                  zIndex: "z-30",
                  offset: "lg:translate-y-0",
                },
                {
                  step: "04",
                  label: "STEP 04",
                  title: "In-Stay Requests",
                  desc: "Scan room QR code to order coffee, request linen, or call room service.",
                  accent: "#10B981",
                  zIndex: "z-20",
                  offset: "lg:translate-y-7",
                },
                {
                  step: "05",
                  label: "STEP 05",
                  title: "UPI Checkout",
                  desc: "Settle folio balances via UPI and receive GST-compliant invoices on WhatsApp.",
                  accent: "#FF6B8B",
                  zIndex: "z-10",
                  offset: "lg:translate-y-0",
                }
              ].map((t, idx) => (
                <div
                  key={t.step}
                  className={`
                    flex-shrink-0 w-[240px] sm:w-[250px] lg:w-[225px] xl:w-[240px]
                    snap-center
                    ${idx > 0 ? "ml-4 sm:ml-5 lg:-ml-5 xl:-ml-6" : "ml-0"}
                    ${t.zIndex}
                    ${t.offset}
                    group relative bg-white rounded-t-lg rounded-b-3xl
                    border border-slate-200/90
                    shadow-[0_4px_20px_rgba(13,27,42,0.06)]
                    hover:shadow-[0_20px_40px_rgba(13,27,42,0.14)]
                    hover:-translate-y-3 hover:z-50
                    transition-all duration-300 ease-out
                    flex flex-col min-h-[350px]
                  `}
                >
                  {/* Colored horizontal accent strip across top edge */}
                  <div
                    className="h-2.5 w-full rounded-t-lg transition-colors duration-300"
                    style={{ backgroundColor: t.accent }}
                  />

                  {/* Card Content with generous internal padding */}
                  <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between text-left">
                    <div>
                      {/* Step Label & Top Accent Indicator */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-navy/60">
                          {t.label}
                        </span>
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: t.accent }}
                        />
                      </div>

                      {/* Step Title in Playfair Display */}
                      <h3 className="font-display text-lg sm:text-xl font-bold text-navy tracking-tight leading-snug mb-3">
                        {t.title}
                      </h3>

                      {/* Short Description in Inter */}
                      <p className="font-sans text-xs sm:text-sm text-[#4A4F58] leading-relaxed">
                        {t.desc}
                      </p>
                    </div>

                    {/* Subtle aesthetic card footer */}
                    <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] uppercase font-sans font-semibold tracking-wider text-slate-400">
                        Phase 0{idx + 1}
                      </span>
                      <div
                        className="h-1 w-6 rounded-full transition-all duration-300 group-hover:w-10"
                        style={{ backgroundColor: t.accent }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Signature Properties Showcase (Dynamic stay view) */}
      <section className="bg-cream py-20 border-b border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple">Stay Options</span>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-navy">Signature collection properties</h2>
              <p className="mt-2 max-w-lg text-sm sm:text-base text-[#4A4F58] font-ui leading-relaxed">
                Sample properties running Hour Stay, available for booking in the interactive demo.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-navy text-cream hover:bg-navy/90 font-semibold px-6 h-12 shadow-soft">
              <Link to="/search">View all stays</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {searchResults.map((h) => {
              const hotelImg = h.id === "HS-9HQ8P" ? jaipurImg : (h.id === "HS-UDA" ? palaceImg : (h.id === "HS-GOA" ? otaState === "synced" || activeOtaChannel === "Booking.com" ? goaImg : goaImg : keralaImg));
              return (
                <article
                  key={h.id}
                  className="group overflow-hidden rounded-xl border border-navy/5 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                >
                  {/* Image banner with stay tags */}
                  <div className="h-40 relative overflow-hidden">
                    <img 
                      src={hotelImg} 
                      alt={h.name} 
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy/85 via-navy/35 to-black/10" />
                    <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2 z-10">
                      <span className="self-start rounded bg-gold text-navy text-[9px] font-bold uppercase px-2 py-0.5 tracking-wider font-ui">
                        {h.id === "HS-9HQ8P" ? "Jaipur Collection" : (h.id === "HS-UDA" ? "Udaipur Collection" : (h.id === "HS-GOA" ? "Goa Collection" : "Kerala Collection"))}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {h.tags.slice(0, 2).map((t, idx) => (
                          <span key={idx} className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-[8px] font-semibold text-cream font-ui">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="flex items-center gap-1 text-xs text-[#4A4F58] font-ui">
                      <MapPin className="size-3.5 text-purple" /> {h.city}
                    </p>
                    <h3 className="mt-1.5 font-display text-base font-bold text-navy group-hover:text-purple transition-colors line-clamp-1">
                      {h.name}
                    </h3>
                    <p className="mt-2 flex items-center gap-1 text-xs text-[#4A4F58] font-ui">
                      <Star className="size-4 fill-gold text-gold" /> {h.rating} · {h.reviews} verified reviews
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <p className="text-sm font-bold text-navy font-ui">
                        {inr(h.price)}
                        <span className="text-[10px] font-normal text-[#4A4F58]"> / night</span>
                      </p>
                      <Button asChild size="sm" variant="ghost" className="h-8 px-3 rounded text-purple font-semibold hover:bg-purple/5">
                        <Link to="/rooms/$roomId" params={{ roomId: h.id }}>
                          Book Stay <ArrowRight className="size-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest Blog Insights from Journal - Overlapping Stacked Card Carousel */}
      <section className="bg-cream/40 py-24 border-t border-navy/5 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Hour Stay Journal</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              Insights from the hospitality frontline
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#4A4F58] leading-relaxed font-ui">
              Read practical guides on GST slabs, peak wedding season pricing, and modern operational strategies.
            </p>
          </div>

          <InsightsStackedCarousel />
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-24 border-t border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Partner Testimonials</span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
              Trusted by leading Indian hoteliers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[#4A4F58] leading-relaxed font-ui">
              Hear from owners and general managers who replaced legacy systems with Hour Stay's calm hospitality suite.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                quote: selectedProperty?.settings?.description || "During peak wedding seasons in Jaipur, we handle dozens of guests at once. Hour Stay reduced our front-desk check-in turnaround to 90 seconds. The integrated GST invoicing alone saves our accounting team hours.",
                name: selectedProperty?.gm || "Vikram Rathore",
                role: `General Manager, ${selectedProperty?.name || "Rambagh Residency"}`,
                city: selectedProperty?.city || "Jaipur, Rajasthan",
                stars: 5,
                tone: "bg-navy text-cream"
              },
              {
                quote: "We saw direct reservations rise by 28% while saving significantly on OTA commission payouts. The 2-way sync manager is bulletproof — zero double bookings during peak coastal season.",
                name: "Joaquim Fernandes",
                role: "Owner, Candolim Beach Resort",
                city: "Candolim, Goa",
                stars: 5,
                tone: "bg-cream text-navy"
              },
              {
                quote: "Housekeeping staff love the simple mobile checklist. Folio split operations for large corporate groups are automated, applying correct SGST/CGST rates based on tariff slabs instantly.",
                name: "Meera Nair",
                role: "General Manager, Lake Palace View",
                city: "Udaipur, Rajasthan",
                stars: 5,
                tone: "bg-white border border-navy/5 text-navy shadow-soft"
              }
            ].map((t, idx) => (
              <div 
                key={idx} 
                className={`rounded-2xl p-8 flex flex-col justify-between shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${t.tone}`}
              >
                <div>
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: t.stars }).map((_, i) => (
                      <Star key={i} className="size-4.5 fill-gold text-gold" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-[13px] leading-relaxed italic font-ui font-normal">
                    "{t.quote}"
                  </p>
                </div>
                <div className="mt-8 border-t border-current/10 pt-4 flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gold/20 flex items-center justify-center font-bold text-gold font-display border border-gold/30">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{t.name}</h4>
                    <p className="text-[11px] opacity-75">{t.role} · {t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </SiteLayout>
  );
}