import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/notifications")({
  head: () => ({
    meta: [
    { title: "Notifications — Hour Stay" },
    { name: "description", content: "Group-level alerts and escalations." },
    { property: "og:title", content: "Notifications — Hour Stay" },
    { property: "og:description", content: "Group-level alerts and escalations." }]

  }),
  component: () =>
  <WorkspacePage
    title="Notifications"
    subtitle="Group-level alerts and escalations."
    dataset="notifications" />


});