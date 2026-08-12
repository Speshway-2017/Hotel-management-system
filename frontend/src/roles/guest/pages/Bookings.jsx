import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/bookings")({
  head: () => ({
    meta: [
    { title: "My Bookings — Hour Stay" },
    { name: "description", content: "Upcoming, completed and cancelled stays." },
    { property: "og:title", content: "My Bookings — Hour Stay" },
    { property: "og:description", content: "Upcoming, completed and cancelled stays." }]

  }),
  component: () =>
  <WorkspacePage
    title="My Bookings"
    subtitle="Upcoming, completed and cancelled stays."
    dataset="myBookings" />


});