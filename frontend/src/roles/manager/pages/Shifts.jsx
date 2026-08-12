import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/shifts")({
  head: () => ({
    meta: [
    { title: "Staff Shifts — Hour Stay" },
    { name: "description", content: "Roster and duty status for the front office." },
    { property: "og:title", content: "Staff Shifts — Hour Stay" },
    { property: "og:description", content: "Roster and duty status for the front office." }]

  }),
  component: () =>
  <WorkspacePage
    title="Staff Shifts"
    subtitle="Roster and duty status for the front office."
    dataset="staff" />


});