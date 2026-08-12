import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/search")({
  head: () => ({
    meta: [
    { title: "Search Availability — Hour Stay" },
    { name: "description", content: "Find rooms across Hour Stay properties." },
    { property: "og:title", content: "Search Availability — Hour Stay" },
    { property: "og:description", content: "Find rooms across Hour Stay properties." }]

  }),
  component: () =>
  <WorkspacePage
    title="Search Availability"
    subtitle="Find rooms across Hour Stay properties."
    dataset="roomTypes" />


});