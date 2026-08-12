import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/guest-search")({
  head: () => ({
    meta: [
    { title: "Guest Search — Hour Stay" },
    { name: "description", content: "Find any guest by name, mobile or booking ID." },
    { property: "og:title", content: "Guest Search — Hour Stay" },
    { property: "og:description", content: "Find any guest by name, mobile or booking ID." }]

  }),
  component: () =>
  <WorkspacePage
    title="Guest Search"
    subtitle="Find any guest by name, mobile or booking ID."
    dataset="guests" />


});