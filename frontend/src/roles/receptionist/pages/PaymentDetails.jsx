import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentDetailsView } from "@/components/common/UnifiedPaymentDetailsView";

export const Route = createFileRoute("/reception/payments/$id")({
  head: () => ({
    meta: [
      { title: "Payment Details — Reception Console" },
      { name: "description", content: "Review transaction audit log, breakdown, and download payment receipts." }
    ]
  }),
  component: () => <UnifiedPaymentDetailsView role="reception" />
});
