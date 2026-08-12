import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/manager/feedback")({
  head: () => ({
    meta: [
    { title: "Guest Feedback — Hour Stay" },
    { name: "description", content: "Recent reviews across direct and OTA channels." },
    { property: "og:title", content: "Guest Feedback — Hour Stay" },
    { property: "og:description", content: "Recent reviews across direct and OTA channels." }]

  }),
  component: () =>
  <WorkspacePage
    title="Guest Feedback"
    subtitle="Recent reviews across direct and OTA channels."
    dataset="feedback" />


});