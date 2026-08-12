import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/channel-manager")({
  head: () => ({
    meta: [
    { title: "Channel Manager — Hour Stay" },
    { name: "description", content: "OTA connections and rate parity across the group." },
    { property: "og:title", content: "Channel Manager — Hour Stay" },
    { property: "og:description", content: "OTA connections and rate parity across the group." }]

  }),
  component: () =>
  <WorkspacePage
    title="Channel Manager"
    subtitle="OTA connections and rate parity across the group."
    dataset="channels" />


});