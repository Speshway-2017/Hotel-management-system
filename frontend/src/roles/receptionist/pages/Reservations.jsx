import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/reservations")({
  head: () => ({
    meta: [
    { title: "Reservations — Hour Stay" },
    { name: "description", content: "Search, amend and confirm bookings." },
    { property: "og:title", content: "Reservations — Hour Stay" },
    { property: "og:description", content: "Search, amend and confirm bookings." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reservations"
    subtitle="Search, amend and confirm bookings."
    dataset="reservations" />


});