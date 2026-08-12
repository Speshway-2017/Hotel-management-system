import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/pre-check-in")({
  head: () => ({
    meta: [
    { title: "Pre Check-in — Hour Stay" },
    { name: "description", content: "Share details before you arrive and skip the desk." },
    { property: "og:title", content: "Pre Check-in — Hour Stay" },
    { property: "og:description", content: "Share details before you arrive and skip the desk." }]

  }),
  component: () =>
  <WorkspacePage
    title="Pre Check-in"
    subtitle="Share details before you arrive and skip the desk."
    dataset="myBookings" />


});