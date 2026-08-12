import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/reports")({
  head: () => ({
    meta: [
    { title: "Reports — Hour Stay" },
    { name: "description", content: "Daily MIS, night audit and source mix." },
    { property: "og:title", content: "Reports — Hour Stay" },
    { property: "og:description", content: "Daily MIS, night audit and source mix." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reports"
    subtitle="Daily MIS, night audit and source mix."
    dataset="invoices"
    charts="mix" />


});