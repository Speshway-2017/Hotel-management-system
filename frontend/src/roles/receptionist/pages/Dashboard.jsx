import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, StatCard } from "@/components/hs/kit";
import { RoomGrid } from "@/components/hs/RoomGrid";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/reception/")({
  head: () => ({
    meta: [
    { title: "Room Status Grid — Hour Stay Front Desk" },
    { name: "description", content: "Live room status grid for the front desk: clean, occupied, dirty, cleaning, out of order and blocked rooms." },
    { property: "og:title", content: "Room Status Grid — Hour Stay" },
    { property: "og:description", content: "Live front-desk room status at a glance." }]

  }),
  component: FrontDesk
});

function FrontDesk() {
  return (
    <>
      <PageHeader
        title="Room Status"
        subtitle="Rambagh Residency, Jaipur · Shift 15:00–23:00"
        actions={
        <>
            <Button asChild variant="quiet" size="touch"><Link to="/reception/check-out">Check-out</Link></Button>
            <Button asChild variant="hero" size="touch"><Link to="/reception/new-booking">Walk-in booking</Link></Button>
          </>
        } />
      
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Arrivals pending" value="12" hint="6 pre-checked in" />
        <StatCard label="Departures due" value="9" hint="2 late check-out" />
        <StatCard label="Ready to sell" value="18" delta={4} />
        <StatCard label="Out of order" value="3" hint="Floor 4 plumbing" />
      </div>
      <Panel title="Live room grid" description="Tap a room for actions">
        <div className="p-4"><RoomGrid /></div>
      </Panel>
    </>);

}