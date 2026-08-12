import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
    { title: "Staff Management — Hour Stay" },
    { name: "description", content: "Team roster, roles and shift assignments." },
    { property: "og:title", content: "Staff Management — Hour Stay" },
    { property: "og:description", content: "Team roster, roles and shift assignments." }]

  }),
  component: () =>
  <WorkspacePage
    title="Staff Management"
    subtitle="Team roster, roles and shift assignments."
    dataset="staff" />


});