import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/folio")({
  head: () => ({
    meta: [
    { title: "Digital Folio — Hour Stay" },
    { name: "description", content: "Your invoices and stay charges." },
    { property: "og:title", content: "Digital Folio — Hour Stay" },
    { property: "og:description", content: "Your invoices and stay charges." }]

  }),
  component: () =>
  <WorkspacePage
    title="Digital Folio"
    subtitle="Your invoices and stay charges."
    dataset="invoices" />


});