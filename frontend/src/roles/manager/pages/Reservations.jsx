import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/reservations")({
  head: () => ({
    meta: [
    { title: "Reservations — Hour Stay" },
    { name: "description", content: "Upcoming and in-house bookings." },
    { property: "og:title", content: "Reservations — Hour Stay" },
    { property: "og:description", content: "Upcoming and in-house bookings." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reservations"
    subtitle="Upcoming and in-house bookings."
    dataset="reservations" />


});