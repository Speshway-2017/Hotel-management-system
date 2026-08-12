import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/reservations")({
  head: () => ({
    meta: [
    { title: "Group Reservations — Hour Stay" },
    { name: "description", content: "Every booking across the portfolio." },
    { property: "og:title", content: "Group Reservations — Hour Stay" },
    { property: "og:description", content: "Every booking across the portfolio." }]

  }),
  component: () =>
  <WorkspacePage
    title="Group Reservations"
    subtitle="Every booking across the portfolio."
    dataset="reservations" />


});