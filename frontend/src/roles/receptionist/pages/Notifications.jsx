import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/notifications")({
  head: () => ({
    meta: [
    { title: "Notifications — Hour Stay" },
    { name: "description", content: "Desk alerts for this shift." },
    { property: "og:title", content: "Notifications — Hour Stay" },
    { property: "og:description", content: "Desk alerts for this shift." }]

  }),
  component: () =>
  <WorkspacePage
    title="Notifications"
    subtitle="Desk alerts for this shift."
    dataset="notifications" />


});