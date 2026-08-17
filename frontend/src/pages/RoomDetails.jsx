import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Star } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr, roomTypes, searchResults } from "@/data/hs-data";
import { publicService } from "@/services/public";

// Import Resort Images for Gallery
import jaipurImg from "@/assets/resort_jaipur.png";
import goaImg from "@/assets/beach_goa.png";
import palaceImg from "@/assets/palace_udaipur.png";
import keralaImg from "@/assets/retreat_kerala.png";

// Helper to resolve property-specific image gallery
const getHotelGallery = (id) => {
  switch (id) {
    case "HS-JAI":
      return [jaipurImg, palaceImg, keralaImg];
    case "HS-UDA":
      return [palaceImg, jaipurImg, goaImg];
    case "HS-GOA":
      return [goaImg, keralaImg, palaceImg];
    case "HS-KER":
      return [keralaImg, goaImg, jaipurImg];
    default:
      return [jaipurImg, palaceImg, keralaImg];
  }
};

export const Route = createFileRoute("/rooms/$roomId")({
  loader: ({ params }) => ({
    hotel: searchResults.find((h) => h.id === params.roomId) ?? searchResults[0]
  }),
  head: ({ loaderData }) => {
    const name = loaderData?.hotel?.name ?? "Room details";
    return {
      meta: [
        { title: `${name} — Rooms & rates | Hour Stay` },
        { name: "description", content: `Room types, amenities and nightly rates at ${name}.` },
        { property: "og:title", content: `${name} — Hour Stay` },
        { property: "og:description", content: `Room types, amenities and nightly rates at ${name}.` }
      ]
    };
  },
  component: RoomDetails
});

function RoomDetails() {
  const { hotel } = Route.useLoaderData();
  
  const [mediaMap, setMediaMap] = useState({});

  useEffect(() => {
    publicService.getMedia()
      .then(res => {
        if (res.success && res.data) {
          setMediaMap(res.data);
        }
      })
      .catch(err => {});
  }, []);

  const getMediaUrl = (fallbackImg) => {
    let key = '';
    if (fallbackImg === jaipurImg) key = 'jaipur';
    else if (fallbackImg === goaImg) key = 'goa';
    else if (fallbackImg === palaceImg) key = 'palace';
    else if (fallbackImg === keralaImg) key = 'kerala';
    return mediaMap[key] || fallbackImg;
  };

  const gallery = getHotelGallery(hotel.id).map(img => getMediaUrl(img));
  const [mainImg, sideImg1, sideImg2] = gallery;

  return (
    <SiteLayout>
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-xs text-muted-foreground font-ui">
          <Link to="/" className="hover:text-navy">Stays</Link> / {hotel.city}
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-navy">{hotel.name}</h1>
        <p className="mt-2 flex items-center gap-1 text-sm text-gold">
          <Star className="size-4 fill-gold text-gold animate-pulse" /> {hotel.rating} · <span className="text-muted-foreground font-ui">{hotel.reviews} reviews · {hotel.city}</span>
        </p>

        {/* High-Fidelity Property Image Gallery */}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="h-64 card-guest overflow-hidden relative group">
            <img 
              src={mainImg} 
              alt={`${hotel.name} main view`} 
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102" 
            />
            <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:bg-transparent" />
          </div>
          <div className="grid gap-3">
            <div className="h-[7.75rem] card-guest overflow-hidden relative group">
              <img 
                src={sideImg1} 
                alt={`${hotel.name} detail view 1`} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102" 
              />
              <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:bg-transparent" />
            </div>
            <div className="h-[7.75rem] card-guest overflow-hidden relative group">
              <img 
                src={sideImg2} 
                alt={`${hotel.name} detail view 2`} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102" 
              />
              <div className="absolute inset-0 bg-black/10 transition-opacity duration-300 group-hover:bg-transparent" />
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-navy">Choose your room</h2>
            <div className="mt-5 space-y-4">
              {roomTypes.map((rt) => (
                <div key={rt.id} className="flex flex-col gap-4 card-guest border border-navy/10 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-semibold text-navy">{rt.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground font-ui">{rt.size} · {rt.beds} · up to {rt.occupancy} guests</p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {rt.amenities.map((a) => (
                        <li key={a} className="flex items-center gap-2 font-ui"><Check className="size-3.5 text-success" /> {a}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="font-display text-2xl font-semibold text-navy">{inr(rt.baseRate)}</p>
                    <p className="text-xs text-muted-foreground font-ui">per night + 18% GST</p>
                    <Button asChild variant="hero" size="touch" className="mt-3 w-full sm:w-auto cursor-pointer">
                      <Link to="/booking">Select</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="card-guest h-fit border border-navy/10 bg-white p-5 shadow-soft lg:sticky lg:top-24">
            <p className="font-display text-lg text-navy">Your stay</p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row k="Check-in" v="12 Aug 2026, 14:00" />
              <Row k="Check-out" v="15 Aug 2026, 11:00" />
              <Row k="Guests" v="2 adults" />
              <Row k="Nights" v="3" />
            </dl>
            <Button asChild variant="gold" size="touch" className="mt-5 w-full cursor-pointer">
              <Link to="/booking">Continue to booking</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground font-ui">Free cancellation until 10 Aug</p>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-muted-foreground font-ui">{k}</dt>
      <dd className="font-medium font-ui">{v}</dd>
    </div>
  );
}