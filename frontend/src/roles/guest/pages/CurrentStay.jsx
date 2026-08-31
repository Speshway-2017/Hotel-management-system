import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";

export const Route = createFileRoute("/guest/current-stay")({
  head: () => ({
    meta: [
      { title: "Current Stay — Hour Stay" },
      { name: "description", content: "Details of your current room stay, services, and amenities." },
      { property: "og:title", content: "Current Stay — Hour Stay" },
      { property: "og:description", content: "Details of your current room stay, services, and amenities." }
    ]
  }),
  component: () => (
    <WorkspacePage
      title="Current Stay"
      subtitle="Details of your current room stay, services, and amenities."
      stats={[
        { label: "Hotel", value: "Hour Stay Rambagh Residency" },
        { label: "Room", value: "312 (Premier Haveli Room)" },
        { label: "Wi-Fi Password", value: "RambaghGuest312" },
        { label: "Check-out Time", value: "Tomorrow, 11:00 AM" }
      ]}
      dataset="services"
      tableTitle="Active Room Service Requests"
    />
  )
});
