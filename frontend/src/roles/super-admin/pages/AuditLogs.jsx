import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, HorizontalRouteTabs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Activity, Terminal, Bell, ScrollText, Sparkles } from "lucide-react";

const systemTabs = [
  { label: "Alerts & Notifications", to: "/super-admin/notifications", icon: Bell },
  { label: "Audit Trails", to: "/super-admin/audit-logs", icon: ScrollText },
  { label: "CMS & Landing Branding", to: "/super-admin/branding", icon: Sparkles }
];

function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.getAuditLogs();
      if (res.success) {
        setLogs(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    return (
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.entity && log.entity.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ip && log.ip.includes(searchQuery))
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trails"
        subtitle="Security-first tracking of every administrative and operational action across the Hour Stay group."
        actions={
          <Button onClick={loadLogs} variant="outline" className="rounded-full gap-2 border-muted hover:bg-muted text-navy-deep">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh Logs
          </Button>
        }
      />

      <HorizontalRouteTabs tabs={systemTabs} />

      {error && <Notice tone="error" title="Audit Load Failed" className="text-left">{error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left main column: list logs */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-4 bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search logs by action, user email, entity, or IP..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
          </div>

          <Panel title="System Operations Log" description={`Showing ${filteredLogs.length} events`}>
            {loading ? (
              <LoadingRows rows={6} />
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No operations recorded yet or match filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Staff Operator</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Affected Entity</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredLogs.map((log) => (
                      <tr key={log.id || log._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                          {log.time || new Date(log.createdAt).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 font-semibold text-navy text-xs">
                          {log.user}
                        </td>
                        <td className="p-4 text-xs font-semibold text-purple">
                          {log.action}
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {log.entity || "—"}
                        </td>
                        <td className="p-4 font-mono text-[10px] text-muted-foreground">
                          {log.ip}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Right column: Info box */}
        <div className="space-y-4">
          <Panel title="Audit Controls" description="Governance compliance standards.">
            <div className="p-4 space-y-4">
              <div className="flex gap-3">
                <Activity className="size-5 text-purple shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-navy">Tamper-Proof Logging</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    Every API request containing privileged actions creates a record with timestamp, operator ID, and IP address. Logs cannot be modified or deleted.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Terminal className="size-5 text-gold shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-xs text-navy">Security Level Policy</h5>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                    IP locations and session signatures are validated on each check-in to prevent session hijacking and unauthorized admin logins.
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Hour Stay" },
      { name: "description", content: "Every privileged action, with user and IP." },
      { property: "og:title", content: "Audit Logs — Hour Stay" },
      { property: "og:description", content: "Every privileged action, with user and IP." }
    ]
  }),
  component: SuperAdminAuditLogs
});