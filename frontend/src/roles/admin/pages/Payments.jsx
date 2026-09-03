import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentsView } from "@/components/common/UnifiedPaymentsView";

export const Route = createFileRoute("/admin/payments")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Speshway Luxury Hotel" },
      { name: "description", content: "Review card transactions, UPI logs, cash reconciliations, refunds, and bank settlements." }
    ]
  }),
  component: () => <UnifiedPaymentsView role="admin" />
});