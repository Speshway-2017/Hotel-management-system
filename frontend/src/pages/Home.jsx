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
  ShieldAlert
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, searchResults, blogPosts } from "@/data/hs-data";

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

const propertyTypes = [
  {
    name: "Hotels",
    description: "City business hotels, airport transit stays, and commercial lodging hubs.",
    tag: "Business & Transit",
    icon: Hotel
  },
  {
    name: "Resorts",
    description: "Sprawling leisure retreats, beachfront getaways, and hillside spa locations.",
    tag: "Experiential Luxury",
    icon: Sparkles
  },
  {
    name: "Boutique Havelis",
    description: "Historic palaces, heritage properties, and design-forward boutique villas.",
    tag: "Cultural Heritage",
    icon: Landmark
  },
  {
    name: "Lodges & Stays",
    description: "Mid-scale highway retreats, pilgrimage accommodation, and homestays.",
    tag: "Comfort Stays",
    icon: ShieldCheck
  },
  {
    name: "Multi-Property Chains",
    description: "Consolidated enterprise control across multiple cities and property codes.",
    tag: "Enterprise Scale",
    icon: Users
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

    publicService.getMedia()
      .then(res => {
        if (res.success && res.data) {
          const mapping = res.data;
          const mappedSlides = slides.map(slide => {
            let key = '';
            if (slide.image === jaipurImg) key = 'jaipur';
            else if (slide.image === goaImg) key = 'goa';
            else if (slide.image === palaceImg) key = 'palace';
            else if (slide.image === keralaImg) key = 'kerala';

            return {
              ...slide,
              image: mapping[key] || slide.image
            };
          });
          setDynamicSlides(mappedSlides);
        }
      })
      .catch(err => {});
  }, []);

  // States for OTA Sync Interaction
  const [otaState, setOtaState] = useState("idle"); // idle, booking_made, syncing_pms, syncing_all, synced
  const [activeOtaChannel, setActiveOtaChannel] = useState(null);



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
                <div className="grid gap-4 sm:grid-cols-4">
                  <label className="block text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy/70 font-ui">Destination</span>
                    <span className="relative mt-1.5 block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-navy/50" />
                      <Input className="h-12 border-navy/10 bg-cream/10 pl-10 focus-visible:ring-gold text-navy font-semibold" placeholder="Jaipur, Udaipur, Goa..." />
                    </span>
                  </label>
                  <label className="block text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy/70 font-ui">Check-in Date</span>
                    <span className="relative mt-1.5 block">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-navy/50" />
                      <Input type="date" className="h-12 border-navy/10 bg-cream/10 pl-10 focus-visible:ring-gold text-sm text-navy font-semibold" defaultValue="2026-08-12" />
                    </span>
                  </label>
                  <label className="block text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-navy/70 font-ui">Check-out Date</span>
                    <span className="relative mt-1.5 block">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-navy/50" />
                      <Input type="date" className="h-12 border-navy/10 bg-cream/10 pl-10 focus-visible:ring-gold text-sm text-navy font-semibold" defaultValue="2026-08-15" />
                    </span>
                  </label>
                  <div className="flex items-end">
                    <Button asChild className="h-12 w-full rounded-md bg-navy text-cream hover:bg-navy/90 font-semibold gap-2 shadow-soft cursor-pointer">
                      <Link to="/search">
                        <SearchIcon className="size-4" /> Search Rooms
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Slider Indicators and Caption */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-cream/15 pt-6">
            <div className="flex items-center gap-3">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2.5 rounded-full transition-all duration-500 cursor-pointer ${
                    idx === currentSlide ? "w-8 bg-gold" : "w-2.5 bg-cream/30 hover:bg-cream/50"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
            <div className="text-right text-xs sm:text-sm">
              <span className="text-gold font-semibold tracking-wider uppercase">{slides[currentSlide].tagline}</span>
              <span className="mx-2 text-cream/35">|</span>
              <span className="text-cream/70 font-ui">{slides[currentSlide].title}, {slides[currentSlide].location}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Property Types Section */}
      <section className="bg-cream py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Flexible Framework</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Powering every category of Indian stays
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              From historic royal palaces to modern transit suites, Hour Stay provides custom operational models for diverse property architectures.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {propertyTypes.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.name}
                  className="group relative rounded-xl border border-navy/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-gold/30 hover:shadow-lift"
                >
                  <div className="inline-flex size-12 items-center justify-center rounded-lg bg-cream text-navy transition-colors group-hover:bg-gold group-hover:text-navy">
                    <Icon className="size-6" />
                  </div>
                  <span className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-purple">
                    {p.tag}
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy group-hover:text-purple transition-colors">
                    {p.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground font-ui">
                    {p.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Hour Stay (Built for India) Section */}
      <section className="bg-white border-y border-navy/5 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-widest text-purple">Built for the Soil</span>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                Connected hotel operations engineered for India
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
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
                      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
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
                    <p className="mt-4 text-xs text-muted-foreground">Incorporate instant UPI QR codes at checkout. Reduce gateway commissions by up to 82%.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Reconciliation</span>
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
                    <p className="mt-4 text-xs text-muted-foreground">Automatically handles CGST, SGST, IGST with zero manual tax computations.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Tax Slab</span>
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
                    <p className="mt-4 text-xs text-muted-foreground">Local storage cache keeps front desk check-ins active even when broadband fails.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Sync State</span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#C77700]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#C77700]">Auto-Resilient</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-navy/5 bg-white p-6 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-navy/10 p-2.5 text-navy">
                        <Users className="size-6" />
                      </div>
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">Guest Loyalty</span>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">Build profiles with local tastes: filter coffee preferences, festival cards, and VIP greetings.</p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">CRM Retention</span>
                      <span className="inline-flex items-center gap-1 rounded bg-navy/10 px-1.5 py-0.5 text-[9px] font-bold text-navy">Platinum Tier</span>
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
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
                Dynamic inventory sync with major OTAs
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Hour Stay’s lightning-fast synchronization engine links your central inventory pool with MakeMyTrip, Goibibo, Booking.com, and Agoda. 
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                When a guest books directly or on an OTA, availability updates instantly globally. Zero overbookings, zero manual rate conflicts.
              </p>

              {/* Simulation triggers */}
              <div className="mt-8 border border-purple/10 rounded-xl bg-cream/40 p-5">
                <p className="text-xs font-bold text-navy uppercase tracking-wider mb-3">Interactive Demo: Simulate a Booking</p>
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
                <p className="mt-3 text-[11px] text-muted-foreground italic">Click a channel to watch inventory sync happen across the dashboard and all networks in real-time.</p>
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
                          <span className="text-[9px] text-muted-foreground block mt-1">
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
                      otaState !== "idle" ? "size-28 border-gold animate-pulse" : "size-20 border-purple/20"
                    }`} />
                    
                    <div className={`relative z-10 rounded-full border p-6 shadow-lift text-center transition-all duration-500 ${
                      otaState === "syncing_pms" || otaState === "syncing_all" ? "bg-gold border-gold text-navy scale-110" : "bg-navy border-navy text-cream"
                    }`}>
                      <RefreshCw className={`size-8 ${otaState !== "idle" ? "animate-spin" : ""}`} />
                      <span className="text-[9px] font-bold uppercase tracking-wider block mt-1">PMS Hub</span>
                    </div>
                  </div>

                  {/* Bottom Layer: Hotel Inventory */}
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {/* Hotel Direct Booking Site */}
                    <div className={`rounded-lg bg-white p-4 border shadow-soft transition-all duration-500 text-center ${
                      activeOtaChannel === "Direct site" ? "border-gold ring-4 ring-gold/45 scale-105" : "border-navy/5"
                    }`}>
                      <span className="text-xs font-bold text-navy block">Direct Stays Website</span>
                      <span className={`mt-1.5 inline-block size-2 rounded-full ${
                        activeOtaChannel === "Direct site" ? "bg-red-500 animate-ping" : (otaState === "synced" ? "bg-[#2E7D32]" : "bg-[#2E7D32]/40")
                      }`} />
                      <span className="text-[10px] text-purple font-semibold block mt-1">
                        {otaState === "synced" ? "Synced: 12 Available" : "13 Rooms Available"}
                      </span>
                    </div>

                    {/* Front Desk Room Grid */}
                    <div className="rounded-lg bg-white p-4 border border-navy/5 shadow-soft text-center">
                      <span className="text-xs font-bold text-navy block">Front-Desk Grid</span>
                      <span className={`mt-1.5 inline-block size-2 rounded-full ${
                        otaState === "syncing_pms" ? "bg-amber-500 animate-pulse" : "bg-[#2E7D32]"
                      }`} />
                      <span className="text-[10px] text-muted-foreground block mt-1">
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
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              From reservation checkout to dynamic check-out
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              A frictionless digital ecosystem built to increase guest satisfaction scores and take operational pressure off your lobby.
            </p>
          </div>

          {/* Timeline Grid */}
          <div className="mt-16 grid gap-8 md:grid-cols-5 relative">
            
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cream hidden md:block -translate-y-1/2 z-0" />

            {[
              {
                step: "01",
                title: "Instant Booking",
                desc: "Guest books on your website and receives confirmation via SMS & WhatsApp.",
                icon: Smartphone
              },
              {
                step: "02",
                title: "Mobile Pre-Check-in",
                desc: "Upload Aadhaar/Passport IDs prior to travel, filling out details from their phone.",
                icon: FileText
              },
              {
                step: "03",
                title: "Lobby Key Handover",
                desc: "Receptionist confirms details, issues room key. Handover takes 45 seconds.",
                icon: ShieldCheck
              },
              {
                step: "04",
                title: "In-Stay Requests",
                desc: "Scan room QR code to order coffee, request linen, or call room service.",
                icon: MessageSquare
              },
              {
                step: "05",
                title: "UPI Checkout",
                desc: "Settle folio balances via UPI and receive GST-compliant invoices on WhatsApp.",
                icon: CreditCard
              }
            ].map((t, idx) => {
              const Icon = t.icon;
              return (
                <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                  <div className="inline-flex size-14 items-center justify-center rounded-full bg-cream border border-navy/5 text-navy group-hover:bg-purple group-hover:text-cream transition-all duration-300 shadow-soft">
                    <Icon className="size-6 text-current" />
                  </div>
                  <span className="mt-4 block font-display text-xs font-bold text-gold tracking-widest uppercase">
                    Step {t.step}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-bold text-navy">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground font-ui max-w-[200px]">
                    {t.desc}
                  </p>
                </div>
              );
            })}

          </div>
        </div>
      </section>





      {/* Signature Properties Showcase (Dynamic stay view) */}
      <section className="bg-cream py-20 border-b border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-purple">Stay Options</span>
              <h2 className="mt-2 font-display text-3xl font-bold text-navy">Signature collection properties</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Sample properties running Hour Stay, available for booking in the interactive demo.
              </p>
            </div>
            <Button asChild size="lg" className="rounded-full bg-navy text-cream hover:bg-navy/90 font-semibold px-6 h-12 shadow-soft">
              <Link to="/search">View all stays</Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {searchResults.map((h) => {
              const hotelImg = h.id === "HS-JAI" ? jaipurImg : (h.id === "HS-UDA" ? palaceImg : (h.id === "HS-GOA" ? otaState === "synced" || activeOtaChannel === "Booking.com" ? goaImg : goaImg : keralaImg));
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
                        {h.id === "HS-JAI" ? "Jaipur Collection" : (h.id === "HS-UDA" ? "Udaipur Collection" : (h.id === "HS-GOA" ? "Goa Collection" : "Kerala Collection"))}
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
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5 text-purple" /> {h.city}
                    </p>
                    <h3 className="mt-1.5 font-display text-base font-bold text-navy group-hover:text-purple transition-colors line-clamp-1">
                      {h.name}
                    </h3>
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-4 fill-gold text-gold" /> {h.rating} · {h.reviews} verified reviews
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-navy/5 pt-3">
                      <p className="text-sm font-bold text-navy font-ui">
                        {inr(h.price)}
                        <span className="text-[10px] font-normal text-muted-foreground"> / night</span>
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

      {/* Latest Blog Insights from Journal */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Hour Stay Journal</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Insights from the hospitality frontline
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Read practical guides on GST slabs, peak wedding season pricing, and modern operational strategies.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {blogPosts.slice(0, 3).map((p) => (
              <Link
                key={p.slug}
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group flex flex-col justify-between rounded-xl border border-navy/5 bg-white p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:border-purple/30"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-purple font-ui">
                    {p.tag}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-bold text-navy group-hover:text-purple transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground font-ui">
                    {p.excerpt}
                  </p>
                </div>
                <div className="mt-6 border-t border-navy/5 pt-3 flex items-center justify-between text-[10px] text-muted-foreground font-ui">
                  <span>By {p.author}</span>
                  <span>{p.date} · {p.readTime}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white py-24 border-t border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-purple">Partner Testimonials</span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Trusted by leading Indian hoteliers
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Hear from owners and general managers who replaced legacy systems with Hour Stay's calm hospitality suite.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                quote: "During peak wedding seasons in Jaipur, we handle dozens of guests at once. Hour Stay reduced our front-desk check-in turnaround to 90 seconds. The integrated GST invoicing alone saves our accounting team hours.",
                name: "Vikram Rathore",
                role: "General Manager, Rambagh Residency",
                city: "Jaipur, Rajasthan",
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
                  <p className="text-sm sm:text-base leading-relaxed italic">
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