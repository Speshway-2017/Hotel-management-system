import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentDetailsView } from "@/components/common/UnifiedPaymentDetailsView";

export const Route = createFileRoute("/manager/payments/$id")({
  head: () => ({
    meta: [
      { title: "Payment Details — Manager Console" },
      { name: "description", content: "Review transaction audit log, breakdown, and download payment receipts." }
    ]
  }),
  component: () => <UnifiedPaymentDetailsView role="manager" />
});
