import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/maintenance")({
  head: () => ({
    meta: [
    { title: "Maintenance Requests — Hour Stay" },
    { name: "description", content: "Raise and track engineering requests." },
    { property: "og:title", content: "Maintenance Requests — Hour Stay" },
    { property: "og:description", content: "Raise and track engineering requests." }]

  }),
  component: () =>
  <WorkspacePage
    title="Maintenance Requests"
    subtitle="Raise and track engineering requests."
    dataset="services" />


});