import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentsView } from "@/components/common/UnifiedPaymentsView";

export const Route = createFileRoute("/reception/payments")({
  head: () => ({
    meta: [
      { title: "Payments Ledger — Reception Console" },
      { name: "description", content: "Capture front-desk payments, audit transactions, and process settlement check-offs." }
    ]
  }),
  component: () => <UnifiedPaymentsView role="reception" />
});