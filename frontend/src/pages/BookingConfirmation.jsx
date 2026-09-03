import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr } from "@/data/hs-data";
import { publicService } from "@/services/public";

export const Route = createFileRoute("/booking/confirmation")({
  head: () => ({
    meta: [
    { title: "Booking confirmed — Hour Stay" },
    { name: "description", content: "Your Hour Stay reservation is confirmed. View your booking reference, stay dates and total." },
    { property: "og:title", content: "Booking confirmed — Hour Stay" },
    { property: "og:description", content: "Your Hour Stay reservation is confirmed." }]
  }),
  component: Confirmation
});

function Confirmation() {
  const [property, setProperty] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem('latest_booking');
    if (raw) {
      try {
        setBooking(JSON.parse(raw));
      } catch (e) {}
    }

    const activeId = localStorage.getItem('selected_property_id') || 'HS-JAI';
    publicService.getProperty(activeId)
      .then(res => {
        if (res.success && res.data) {
          setProperty(res.data);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <div className="card-guest border border-navy/10 bg-white p-8 text-center shadow-soft animate-fade-up">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-navy">Your stay is confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A confirmation has been sent to {booking?.email || 'your registered email'} and {booking?.phone || 'registered phone number'}.
          </p>
          <dl className="mt-8 grid gap-3 rounded-lg bg-cream p-5 text-left text-sm">
            <Row k="Booking reference" v={booking?.id || booking?._id || "HS24-10241"} />
            <Row k="Property" v={property ? `${property.name}, ${property.city}` : "Speshway Luxury Hotel, Hyderabad"} />
            <Row k="Room" v={booking?.room || "Premier Room"} />
            <Row k="Stay" v={booking ? `${booking.checkIn} → ${booking.checkOut} · ${booking.nights || 3} nights` : "12 Aug → 15 Aug 2026 · 3 nights"} />
            <Row k="Guests" v={booking?.pax || "2 adults"} />
            <Row k="Total paid" v={inr(booking?.amount || 43896)} />
          </dl>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant="hero" size="touch"><Link to="/guest/bookings">View my bookings</Link></Button>
            <Button asChild variant="quiet" size="touch"><Link to="/guest/pre-check-in">Start pre check-in</Link></Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}