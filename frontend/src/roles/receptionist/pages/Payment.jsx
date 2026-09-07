import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentsView } from "@/components/common/UnifiedPaymentsView";

export const Route = createFileRoute("/reception/payment")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Reception Console" },
      { name: "description", content: "Payment records, cash drawer receipts, credit card POS logs and refunds tracker." }
    ]
  }),
  component: () => <UnifiedPaymentsView role="reception" />
});
