import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/booking")({
  head: () => ({
    meta: [
    { title: "Booking — Hour Stay" },
    { name: "description", content: "Review your selection before payment." },
    { property: "og:title", content: "Booking — Hour Stay" },
    { property: "og:description", content: "Review your selection before payment." }]

  }),
  component: () =>
  <WorkspacePage
    title="Booking"
    subtitle="Review your selection before payment."
    dataset="roomTypes" />


});