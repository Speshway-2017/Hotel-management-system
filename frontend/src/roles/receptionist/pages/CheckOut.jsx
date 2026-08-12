import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/check-out")({
  head: () => ({
    meta: [
    { title: "Check-out — Hour Stay" },
    { name: "description", content: "Settle folios and release rooms." },
    { property: "og:title", content: "Check-out — Hour Stay" },
    { property: "og:description", content: "Settle folios and release rooms." }]

  }),
  component: () =>
  <WorkspacePage
    title="Check-out"
    subtitle="Settle folios and release rooms."
    dataset="invoices" />


});