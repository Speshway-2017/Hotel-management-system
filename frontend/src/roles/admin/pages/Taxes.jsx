import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/taxes")({
  head: () => ({
    meta: [
    { title: "Taxes & GST Settings — Hour Stay" },
    { name: "description", content: "Slab mapping, SAC codes and place of supply." },
    { property: "og:title", content: "Taxes & GST Settings — Hour Stay" },
    { property: "og:description", content: "Slab mapping, SAC codes and place of supply." }]

  }),
  component: () =>
  <WorkspacePage
    title="Taxes & GST Settings"
    subtitle="Slab mapping, SAC codes and place of supply."
    dataset="invoices" />


});