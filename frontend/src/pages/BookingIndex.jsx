import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/hs/kit";
import { inr } from "@/data/hs-data";

export const Route = createFileRoute("/booking/")({
  head: () => ({
    meta: [
    { title: "Complete your booking — Hour Stay" },
    { name: "description", content: "Review your room, guest details and GST-inclusive total before confirming your Hour Stay booking." },
    { property: "og:title", content: "Complete your booking — Hour Stay" },
    { property: "og:description", content: "Review guest details and confirm your stay." }]

  }),
  component: Booking
});

const base = 12400 * 3;
const gst = Math.round(base * 0.18);

function Booking() {
  return (
    <SiteLayout>
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold text-navy">Complete your booking</h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <form className="card-guest border border-navy/10 bg-white p-6 shadow-soft">
            <h2 className="font-display text-xl font-semibold text-navy">Guest details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
              { id: "fn", label: "First name", ph: "Aarav" },
              { id: "ln", label: "Last name", ph: "Mehta" },
              { id: "em", label: "Email", ph: "aarav@example.in" },
              { id: "mb", label: "Mobile", ph: "+91 98204 33121" },
              { id: "ct", label: "City", ph: "Mumbai" },
              { id: "gst", label: "GSTIN (optional)", ph: "27AABCU9603R1ZM" }].
              map((f) =>
              <div key={f.id}>
                  <Label htmlFor={f.id} className="text-sm">{f.label}</Label>
                  <Input id={f.id} className="mt-1.5 h-11" placeholder={f.ph} />
                </div>
              )}
            </div>
            <h2 className="mt-8 font-display text-xl font-semibold text-navy">Preferences</h2>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["High floor, courtyard facing", "Early check-in (subject to availability)", "Jain meal preference"].map((p) =>
              <label key={p} className="flex min-h-11 items-center gap-2">
                  <input type="checkbox" className="size-4 accent-[var(--color-navy)]" /> {p}
                </label>
              )}
            </div>
            <Notice tone="info" title="This is a UI demo" className="mt-6">
              No payment is processed — confirming takes you to a sample confirmation.
            </Notice>
            <Button asChild variant="hero" size="touch" className="mt-6 w-full sm:w-auto">
              <Link to="/booking/confirmation">Confirm booking</Link>
            </Button>
          </form>

          <aside className="card-guest h-fit border border-navy/10 bg-white p-5 shadow-soft">
            <p className="font-display text-lg text-navy">Premier Haveli Room</p>
            <p className="mt-1 text-xs text-muted-foreground">Rambagh Residency, Jaipur · 3 nights</p>
            <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Room × 3 nights</dt><dd className="tabular-nums">{inr(base)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">GST 18%</dt><dd className="tabular-nums">{inr(gst)}</dd></div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{inr(base + gst)}</dd></div>
            </dl>
          </aside>
        </div>
      </section>
    </SiteLayout>);

}