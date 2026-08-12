import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
    { title: "Payments — Hour Stay" },
    { name: "description", content: "UPI, card, netbanking and cash settlements." },
    { property: "og:title", content: "Payments — Hour Stay" },
    { property: "og:description", content: "UPI, card, netbanking and cash settlements." }]

  }),
  component: () =>
  <WorkspacePage
    title="Payments"
    subtitle="UPI, card, netbanking and cash settlements."
    dataset="payments" />


});