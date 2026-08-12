import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/check-in")({
  head: () => ({
    meta: [
    { title: "Check-in — Hour Stay" },
    { name: "description", content: "Today's arrivals ready for check-in." },
    { property: "og:title", content: "Check-in — Hour Stay" },
    { property: "og:description", content: "Today's arrivals ready for check-in." }]

  }),
  component: () =>
  <WorkspacePage
    title="Check-in"
    subtitle="Today's arrivals ready for check-in."
    dataset="reservations" />


});