import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/reception/id-capture")({
  head: () => ({
    meta: [
    { title: "Guest ID Capture — Hour Stay" },
    { name: "description", content: "Upload and verify Aadhaar, passport or Form C." },
    { property: "og:title", content: "Guest ID Capture — Hour Stay" },
    { property: "og:description", content: "Upload and verify Aadhaar, passport or Form C." }]

  }),
  component: () =>
  <WorkspacePage
    title="Guest ID Capture"
    subtitle="Upload and verify Aadhaar, passport or Form C."
    dataset="reservations" />


});