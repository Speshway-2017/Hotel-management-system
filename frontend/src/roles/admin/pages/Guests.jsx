import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/guests")({
  head: () => ({
    meta: [
    { title: "Guests / CRM — Hour Stay" },
    { name: "description", content: "Guest profiles, tiers and lifetime value." },
    { property: "og:title", content: "Guests / CRM — Hour Stay" },
    { property: "og:description", content: "Guest profiles, tiers and lifetime value." }]

  }),
  component: () =>
  <WorkspacePage
    title="Guests / CRM"
    subtitle="Guest profiles, tiers and lifetime value."
    dataset="guests" />


});