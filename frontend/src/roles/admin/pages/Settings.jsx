import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
    { title: "Settings — Hour Stay" },
    { name: "description", content: "Property profile, policies and branding." },
    { property: "og:title", content: "Settings — Hour Stay" },
    { property: "og:description", content: "Property profile, policies and branding." }]

  }),
  component: () =>
  <WorkspacePage
    title="Settings"
    subtitle="Property profile, policies and branding."
    dataset="none" />


});