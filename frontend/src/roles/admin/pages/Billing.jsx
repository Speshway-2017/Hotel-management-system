import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({
    meta: [
    { title: "Billing & Invoices — Hour Stay" },
    { name: "description", content: "GST-ready tax invoices and folios." },
    { property: "og:title", content: "Billing & Invoices — Hour Stay" },
    { property: "og:description", content: "GST-ready tax invoices and folios." }]

  }),
  component: () =>
  <WorkspacePage
    title="Billing & Invoices"
    subtitle="GST-ready tax invoices and folios."
    dataset="invoices" />


});