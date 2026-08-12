import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { inr } from "@/data/hs-data";

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
  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <div className="card-guest border border-navy/10 bg-white p-8 text-center shadow-soft animate-fade-up">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/12 text-success">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold text-navy">Your stay is confirmed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A confirmation has been sent to aarav.mehta@example.in and +91 98204 33121.
          </p>
          <dl className="mt-8 grid gap-3 rounded-lg bg-cream p-5 text-left text-sm">
            <Row k="Booking reference" v="HS24-10241" />
            <Row k="Property" v="Hour Stay Rambagh Residency, Jaipur" />
            <Row k="Room" v="Premier Haveli Room" />
            <Row k="Stay" v="12 Aug → 15 Aug 2026 · 3 nights" />
            <Row k="Guests" v="2 adults" />
            <Row k="Total paid" v={inr(43896)} />
          </dl>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button asChild variant="hero" size="touch"><Link to="/guest/bookings">View my bookings</Link></Button>
            <Button asChild variant="quiet" size="touch"><Link to="/guest/pre-check-in">Start pre check-in</Link></Button>
          </div>
        </div>
      </section>
    </SiteLayout>);

}

function Row({ k, v }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>);

}