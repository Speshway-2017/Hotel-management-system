import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { toast } from "sonner";
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Sliders,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
  RefreshCw,
  Building,
  Calendar
} from "lucide-react";

// Premium stat card component
function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full"
    >
      <div>
        <div className="h-8 flex items-start">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1.5 font-display text-lg font-black text-navy leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[10px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

import { subscribeRealtimeSync } from "@/services/socket";

function ManagerApprovalsPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [property, setProperty] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const user = authService.getCurrentUser();
      setCurrentUser(user);

      if (!user || user.role !== "manager") {
        setIsAuthorized(false);
        if (!isSilent) setLoading(false);
        return;
      }

      const [propRes, appRes] = await Promise.all([
        managerService.getProperty().catch(() => ({})),
        managerService.getApprovals().catch(() => ({}))
      ]);

      if (propRes.success && propRes.data) {
        setProperty(propRes.data);
      }

      if (appRes.success && appRes.data) {
        // Compile database approvals to matching UI requests schema
        const compiled = appRes.data.map(app => ({
          id: app._id || app.id,
          bookingId: "BK26-" + (app._id || app.id).substring(0, 4).toUpperCase(),
          guest: "Stay Folio Request",
          type: app.category === "Discount" ? "Discounts" : app.category === "Refund" ? "Refunds" : app.category === "Upgrade" ? "Complimentary Upgrades" : app.category,
          propertyId: app.propertyId,
          propertyName: propRes.data?.name || "assigned hotel branch",
          amountChange: app.amount > 0 ? `₹${app.amount}` : "Value Override",
          originalValue: "--",
          newValue: "--",
          reason: app.reason,
          requestedBy: app.requestedBy,
          requestedDate: app.createdAt ? new Date(app.createdAt).toISOString().split('T')[0] : "Today",
          status: app.status,
          decisionLog: app.status !== "Pending" ? {
            user: app.decidedBy,
            email: app.decidedBy,
            timestamp: app.decidedAt ? new Date(app.decidedAt).toLocaleString() : "Recently",
            action: app.status,
            originalValue: "--",
            newValue: "--",
            reason: app.decisionReason
          } : null
        }));
        setRequests(compiled);
      }

    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load approvals dataset");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(false);

    const handleFocus = () => loadData(true);
    window.addEventListener('focus', handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleDecision = async (id, newStatus, reason = "Approved by Property Manager") => {
    try {
      const res = await managerService.updateApproval(id, newStatus, reason);
      if (res.success) {
        toast.success(`Request ${id} has been ${newStatus.toLowerCase()} successfully.`);
        // Reload dataset
        loadData();
      }
    } catch (err) {
      toast.error(err.message || "Failed to update approval");
    }
  };

  // Stats computations
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === "Pending").length;
  const approvedCount = requests.filter(r => r.status === "Approved").length;
  const rejectedCount = requests.filter(r => r.status === "Rejected").length;

  // Filter Computations
  const filteredRequests = requests.filter(r => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      r.id.toLowerCase().includes(s) ||
      r.guest.toLowerCase().includes(s) ||
      r.requestedBy.toLowerCase().includes(s) ||
      r.reason.toLowerCase().includes(s);

    const matchesType = typeFilter === "all" || r.type === typeFilter;
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Pagination computations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view the Manager Console. Access is restricted to property managers.
        </Notice>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Approvals Ledger" subtitle="Loading pending authorization logs..." />
        <LoadingRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard label="Total Requests" value={totalCount.toString()} hint="All-time workflow submissions" accentColor="#0d1b2a" />
        <PremiumStatCard label="Awaiting Approval" value={pendingCount.toString()} hint="Requires manager action" accentColor="#3b82f6" />
        <PremiumStatCard label="Approved Stays" value={approvedCount.toString()} hint="Granted exceptions log" accentColor="#10b981" />
        <PremiumStatCard label="Rejected Requests" value={rejectedCount.toString()} hint="Denied exception logs" accentColor="#ef4444" />
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by Request ID, guest, requested by, or operational reason..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-xs font-semibold bg-cream/10 border-muted w-full"
            />
          </div>

          <div className="w-full md:w-56">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </Select>
          </div>

          <div className="w-full md:w-56">
            <Select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs h-9 font-semibold bg-[#FDFCFA]/20 border-muted"
            >
              <option value="all">All Request Types</option>
              <option value="Discounts">Discounts</option>
              <option value="Refunds">Refunds</option>
              <option value="Complimentary Upgrades">Complimentary Upgrades</option>
              <option value="Complimentary Services">Complimentary Services</option>
              <option value="Room Assignment Overrides">Room Assignment Overrides</option>
              <option value="Cancellation Exceptions">Cancellation Exceptions</option>
              <option value="Rate Overrides">Rate Overrides</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden">
        {paginatedRequests.length === 0 ? (
          <div className="p-16 text-center">
            <FileCheck className="size-12 text-muted-foreground/45 mx-auto mb-3" />
            <h3 className="font-semibold text-navy">No approval requests matching filters</h3>
            <p className="text-xs text-muted-foreground mt-1">Try resetting filter dropdown configurations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                  <th className="py-4.5 px-6">Request ID</th>
                  <th className="py-4.5 px-4">Request Type</th>
                  <th className="py-4.5 px-4">Requested By</th>
                  <th className="py-4.5 px-4">Property</th>
                  <th className="py-4.5 px-4">Amount / Change</th>
                  <th className="py-4.5 px-4">Reason</th>
                  <th className="py-4.5 px-4">Requested Date</th>
                  <th className="py-4.5 px-4 text-center">Status</th>
                  <th className="py-4.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-sm text-[#2a2a2a] bg-white font-medium">
                {paginatedRequests.map((r) => {
                  return (
                    <tr key={r.id} className="hover:bg-[#fcfcfc]/60 transition-colors group whitespace-nowrap">
                      <td className="py-4 px-6 font-mono text-[11px] text-muted-foreground">
                        {r.id}
                      </td>
                      <td className="py-4 px-4 font-bold text-navy-deep">
                        {r.type}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-bold text-navy">{r.requestedBy}</span>
                        <span className="text-[10px] text-muted-foreground ml-1.5">({r.guest})</span>
                      </td>
                      <td className="py-4 px-4 font-bold text-brand">
                        {r.propertyName || "Hotel Branch"}
                      </td>
                      <td className="py-4 px-4 font-semibold text-navy">
                        {r.amountChange}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground max-w-xs truncate" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-4 px-4 text-muted-foreground">
                        {r.requestedDate}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <Tag tone={
                          r.status === "Approved" ? "success" :
                          r.status === "Rejected" ? "error" : "brand"
                        }>
                          {r.status}
                        </Tag>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 select-none">
                          <Button
                            onClick={() => navigate({ to: `/manager/approvals/view/${r.id}` })}
                            size="icon"
                            variant="ghost"
                            className="size-7 hover:text-brand cursor-pointer"
                            title="View Request Details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          
                          {r.status === "Pending" && (
                            <>
                              <Button
                                onClick={() => handleDecision(r.id, "Approved")}
                                size="xs"
                                variant="outline"
                                className="text-success border-success/40 hover:bg-success/5 h-6 text-[10px] font-bold px-2 cursor-pointer"
                              >
                                Approve
                              </Button>
                              <Button
                                onClick={() => handleDecision(r.id, "Rejected")}
                                size="xs"
                                variant="outline"
                                className="text-destructive border-destructive/40 hover:bg-destructive/5 h-6 text-[10px] font-bold px-2 cursor-pointer"
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Panel */}
            <div className="p-4 border-t border-muted flex items-center justify-between gap-3 text-muted-foreground text-[10px] font-bold select-none">
              <span>Page {currentPage} of {totalPages} (Total: {filteredRequests.length})</span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 p-0 flex items-center justify-center border-muted cursor-pointer"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/approvals")({
  component: ManagerApprovalsPage
});