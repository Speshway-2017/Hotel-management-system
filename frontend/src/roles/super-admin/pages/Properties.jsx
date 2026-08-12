import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/properties")({
  head: () => ({
    meta: [
    { title: "Properties — Hour Stay" },
    { name: "description", content: "All properties in the Hour Stay group." },
    { property: "og:title", content: "Properties — Hour Stay" },
    { property: "og:description", content: "All properties in the Hour Stay group." }]

  }),
  component: () =>
  <WorkspacePage
    title="Properties"
    subtitle="All properties in the Hour Stay group."
    dataset="properties" />


});