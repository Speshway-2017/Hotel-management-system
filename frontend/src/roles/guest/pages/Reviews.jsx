import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/reviews")({
  head: () => ({
    meta: [
    { title: "Reviews & Feedback — Hour Stay" },
    { name: "description", content: "Share how your stays went." },
    { property: "og:title", content: "Reviews & Feedback — Hour Stay" },
    { property: "og:description", content: "Share how your stays went." }]

  }),
  component: () =>
  <WorkspacePage
    title="Reviews & Feedback"
    subtitle="Share how your stays went."
    dataset="feedback" />


});