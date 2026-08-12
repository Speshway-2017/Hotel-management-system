import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/admin/channels")({
  head: () => ({
    meta: [
    { title: "OTA / Channel Manager — Hour Stay" },
    { name: "description", content: "Connected OTAs, mapped rooms and parity alerts." },
    { property: "og:title", content: "OTA / Channel Manager — Hour Stay" },
    { property: "og:description", content: "Connected OTAs, mapped rooms and parity alerts." }]

  }),
  component: () =>
  <WorkspacePage
    title="OTA / Channel Manager"
    subtitle="Connected OTAs, mapped rooms and parity alerts."
    dataset="channels" />


});