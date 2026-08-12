import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/users")({
  head: () => ({
    meta: [
    { title: "Users & Roles — Hour Stay" },
    { name: "description", content: "Role assignments across all properties." },
    { property: "og:title", content: "Users & Roles — Hour Stay" },
    { property: "og:description", content: "Role assignments across all properties." }]

  }),
  component: () =>
  <WorkspacePage
    title="Users & Roles"
    subtitle="Role assignments across all properties."
    dataset="staff" />


});