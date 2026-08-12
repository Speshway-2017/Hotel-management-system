import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/occupancy")({
  head: () => ({
    meta: [
    { title: "Occupancy & Revenue — Hour Stay" },
    { name: "description", content: "Trend performance for the property." },
    { property: "og:title", content: "Occupancy & Revenue — Hour Stay" },
    { property: "og:description", content: "Trend performance for the property." }]

  }),
  component: () =>
  <WorkspacePage
    title="Occupancy & Revenue"
    subtitle="Trend performance for the property."
    dataset="invoices"
    charts="both" />


});