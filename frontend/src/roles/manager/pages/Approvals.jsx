import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/approvals")({
  head: () => ({
    meta: [
    { title: "Approvals — Hour Stay" },
    { name: "description", content: "Discounts, refunds and late check-out requests." },
    { property: "og:title", content: "Approvals — Hour Stay" },
    { property: "og:description", content: "Discounts, refunds and late check-out requests." }]

  }),
  component: () =>
  <WorkspacePage
    title="Approvals"
    subtitle="Discounts, refunds and late check-out requests."
    dataset="payments" />


});