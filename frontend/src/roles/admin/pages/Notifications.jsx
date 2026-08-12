import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
    { title: "Notifications — Hour Stay" },
    { name: "description", content: "Operational alerts for this property." },
    { property: "og:title", content: "Notifications — Hour Stay" },
    { property: "og:description", content: "Operational alerts for this property." }]

  }),
  component: () =>
  <WorkspacePage
    title="Notifications"
    subtitle="Operational alerts for this property."
    dataset="notifications" />


});