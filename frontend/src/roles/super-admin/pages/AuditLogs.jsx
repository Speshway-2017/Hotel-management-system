import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/audit-logs")({
  head: () => ({
    meta: [
    { title: "Audit Logs — Hour Stay" },
    { name: "description", content: "Every privileged action, with user and IP." },
    { property: "og:title", content: "Audit Logs — Hour Stay" },
    { property: "og:description", content: "Every privileged action, with user and IP." }]

  }),
  component: () =>
  <WorkspacePage
    title="Audit Logs"
    subtitle="Every privileged action, with user and IP."
    dataset="audit" />


});