import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/rates")({
  head: () => ({
    meta: [
    { title: "Rates & Seasonal Pricing — Hour Stay" },
    { name: "description", content: "Season plans, festival surcharges and OTA rates." },
    { property: "og:title", content: "Rates & Seasonal Pricing — Hour Stay" },
    { property: "og:description", content: "Season plans, festival surcharges and OTA rates." }]

  }),
  component: () =>
  <WorkspacePage
    title="Rates & Seasonal Pricing"
    subtitle="Season plans, festival surcharges and OTA rates."
    dataset="roomTypes" />


});