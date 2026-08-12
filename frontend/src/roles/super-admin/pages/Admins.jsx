import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/admins")({
  head: () => ({
    meta: [
    { title: "Admin Management — Hour Stay" },
    { name: "description", content: "Property owners and admins with workspace access." },
    { property: "og:title", content: "Admin Management — Hour Stay" },
    { property: "og:description", content: "Property owners and admins with workspace access." }]

  }),
  component: () =>
  <WorkspacePage
    title="Admin Management"
    subtitle="Property owners and admins with workspace access."
    dataset="staff" />


});