import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/hs/WorkspacePage";
import { useEffect, useState } from "react";
import { superAdminService } from "@/services/superAdmin";
import { HorizontalRouteTabs } from "@/components/hs/kit";
import { TrendingUp, BarChart3 } from "lucide-react";

const analyticsTabs = [
  { label: "Occupancy Trends", to: "/super-admin/occupancy", icon: TrendingUp },
  { label: "Performance Reports", to: "/super-admin/reports", icon: BarChart3 }
];

function SuperAdminOccupancy() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await superAdminService.getDashboardStats();
        if (res.success) {
          setStats(res.data.stats);
        }
      } catch (err) {
        setError(err.message || 'Failed to load occupancy stats');
      }
    }
    loadStats();
  }, []);

  return (
    <WorkspacePage
      title="Occupancy & Revenue"
      subtitle="Consolidated occupancy, ADR and RevPAR trends across the portfolio."
      dataset="properties"
      charts="both"
      stats={stats || [
        { label: "Portfolio occupancy", value: "—", delta: 0, hint: "Loading..." },
        { label: "Consolidated Revenue", value: "—", delta: 0, hint: "Loading..." },
        { label: "Group ADR", value: "—", delta: 0 },
        { label: "Active properties", value: "—", hint: "Loading..." }
      ]}
      notice={error ? { tone: "error", title: "Error", body: error } : null}
      navTabs={<HorizontalRouteTabs tabs={analyticsTabs} />}
    />
  );
}

export const Route = createFileRoute("/super-admin/occupancy")({
  head: () => ({
    meta: [
      { title: "Occupancy & Revenue — Hour Stay" },
      { name: "description", content: "Consolidated occupancy, ADR and RevPAR." },
      { property: "og:title", content: "Occupancy & Revenue — Hour Stay" },
      { property: "og:description", content: "Consolidated occupancy, ADR and RevPAR." }
    ]
  }),
  component: SuperAdminOccupancy
});