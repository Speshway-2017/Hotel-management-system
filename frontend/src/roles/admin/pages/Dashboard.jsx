import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
    { title: "Owner Dashboard — Hour Stay" },
    { name: "description", content: "Rambagh Residency, Jaipur — today at a glance." },
    { property: "og:title", content: "Owner Dashboard — Hour Stay" },
    { property: "og:description", content: "Rambagh Residency, Jaipur — today at a glance." }]

  }),
  component: () =>
  <WorkspacePage
    title="Owner Dashboard"
    subtitle="Rambagh Residency, Jaipur — today at a glance."
    dataset="reservations"
    charts="revenue"
    stats={[{ label: "Occupancy today", value: "88%", delta: 5, hint: "112 of 128 keys" }, { label: "Revenue today", value: "₹14.2 L", delta: 9 }, { label: "ADR", value: "₹11,400", delta: 3 }, { label: "RevPAR", value: "₹9,576", delta: 7 }]} />


});