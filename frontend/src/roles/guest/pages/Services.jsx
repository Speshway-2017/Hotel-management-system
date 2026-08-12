import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/services")({
  head: () => ({
    meta: [
    { title: "Service Requests — Hour Stay" },
    { name: "description", content: "Housekeeping, dining and concierge requests." },
    { property: "og:title", content: "Service Requests — Hour Stay" },
    { property: "og:description", content: "Housekeeping, dining and concierge requests." }]

  }),
  component: () =>
  <WorkspacePage
    title="Service Requests"
    subtitle="Housekeeping, dining and concierge requests."
    dataset="services" />


});