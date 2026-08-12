import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/reservations")({
  head: () => ({
    meta: [
    { title: "Reservations — Hour Stay" },
    { name: "description", content: "All bookings for this property." },
    { property: "og:title", content: "Reservations — Hour Stay" },
    { property: "og:description", content: "All bookings for this property." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reservations"
    subtitle="All bookings for this property."
    dataset="reservations" />


});