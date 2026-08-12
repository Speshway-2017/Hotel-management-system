import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/new-booking")({
  head: () => ({
    meta: [
    { title: "New / Walk-in Booking — Hour Stay" },
    { name: "description", content: "Create a walk-in or phone reservation." },
    { property: "og:title", content: "New / Walk-in Booking — Hour Stay" },
    { property: "og:description", content: "Create a walk-in or phone reservation." }]

  }),
  component: () =>
  <WorkspacePage
    title="New / Walk-in Booking"
    subtitle="Create a walk-in or phone reservation."
    dataset="roomTypes" />


});