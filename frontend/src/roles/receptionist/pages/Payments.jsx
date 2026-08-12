import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/payments")({
  head: () => ({
    meta: [
    { title: "Payments — Hour Stay" },
    { name: "description", content: "Capture UPI, card and cash at the desk." },
    { property: "og:title", content: "Payments — Hour Stay" },
    { property: "og:description", content: "Capture UPI, card and cash at the desk." }]

  }),
  component: () =>
  <WorkspacePage
    title="Payments"
    subtitle="Capture UPI, card and cash at the desk."
    dataset="payments" />


});