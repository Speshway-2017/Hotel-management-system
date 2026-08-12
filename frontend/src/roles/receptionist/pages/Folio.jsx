import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/folio")({
  head: () => ({
    meta: [
    { title: "Folio & Billing — Hour Stay" },
    { name: "description", content: "In-house folios and postings." },
    { property: "og:title", content: "Folio & Billing — Hour Stay" },
    { property: "og:description", content: "In-house folios and postings." }]

  }),
  component: () =>
  <WorkspacePage
    title="Folio & Billing"
    subtitle="In-house folios and postings."
    dataset="invoices" />


});