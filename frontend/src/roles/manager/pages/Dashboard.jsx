import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/")({
  head: () => ({
    meta: [
    { title: "Manager Dashboard — Hour Stay" },
    { name: "description", content: "Front office shift overview for today." },
    { property: "og:title", content: "Manager Dashboard — Hour Stay" },
    { property: "og:description", content: "Front office shift overview for today." }]

  }),
  component: () =>
  <WorkspacePage
    title="Manager Dashboard"
    subtitle="Front office shift overview for today."
    dataset="reservations"
    charts="occupancy"
    stats={[{ label: "Arrivals today", value: "18", hint: "6 pre-checked in" }, { label: "Departures today", value: "14", delta: -3 }, { label: "Occupancy", value: "88%", delta: 5 }, { label: "Open approvals", value: "4", hint: "2 refunds" }]} />


});