import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/arrivals")({
  head: () => ({
    meta: [
    { title: "Arrivals & Departures — Hour Stay" },
    { name: "description", content: "Today's movement across the property." },
    { property: "og:title", content: "Arrivals & Departures — Hour Stay" },
    { property: "og:description", content: "Today's movement across the property." }]

  }),
  component: () =>
  <WorkspacePage
    title="Arrivals & Departures"
    subtitle="Today's movement across the property."
    dataset="reservations"
    stats={[{ label: "Arrivals today", value: "18", hint: "6 pre-checked in" }, { label: "Departures today", value: "14", delta: -3 }, { label: "Occupancy", value: "88%", delta: 5 }, { label: "Open approvals", value: "4", hint: "2 refunds" }]} />


});