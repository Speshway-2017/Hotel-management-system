import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";
import { HorizontalRouteTabs } from "@/components/hs/kit";
import { Receipt, CreditCard, FileText, Percent } from "lucide-react";

const financeTabs = [
  { label: "Billing & Invoices", to: "/admin/billing", icon: Receipt },
  { label: "Payments", to: "/admin/payments", icon: CreditCard },
  { label: "Discounts & Refunds", to: "/admin/approvals", icon: Percent },
  { label: "Taxes & GST", to: "/admin/taxes", icon: FileText }
];

export const Route = createFileRoute("/admin/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Invoices — Hour Stay" },
      { name: "description", content: "GST-ready tax invoices and folios." },
      { property: "og:title", content: "Billing & Invoices — Hour Stay" },
      { property: "og:description", content: "GST-ready tax invoices and folios." }
    ]
  }),
  component: () => (
    <WorkspacePage
      title="Billing & Invoices"
      subtitle="GST-ready tax invoices and folios."
      dataset="invoices"
      navTabs={<HorizontalRouteTabs tabs={financeTabs} />}
    />
  )
});