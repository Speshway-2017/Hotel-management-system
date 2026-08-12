import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({
    meta: [
    { title: "Rooms & Room Types — Hour Stay" },
    { name: "description", content: "Inventory, amenities and per-type occupancy caps." },
    { property: "og:title", content: "Rooms & Room Types — Hour Stay" },
    { property: "og:description", content: "Inventory, amenities and per-type occupancy caps." }]

  }),
  component: () =>
  <WorkspacePage
    title="Rooms & Room Types"
    subtitle="Inventory, amenities and per-type occupancy caps."
    dataset="roomTypes" />


});