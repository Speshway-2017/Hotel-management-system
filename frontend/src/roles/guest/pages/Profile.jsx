import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/profile")({
  head: () => ({
    meta: [
    { title: "Profile — Hour Stay" },
    { name: "description", content: "Personal details, preferences and documents." },
    { property: "og:title", content: "Profile — Hour Stay" },
    { property: "og:description", content: "Personal details, preferences and documents." }]

  }),
  component: () =>
  <WorkspacePage
    title="Profile"
    subtitle="Personal details, preferences and documents."
    dataset="none" />


});