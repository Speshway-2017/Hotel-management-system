import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/reports")({
  head: () => ({
    meta: [
    { title: "Reports & Analytics — Hour Stay" },
    { name: "description", content: "Portfolio MIS, source mix and revenue trends." },
    { property: "og:title", content: "Reports & Analytics — Hour Stay" },
    { property: "og:description", content: "Portfolio MIS, source mix and revenue trends." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reports & Analytics"
    subtitle="Portfolio MIS, source mix and revenue trends."
    dataset="properties"
    charts="revenue" />


});