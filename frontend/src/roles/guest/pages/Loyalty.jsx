import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/loyalty")({
  head: () => ({
    meta: [
    { title: "Loyalty — Hour Stay" },
    { name: "description", content: "Your tier, points and member privileges." },
    { property: "og:title", content: "Loyalty — Hour Stay" },
    { property: "og:description", content: "Your tier, points and member privileges." }]

  }),
  component: () =>
  <WorkspacePage
    title="Loyalty"
    subtitle="Your tier, points and member privileges."
    dataset="myBookings"
    stats={[{ label: "Next stay", value: "12 Aug" }, { label: "Loyalty tier", value: "Platinum" }, { label: "Points", value: "48,200" }, { label: "Stays", value: "24" }]} />


});