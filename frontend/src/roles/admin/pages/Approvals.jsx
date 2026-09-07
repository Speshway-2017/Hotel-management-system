import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag, Notice, LoadingRows, ActionGroup, ViewActionButton, ApproveActionButton, RejectActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Search, Eye, Clock, ShieldAlert,
  ArrowUpRight, AlertCircle, ShieldCheck, UserCheck, CalendarDays
} from "lucide-react";
import { subscribeRealtimeSync, emitRealtimeEvent } from "@/services/socket";
import { managerService } from "@/services/manager";
import { superAdminService } from "@/services/superAdmin";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Management Approvals Console — Speshway Luxury Hotel" },
      { name: "description", content: "Authorize pending hotel staff override requests, discounts, refunds, and room category changes." }
    ]
  }),
  component: AdminApprovalsPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-display text-base font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function AdminApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected details modal
  const [selectedReq, setSelectedReq] = useState(null);

  const loadApprovals = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      // Fetch approvals via managerService with fallback to superAdminService
      let res;
      try {
        res = await managerService.getApprovals();
      } catch (e) {
        res = await superAdminService.getApprovals();
      }

      const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      const mapped = list.map(a => {
        const id = a.id || a._id || `APR-${String(a._id || Math.random()).slice(-4).toUpperCase()}`;
        const val = a.value || (a.amount > 0 ? `₹${Number(a.amount).toLocaleString('en-IN')}` : "Complimentary Waiver");
        return {
          id: id,
          _id: a._id || a.id || id,
          guest: a.guest || "Guest Request",
          room: a.room || "101",
          type: a.category || "Override Request",
          category: a.category || "Override Request",
          reason: a.reason || a.description || "Override request logged",
          description: a.description || a.reason || "Override request logged",
          amount: Number(a.amount) || 0,
          value: val,
          requestedBy: a.requestedBy || "Front Desk Staff",
          requestedDate: a.createdAt ? new Date(a.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          status: a.status || "Pending",
          approvedBy: a.decidedBy || (a.status === "Approved" ? "Administrator" : "—"),
          decisionReason: a.decisionReason || "",
          bookingId: a.bookingId || "BKG-GENERAL"
        };
      });
      setRequests(mapped);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load approvals dataset");
      setRequests([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadApprovals(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleApprove = async (id) => {
    try {
      const target = requests.find(r => r.id === id || r._id === id);
      const targetId = target?._id || target?.id || id;
      await managerService.updateApproval(targetId, 'Approved', 'Approved via Admin Approvals Console');
      toast.success(`Request ${id} approved successfully!`);
      emitRealtimeEvent('dashboard_sync', { action: 'approval_updated', id: targetId });
      loadApprovals(true);
      if (selectedReq && (selectedReq.id === id || selectedReq._id === id)) {
        setSelectedReq({ ...selectedReq, status: "Approved", approvedBy: "Administrator" });
      }
    } catch (err) {
      toast.error(err.message || "Approval decision failed.");
    }
  };

  const handleReject = async (id) => {
    try {
      const target = requests.find(r => r.id === id || r._id === id);
      const targetId = target?._id || target?.id || id;
      await managerService.updateApproval(targetId, 'Rejected', 'Rejected via Admin Approvals Console');
      toast.error(`Request ${id} has been rejected.`);
      emitRealtimeEvent('dashboard_sync', { action: 'approval_updated', id: targetId });
      loadApprovals(true);
      if (selectedReq && (selectedReq.id === id || selectedReq._id === id)) {
        setSelectedReq({ ...selectedReq, status: "Rejected", approvedBy: "Administrator" });
      }
    } catch (err) {
      toast.error(err.message || "Rejection decision failed.");
    }
  };

  // Filter application
  const filteredRequests = requests.filter(r => {
    const s = searchQuery.toLowerCase().trim();
    const matchesSearch = !s ||
      r.guest.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s) ||
      r.bookingId.toLowerCase().includes(s) ||
      r.requestedBy.toLowerCase().includes(s) ||
      r.type.toLowerCase().includes(s) ||
      r.reason.toLowerCase().includes(s);

    const matchesType = typeFilter === "all" || r.type.toLowerCase().includes(typeFilter.toLowerCase()) || r.category.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Dynamic KPIs calculated directly from database records
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === "Pending").length;
  const approvedCount = requests.filter(r => r.status === "Approved").length;
  const rejectedCount = requests.filter(r => r.status === "Rejected").length;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Total Override Requests"
          value={totalCount.toString()}
          hint="All logged override records"
          icon={AlertCircle}
          accentColor="#6366f1"
        />
        <PremiumStatCard
          label="Awaiting Approval"
          value={pendingCount.toString()}
          hint="Action required immediately"
          icon={Clock}
          accentColor="#f59e0b"
        />
        <PremiumStatCard
          label="Approved Actions"
          value={approvedCount.toString()}
          hint="Override waivers cleared"
          icon={ShieldCheck}
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Rejected Actions"
          value={rejectedCount.toString()}
          hint="Disapproved staff actions"
          icon={ShieldAlert}
          accentColor="#ef4444"
        />
      </div>

      {/* Filters search bar */}
      <Panel title="Override Directory Search">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <FormField label="Search Guest or Ref Code" id="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                className="pl-9 h-10 text-xs font-bold"
                placeholder="Guest, Request ID, Booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Override Type" id="type">
            <Select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All Override Categories</option>
              <option value="refund">Refund Requests</option>
              <option value="discount">Discounts / Waivers</option>
              <option value="upgrade">Room Upgrades</option>
              <option value="waiver">Check-in / Late Waivers</option>
              <option value="cancellation">Cancellations</option>
            </Select>
          </FormField>

          <FormField label="Authorization Status" id="status">
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved Override</option>
              <option value="Rejected">Rejected</option>
            </Select>
          </FormField>
        </div>
      </Panel>

      {/* Main Table */}
      <Panel title="Override Approvals Ledger">
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground select-none">No pending authorization items matched query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                  <th className="py-3 px-4 text-left">Request ID</th>
                  <th className="py-3 px-4 text-left">Guest Name</th>
                  <th className="py-3 px-4 text-left">Booking Reference</th>
                  <th className="py-3 px-4 text-left">Override Action</th>
                  <th className="py-3 px-4 text-left font-bold text-navy">Value Index</th>
                  <th className="py-3 px-4 text-left">Requested By</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left min-w-[160px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                {filteredRequests.map((r) => (
                  <tr key={r.id || r._id} className="hover:bg-muted/5">
                    <td className="py-3 px-4 font-mono font-bold text-navy">{r.id}</td>
                    <td className="py-3 px-4 font-bold text-navy">{r.guest}</td>
                    <td className="py-3 px-4 font-mono font-bold">
                      {r.room ? `Room #${r.room} • ${r.bookingId}` : r.bookingId}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                        r.type.toLowerCase().includes("refund") ? "bg-amber-100 text-amber-800" :
                        r.type.toLowerCase().includes("discount") ? "bg-blue-100 text-blue-800" :
                        r.type.toLowerCase().includes("upgrade") ? "bg-emerald-100 text-emerald-800" :
                        "bg-purple-100 text-purple-800"
                      }`}>{r.type}</span>
                    </td>
                    <td className="py-3 px-4 font-black text-navy">{r.value}</td>
                    <td className="py-3 px-4 text-muted-foreground font-semibold">{r.requestedBy}</td>
                    <td className="py-3 px-4">
                      <Tag tone={r.status === "Approved" ? "success" : r.status === "Pending" ? "warning" : "danger"}>
                        {r.status}
                      </Tag>
                    </td>
                    <td className="py-3 px-4 text-left align-middle min-w-[160px] whitespace-nowrap">
                      <ActionGroup align="left">
                        {r.status === "Pending" && (
                          <>
                            <ApproveActionButton
                              onClick={() => handleApprove(r.id)}
                            />
                            <RejectActionButton
                              onClick={() => handleReject(r.id)}
                            />
                          </>
                        )}
                        <ViewActionButton
                          onClick={() => setSelectedReq(r)}
                        />
                      </ActionGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Detail Slideover Modal popup */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Request Details: {selectedReq.id}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">Booking Ref: {selectedReq.bookingId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy"
                onClick={() => setSelectedReq(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Content body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-muted/20 border border-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Override Action:</span>
                  <span className="font-bold">{selectedReq.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Waiver Value:</span>
                  <span className="font-black text-navy">{selectedReq.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Guest Name:</span>
                  <span className="font-bold">{selectedReq.guest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Requested By:</span>
                  <span className="font-bold">{selectedReq.requestedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Status:</span>
                  <Tag tone={selectedReq.status === "Approved" ? "success" : selectedReq.status === "Pending" ? "warning" : "danger"}>
                    {selectedReq.status}
                  </Tag>
                </div>
              </div>

              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-lg space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Justification Rationale</p>
                <p className="text-[11px] leading-relaxed text-navy font-medium mt-1">{selectedReq.description}</p>
              </div>

              {selectedReq.status === "Pending" ? (
                <div className="pt-2 border-t border-muted/50 flex gap-2">
                  <Button
                    onClick={() => handleApprove(selectedReq.id)}
                    className="flex-1 bg-success hover:bg-success/90 text-white font-bold h-9 text-xs rounded-full flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="size-3.5" /> Approve Request
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedReq.id)}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold h-9 text-xs rounded-full flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="size-3.5" /> Reject Request
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center font-bold text-success text-[10px] uppercase tracking-wider">
                  {selectedReq.status} by {selectedReq.approvedBy}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedReq(null)}
                className="h-8 px-4 text-xs rounded-full"
              >
                Close View
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}