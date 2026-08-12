import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
    { title: "Discounts & Refunds — Hour Stay" },
    { name: "description", content: "Approval queue for discounts, waivers and refunds." },
    { property: "og:title", content: "Discounts & Refunds — Hour Stay" },
    { property: "og:description", content: "Approval queue for discounts, waivers and refunds." }]

  }),
  component: () =>
  <WorkspacePage
    title="Discounts & Refunds"
    subtitle="Approval queue for discounts, waivers and refunds."
    dataset="payments" />


});