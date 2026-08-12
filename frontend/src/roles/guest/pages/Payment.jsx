import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/payment")({
  head: () => ({
    meta: [
    { title: "Payment — Hour Stay" },
    { name: "description", content: "Pay securely by UPI, card or netbanking." },
    { property: "og:title", content: "Payment — Hour Stay" },
    { property: "og:description", content: "Pay securely by UPI, card or netbanking." }]

  }),
  component: () =>
  <WorkspacePage
    title="Payment"
    subtitle="Pay securely by UPI, card or netbanking."
    dataset="invoices" />


});