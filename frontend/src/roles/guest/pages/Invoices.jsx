import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices — Hour Stay" },
      { name: "description", content: "View and download your stay invoices and transaction summaries." },
      { property: "og:title", content: "Invoices — Hour Stay" },
      { property: "og:description", content: "View and download your stay invoices and transaction summaries." }
    ]
  }),
  component: () => (
    <WorkspacePage
      title="Invoices"
      subtitle="View and download your stay invoices and transaction summaries."
      dataset="invoices"
    />
  )
});
