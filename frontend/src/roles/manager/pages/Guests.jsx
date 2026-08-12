import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/guests")({
  head: () => ({
    meta: [
    { title: "Guests / CRM — Hour Stay" },
    { name: "description", content: "In-house and repeat guest profiles." },
    { property: "og:title", content: "Guests / CRM — Hour Stay" },
    { property: "og:description", content: "In-house and repeat guest profiles." }]

  }),
  component: () =>
  <WorkspacePage
    title="Guests / CRM"
    subtitle="In-house and repeat guest profiles."
    dataset="guests" />


});