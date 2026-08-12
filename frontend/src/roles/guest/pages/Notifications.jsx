import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/notifications")({
  head: () => ({
    meta: [
    { title: "Notifications — Hour Stay" },
    { name: "description", content: "Booking updates and offers." },
    { property: "og:title", content: "Notifications — Hour Stay" },
    { property: "og:description", content: "Booking updates and offers." }]

  }),
  component: () =>
  <WorkspacePage
    title="Notifications"
    subtitle="Booking updates and offers."
    dataset="notifications" />


});