import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/super-admin/occupancy")({
  head: () => ({
    meta: [
    { title: "Occupancy & Revenue — Hour Stay" },
    { name: "description", content: "Consolidated occupancy, ADR and RevPAR." },
    { property: "og:title", content: "Occupancy & Revenue — Hour Stay" },
    { property: "og:description", content: "Consolidated occupancy, ADR and RevPAR." }]

  }),
  component: () =>
  <WorkspacePage
    title="Occupancy & Revenue"
    subtitle="Consolidated occupancy, ADR and RevPAR."
    dataset="properties"
    charts="both"
    stats={[{ label: "Portfolio occupancy", value: "84%", delta: 6, hint: "vs last month" }, { label: "Monthly revenue", value: "₹5.24 Cr", delta: 11, hint: "Aug 2026" }, { label: "Group ADR", value: "₹12,680", delta: 4 }, { label: "Active properties", value: "6", hint: "1 onboarding" }]} />


});