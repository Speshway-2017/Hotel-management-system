import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({
    meta: [
    { title: "Group Dashboard — Hour Stay" },
    { name: "description", content: "Consolidated performance across six Hour Stay properties." },
    { property: "og:title", content: "Group Dashboard — Hour Stay" },
    { property: "og:description", content: "Consolidated performance across six Hour Stay properties." }]

  }),
  component: () =>
  <WorkspacePage
    title="Group Dashboard"
    subtitle="Consolidated performance across six Hour Stay properties."
    dataset="properties"
    charts="revenue"
    stats={[{ label: "Portfolio occupancy", value: "84%", delta: 6, hint: "vs last month" }, { label: "Monthly revenue", value: "₹5.24 Cr", delta: 11, hint: "Aug 2026" }, { label: "Group ADR", value: "₹12,680", delta: 4 }, { label: "Active properties", value: "6", hint: "1 onboarding" }]} />


});