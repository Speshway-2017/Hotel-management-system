import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/front-desk")({
  head: () => ({
    meta: [
    { title: "Front Desk Overview — Hour Stay" },
    { name: "description", content: "Arrivals, departures and desk activity." },
    { property: "og:title", content: "Front Desk Overview — Hour Stay" },
    { property: "og:description", content: "Arrivals, departures and desk activity." }]

  }),
  component: () =>
  <WorkspacePage
    title="Front Desk Overview"
    subtitle="Arrivals, departures and desk activity."
    dataset="reservations"
    stats={[{ label: "Occupancy today", value: "88%", delta: 5, hint: "112 of 128 keys" }, { label: "Revenue today", value: "₹14.2 L", delta: 9 }, { label: "ADR", value: "₹11,400", delta: 3 }, { label: "RevPAR", value: "₹9,576", delta: 7 }]} />


});