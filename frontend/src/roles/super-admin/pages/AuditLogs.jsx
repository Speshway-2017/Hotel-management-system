import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, HorizontalRouteTabs, statusTone } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw, Eye, X, Terminal, ShieldAlert, ShieldCheck } from "lucide-react";

const systemTabs = [
  { label: "Alerts & Notifications", to: "/super-admin/notifications", icon: Terminal },
  { label: "Audit Trails", to: "/super-admin/audit-logs", icon: ShieldCheck },
  { label: "CMS & Landing Branding", to: "/super-admin/branding", icon: ShieldAlert }
];

function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [moduleFilter, setModuleFilter] = useState("All");
  const [actionFilter, setActionFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  // Extract unique filter lists from logs
  const usersList = ["All", ...new Set(logs.map(l => l.user).filter(Boolean))];
  const rolesList = ["All", "Super Admin", "Admin", "Manager", "Receptionist"];
  const propertiesList = ["All", "Global", ...new Set(logs.map(l => l.property).filter(p => p && p !== "Global"))];
  const modulesList = ["All", ...new Set(logs.map(l => l.module).filter(Boolean))];
  const actionsList = ["All", ...new Set(logs.map(l => l.action).filter(Boolean))];

  // Helper to parse text log times
  const parseLogDate = (log) => {
    if (!log.time) return new Date(log.createdAt || Date.now());
    const cleanTime = log.time.replace(/,/g, '');
    const d = new Date(cleanTime);
    return isNaN(d.getTime()) ? new Date(log.createdAt || Date.now()) : d;
  };

  // Filter implementation
  const filteredLogs = logs.filter((log) => {
    // Search keyword query
    const matchesSearch =
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.description && log.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.ip && log.ip.includes(searchQuery));

    const matchesRole = roleFilter === "All" || (log.role || "Super Admin") === roleFilter;
    const matchesProperty = propertyFilter === "All" || (log.property || "Global") === propertyFilter;
    const matchesStatus = statusFilter === "All" || (log.status || "Success") === statusFilter;

    return matchesSearch && matchesRole && matchesProperty && matchesStatus;
  });

  const handleOpenDetails = (log) => {
    setSelectedLog(log);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trails"
        subtitle="Platform-wide tamper-proof governance ledger tracking security authorizations and critical hotel operations."
      />

      {error && <Notice tone="error" title="Audit Load Failed" className="text-left">{error}</Notice>}

      <div className="space-y-4">
        {/* Filters Toolbar - Grid of 4 main filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-card border rounded-xl p-4 shadow-soft">
          {/* Search */}
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search actions, emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full border-muted text-xs bg-white"
            />
          </div>

          {/* Role */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
            >
              <option value="All">All Roles</option>
              {rolesList.filter(r => r !== "All").map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Property */}
          <div>
            <select
              value={propertyFilter}
              onChange={(e) => setPropertyFilter(e.target.value)}
              className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
            >
              <option value="All">All Properties</option>
              {propertiesList.filter(p => p !== "All").map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
            >
              <option value="All">All Statuses</option>
              <option value="Success">Success</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table Panel */}
        <Panel title="System Operations Audit Trail" description={`Showing ${filteredLogs.length} events logged`}>
          {loading ? (
            <LoadingRows rows={8} />
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No operations recorded yet or matching filter configurations.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Module</th>
                    <th className="p-4">Property</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {filteredLogs.map((log) => (
                    <tr key={log.id || log._id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-4 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                        {log.time || new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 font-semibold text-navy text-xs whitespace-nowrap">
                        {log.user}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <Tag tone={log.role === "Super Admin" ? "brand" : log.role === "Admin" ? "success" : "neutral"}>
                          {log.role || "Super Admin"}
                        </Tag>
                      </td>
                      <td className="p-4 text-xs font-semibold text-purple whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="p-4 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {log.module || "System"}
                      </td>
                      <td className="p-4 text-xs font-medium text-navy whitespace-nowrap">
                        {log.property || "Global"}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground max-w-[200px] truncate" title={log.description}>
                        {log.description || "—"}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <Tag tone={(log.status || "Success") === "Success" ? "success" : "error"}>
                          {log.status || "Success"}
                        </Tag>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetails(log)}
                          className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Details View Modal */}
      {modalOpen && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <div className="flex items-center gap-2">
                <Terminal className="size-4.5 text-purple" />
                <h3 className="font-display font-bold text-lg text-navy">
                  Audit Entry Details
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-left text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Log Identifier</span>
                  <span className="block font-mono font-bold text-navy-deep mt-1 bg-muted/40 p-2 rounded border">{selectedLog.id || selectedLog._id}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status</span>
                  <div className="mt-1">
                    <Tag tone={(selectedLog.status || "Success") === "Success" ? "success" : "error"}>
                      {selectedLog.status || "Success"}
                    </Tag>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Date & Time</span>
                  <span className="block text-navy-deep font-mono mt-1 bg-muted/40 p-2 rounded border">
                    {selectedLog.time || new Date(selectedLog.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">IP Address</span>
                  <span className="block text-navy-deep font-mono mt-1 bg-muted/40 p-2 rounded border">{selectedLog.ip || "127.0.0.1"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">User Operator</span>
                  <span className="block text-navy-deep font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedLog.user}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">System Role</span>
                  <span className="block text-navy-deep font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedLog.role || "Super Admin"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Action Type</span>
                  <span className="block text-purple font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">System Module</span>
                  <span className="block text-navy-deep font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedLog.module || "System"}</span>
                </div>
              </div>

              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Property Association</span>
                <span className="block text-navy-deep font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedLog.property || "Global"}</span>
              </div>

              <div>
                <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Description Summary</span>
                <p className="text-navy-deep font-medium bg-muted/40 p-2.5 rounded border mt-1 leading-relaxed">
                  {selectedLog.description || "No description summary recorded for this system event."}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-muted">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full w-24">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/audit-logs")({
  head: () => ({
    meta: [
      { title: "Audit Logs — Hour Stay" },
      { name: "description", content: "Every privileged action, with operator role and IP address." },
      { property: "og:title", content: "Audit Logs — Hour Stay" },
      { property: "og:description", content: "Every privileged action, with operator role and IP address." }
    ]
  }),
  component: SuperAdminAuditLogs
});