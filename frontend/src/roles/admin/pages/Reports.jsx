import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
    { title: "Reports & Analytics — Hour Stay" },
    { name: "description", content: "Occupancy, ADR, RevPAR and source mix." },
    { property: "og:title", content: "Reports & Analytics — Hour Stay" },
    { property: "og:description", content: "Occupancy, ADR, RevPAR and source mix." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reports & Analytics"
    subtitle="Occupancy, ADR, RevPAR and source mix."
    dataset="invoices"
    charts="both" />


});