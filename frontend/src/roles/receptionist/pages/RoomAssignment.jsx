import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/room-assignment")({
  head: () => ({
    meta: [
    { title: "Room Assignment — Hour Stay" },
    { name: "description", content: "Assign and move rooms for arriving guests." },
    { property: "og:title", content: "Room Assignment — Hour Stay" },
    { property: "og:description", content: "Assign and move rooms for arriving guests." }]

  }),
  component: () =>
  <WorkspacePage
    title="Room Assignment"
    subtitle="Assign and move rooms for arriving guests."
    dataset="roomTypes" />


});