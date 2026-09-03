import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentsView } from "@/components/common/UnifiedPaymentsView";

export const Route = createFileRoute("/manager/payments")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Manager Console" },
      { name: "description", content: "Reconcile real-time guest transaction records, payment channels, and settlement logs." }
    ]
  }),
  component: () => <UnifiedPaymentsView role="manager" />
});
