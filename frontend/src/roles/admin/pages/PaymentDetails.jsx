import { createFileRoute } from "@tanstack/react-router";
import { UnifiedPaymentDetailsView } from "@/components/common/UnifiedPaymentDetailsView";

export const Route = createFileRoute("/admin/payments/$id")({
  head: () => ({
    meta: [
      { title: "Payment Details — Speshway Luxury Hotel" },
      { name: "description", content: "Review transaction audit log, breakdown, and download payment receipts." }
    ]
  }),
  component: () => <UnifiedPaymentDetailsView role="admin" />
});
