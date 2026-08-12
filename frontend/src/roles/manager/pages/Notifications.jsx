import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/notifications")({
  head: () => ({
    meta: [
    { title: "Notifications — Hour Stay" },
    { name: "description", content: "Shift alerts and escalations." },
    { property: "og:title", content: "Notifications — Hour Stay" },
    { property: "og:description", content: "Shift alerts and escalations." }]

  }),
  component: () =>
  <WorkspacePage
    title="Notifications"
    subtitle="Shift alerts and escalations."
    dataset="notifications" />


});