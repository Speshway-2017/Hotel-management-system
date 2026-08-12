import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/")({
  head: () => ({
    meta: [
    { title: "Namaste, Aarav — Hour Stay" },
    { name: "description", content: "Your stays, requests and rewards with Hour Stay." },
    { property: "og:title", content: "Namaste, Aarav — Hour Stay" },
    { property: "og:description", content: "Your stays, requests and rewards with Hour Stay." }]

  }),
  component: () =>
  <WorkspacePage
    title="Namaste, Aarav"
    subtitle="Your stays, requests and rewards with Hour Stay."
    dataset="myBookings"
    stats={[{ label: "Next stay", value: "12 Aug" }, { label: "Loyalty tier", value: "Platinum" }, { label: "Points", value: "48,200" }, { label: "Stays", value: "24" }]} />


});