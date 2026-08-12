import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inr, searchResults } from "@/data/hs-data";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
    { title: "Find a stay — Hour Stay hotels across India" },
    { name: "description", content: "Search availability across Hour Stay properties in Jaipur, Udaipur, Goa, Alleppey, Mumbai and Delhi." },
    { property: "og:title", content: "Find a stay — Hour Stay" },
    { property: "og:description", content: "Search availability across Hour Stay properties in India." }]

  }),
  component: SearchPage
});

function SearchPage() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-navy">Stays in India</h1>
        <div className="mt-6 grid gap-3 card-guest border border-navy/10 bg-white p-4 shadow-soft sm:grid-cols-4">
          <Input className="h-11" defaultValue="Jaipur, Rajasthan" aria-label="Destination" />
          <Input className="h-11" defaultValue="12 Aug 2026" aria-label="Check-in" />
          <Input className="h-11" defaultValue="15 Aug 2026" aria-label="Check-out" />
          <Button variant="hero" size="touch">Update search</Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="card-guest h-fit border border-navy/10 bg-white p-5">
            <p className="font-display text-lg text-navy">Filters</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price / night</p>
            <p className="mt-1 text-sm">₹6,000 — ₹40,000</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amenities</p>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {["Free breakfast", "Pool", "Spa", "Airport transfer", "Pet friendly"].map((a) =>
              <li key={a} className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="size-4 accent-[var(--color-navy)]" /> {a}
                </li>
              )}
            </ul>
          </aside>

          <div className="space-y-4">
            {searchResults.map((h) =>
            <article key={h.id} className="grid card-guest overflow-hidden border border-navy/10 bg-white shadow-soft transition-all duration-300 hover:shadow-lift sm:grid-cols-[220px_1fr]">
                <div className="h-40 bg-linear-to-br from-navy via-purple/60 to-gold/60 sm:h-full" />
                <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {h.city}</p>
                    <h2 className="mt-1 font-display text-xl font-semibold text-navy">{h.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3.5 fill-gold text-gold" /> {h.rating} · {h.reviews} reviews
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{h.tags.join(" · ")}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-2xl font-semibold text-navy">{inr(h.price)}</p>
                    <p className="text-xs text-muted-foreground">per night + GST</p>
                    <Button asChild variant="hero" size="touch" className="mt-3">
                      <Link to="/rooms/$roomId" params={{ roomId: h.id }}>View rooms</Link>
                    </Button>
                  </div>
                </div>
              </article>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>);

}