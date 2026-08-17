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

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Hour Stay" },
      { name: "description", content: "Audit transactions, refunds, card captures and cash logs." },
      { property: "og:title", content: "Payments Ledger — Hour Stay" },
      { property: "og:description", content: "Audit transactions, refunds, card captures and cash logs." }
    ]
  }),
  component: () => (
    <WorkspacePage
      title="Payments Ledger"
      subtitle="Audit transactions, refunds, card captures and cash logs."
      dataset="payments"
      navTabs={<HorizontalRouteTabs tabs={financeTabs} />}
    />
  )
});