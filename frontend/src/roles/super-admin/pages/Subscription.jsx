import { FormField, Input, Select, Textarea, Checkbox, Switch } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Building,
  DollarSign,
  Layers,
  Sparkles,
  UserCheck,
  ToggleLeft,
  ToggleRight,
  Eye,
  X,
  Clock,
  AlertOctagon
} from "lucide-react";

function SuperAdminSubscription() {
  const [activeTab, setActiveTab] = useState("plans"); // "plans" or "requests"
  const [plans, setPlans] = useState([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Plans Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Requests Filter & Search states
  const [requestSearch, setRequestSearch] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");

  // Decisions states
  const [decidingId, setDecidingId] = useState(null);
  const [rejectionModalId, setRejectionModalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    action: null
  });

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [plansRes, reqsRes] = await Promise.all([
        superAdminService.getSubscriptionPlans().catch(() => ({})),
        superAdminService.getSubscriptionRequests().catch(() => ({}))
      ]);
      if (plansRes.success) {
        setPlans(plansRes.data);
      }
      if (reqsRes.success) {
        setSubscriptionRequests(reqsRes.data);
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    const handleFocus = () => loadData(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filtered plans
  const filteredPlans = plans.filter(p => {
    return p.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filtered requests
  const filteredRequests = subscriptionRequests.filter(r => {
    const matchesSearch =
      r.propertyName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.adminName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.planName.toLowerCase().includes(requestSearch.toLowerCase());
    
    const matchesStatus = requestStatusFilter === "all" || r.status === requestStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Paginated plans
  const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
  const paginatedPlans = filteredPlans.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const triggerToggleStatus = (plan) => {
    const nextStatus = plan.status === "Active" ? "Inactive" : "Active";
    setConfirmModal({
      open: true,
      title: `${nextStatus === "Active" ? "Activate" : "Deactivate"} Plan`,
      message: `Are you sure you want to change the status of Plan "${plan.name}" to ${nextStatus}?`,
      action: async () => {
        try {
          const res = await superAdminService.updateSubscriptionPlan(plan._id || plan.id, {
            status: nextStatus
          });
          if (res.success) {
            toast.success(`Plan "${plan.name}" is now ${nextStatus}.`);
            loadData();
          }
        } catch (err) {
          toast.error(err.message || "Failed to toggle plan status.");
        } finally {
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      }
    });
  };

  const triggerDelete = (plan) => {
    setConfirmModal({
      open: true,
      title: "Delete Plan",
      message: `Are you sure you want to permanently delete Plan "${plan.name}"? This action is irreversible.`,
      action: async () => {
        try {
          const res = await superAdminService.deleteSubscriptionPlan(plan._id || plan.id);
          if (res.success) {
            toast.success(`Plan "${plan.name}" deleted.`);
            loadData();
          }
        } catch (err) {
          toast.error(err.message || "Failed to delete subscription plan.");
        } finally {
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      }
    });
  };

  const handleDecide = async (id, action, reason = "") => {
    setDecidingId(id);
    try {
      const res = await superAdminService.decideSubscriptionRequest(id, action, reason);
      if (res.success) {
        toast.success(`Subscription request ${action === 'Approve' ? 'approved' : 'rejected'} successfully.`);
        setRejectionModalId(null);
        setRejectionReason("");
        await loadData();
      } else {
        toast.error(res.message || "Failed to process decision.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process decision.");
    } finally {
      setDecidingId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Subscription Plans Control Center"
        subtitle="Configure system-wide subscription packages, monthly/yearly pricing parameters, and active platform subscribers."
        actions={
          <Link
            to="/super-admin/subscription/add"
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 flex items-center gap-1.5 h-9 font-bold text-xs cursor-pointer"
          >
            <Plus className="size-4" />
            Add Subscription Plan
          </Link>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-muted pb-px select-none mb-6">
        <button
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 border-b-2 font-bold text-xs transition-all ${
            activeTab === "plans"
              ? "border-navy text-navy"
              : "border-transparent text-muted-foreground hover:text-navy"
          }`}
        >
          Subscription Plans
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 border-b-2 font-bold text-xs transition-all ${
            activeTab === "requests"
              ? "border-navy text-navy"
              : "border-transparent text-muted-foreground hover:text-navy"
          }`}
        >
          Subscription Requests
        </button>
      </div>

      {loading ? (
        <LoadingRows rows={4} />
      ) : activeTab === "plans" ? (
        <Panel title="Platform Plans Catalog" description="Manage access packages and pricing limits across properties.">
          <div className="p-4 bg-white rounded-b-xl space-y-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search plan by name..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                  className="pl-9 h-9 rounded-full border border-navy/45 text-xs bg-white w-full text-navy font-semibold focus:border-navy focus:ring-1 focus:ring-navy"
                />
              </div>
              
              <div></div>
            </div>

            {/* Table */}
            {paginatedPlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-medium">No subscription packages found.</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                        <th className="p-4 pl-6">Plan Name</th>
                        <th className="p-4">Monthly Rate</th>
                        <th className="p-4">Yearly Rate</th>
                        <th className="p-4">Property / Room Limits</th>
                        <th className="p-4">Active Subscribers</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right pr-6 w-36 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-sans">
                      {paginatedPlans.map((p) => (
                        <tr key={p._id || p.id} className="hover:bg-muted/15 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="font-bold text-navy">{p.name}</div>
                            {p.description && <div className="text-[10px] text-muted-foreground mt-0.5">{p.description}</div>}
                          </td>
                          <td className="p-4 font-bold text-navy">₹{p.monthlyPrice.toLocaleString("en-IN")}</td>
                          <td className="p-4 font-bold text-purple">₹{p.yearlyPrice.toLocaleString("en-IN")}</td>
                          <td className="p-4 font-semibold text-muted-foreground">
                            {p.propertyLimit} {p.propertyLimit === 1 ? "Property" : "Properties"} / {p.roomLimit} Rooms
                          </td>
                          <td className="p-4 font-bold text-navy flex items-center gap-1.5 mt-2">
                            <UserCheck className="size-4 text-purple" />
                            {p.activeSubscribers || 0}
                          </td>
                          <td className="p-4">
                            <Tag tone={p.status === "Active" ? "success" : "neutral"}>{p.status}</Tag>
                          </td>
                          <td className="p-4 text-right pr-6 w-36 whitespace-nowrap space-x-1">
                            <Link
                              to={`/super-admin/subscription/view/${p._id || p.id}`}
                              className="size-8 p-0 rounded-full text-navy hover:bg-muted cursor-pointer inline-flex items-center justify-center"
                              title="View Plan Details"
                            >
                              <Eye className="size-4" />
                            </Link>
                            <Link
                              to={`/super-admin/subscription/edit/${p._id || p.id}`}
                              className="size-8 p-0 rounded-full text-purple hover:bg-purple/10 cursor-pointer inline-flex items-center justify-center"
                              title="Edit Plan"
                            >
                              <Edit2 className="size-4" />
                            </Link>
                            <Button
                              onClick={() => triggerToggleStatus(p)}
                              variant="ghost"
                              className={`size-8 p-0 rounded-full hover:bg-muted cursor-pointer ${p.status === "Active" ? "text-warning" : "text-success"}`}
                              title={p.status === "Active" ? "Deactivate Plan" : "Activate Plan"}
                            >
                              {p.status === "Active" ? <ToggleLeft className="size-5" /> : <ToggleRight className="size-5" />}
                            </Button>
                            <Button
                              onClick={() => triggerDelete(p)}
                              variant="ghost"
                              className="size-8 p-0 rounded-full text-error hover:bg-error/10 cursor-pointer"
                              title="Delete Plan"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t pt-4 text-xs">
                    <span className="text-muted-foreground">Showing page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        className="rounded-lg text-xs"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                        className="rounded-lg text-xs"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Panel>
      ) : (
        <div className="space-y-4">
          <Panel title="Incoming Subscription Upgrade & Renewal Requests" description="Review subscription requests submitted by property administrators.">
            <div className="p-4 bg-white rounded-b-xl space-y-4">
              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
                <div className="relative w-full max-w-xs">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search requests by branch or admin..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="pl-9 h-9 rounded-full border border-navy/45 text-xs bg-white w-full text-navy font-semibold focus:border-navy focus:ring-1 focus:ring-navy"
                  />
                </div>

                <Select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  className="h-9 rounded-full border border-navy/45 text-xs bg-white text-navy font-bold focus:border-navy focus:ring-1"
                >
                  <option value="all">All Request Statuses</option>
                  <option value="Pending">Pending Review</option>
                  <option value="Approved">Approved Tiers</option>
                  <option value="Rejected">Rejected Tiers</option>
                </Select>
              </div>

              {/* Requests Table */}
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
                  No subscription requests found matching the filter.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-bold select-none">
                        <th className="p-4 pl-6">Property Branch</th>
                        <th className="p-4">Requested Plan</th>
                        <th className="p-4">Admin</th>
                        <th className="p-4 text-right">Price</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4">Request Date</th>
                        <th className="p-4 text-right pr-6 w-36 whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-sans">
                      {filteredRequests.map((req) => (
                        <tr key={req._id || req.id} className="hover:bg-muted/15 transition-colors">
                          <td className="p-4 pl-6 font-bold text-navy">{req.propertyName}</td>
                          <td className="p-4 font-semibold text-navy-deep">{req.planName}</td>
                          <td className="p-4 text-muted-foreground font-medium">{req.adminName}</td>
                          <td className="p-4 text-right font-bold text-navy">₹{req.price.toLocaleString("en-IN")}</td>
                          <td className="p-4 text-center">
                            <Tag tone={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'error' : 'warning'}>
                              {req.status}
                            </Tag>
                          </td>
                          <td className="p-4 text-muted-foreground font-semibold">
                            {new Date(req.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-4 text-right pr-6 w-36 whitespace-nowrap space-x-1">
                            <Button
                              onClick={() => navigate({ to: `/super-admin/subscription/requests/view/${req._id || req.id}` })}
                              variant="ghost"
                              className="size-8 p-0 rounded-full text-navy hover:bg-muted cursor-pointer inline-flex items-center justify-center"
                              title="View Request Details"
                            >
                              <Eye className="size-4" />
                            </Button>
                            {req.status === 'Pending' && (
                              <>
                                <Button
                                  disabled={decidingId !== null}
                                  onClick={() => handleDecide(req._id || req.id, 'Approve')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-7 px-3 text-[10px] rounded-lg shadow-soft cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  Approve
                                </Button>
                                <Button
                                  disabled={decidingId !== null}
                                  onClick={() => {
                                    setRejectionModalId(req._id || req.id);
                                    setRejectionReason("");
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white font-bold h-7 px-3 text-[10px] rounded-lg shadow-soft cursor-pointer inline-flex items-center justify-center gap-1"
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] border border-navy/5 relative">
            <h4 className="font-display font-bold text-navy text-base mb-2">{confirmModal.title}</h4>
            <p className="text-xs text-muted-foreground leading-normal mb-4 font-medium">{confirmModal.message}</p>
            <div className="flex gap-2 justify-end border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setConfirmModal({ open: false, title: "", message: "", action: null })}
                className="rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmModal.action}
                className="bg-error hover:bg-error/90 text-cream rounded-full px-5 text-xs font-semibold cursor-pointer"
              >
                Confirm Action
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Feedback Modal */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            <div className="p-4 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-bold text-navy text-sm">Provide Rejection Reason</h3>
              <button
                className="text-muted-foreground hover:text-navy cursor-pointer"
                onClick={() => setRejectionModalId(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Feedback / Reason for rejection</label>
                <textarea
                  className="w-full border border-muted rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-navy resize-none min-h-[80px]"
                  placeholder="E.g., Requested tier does not match target property rooms count limit."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setRejectionModalId(null)}
                className="h-8 px-4 text-xs rounded-full cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                disabled={!rejectionReason.trim()}
                onClick={() => handleDecide(rejectionModalId, 'Reject', rejectionReason)}
                className="bg-red-600 hover:bg-red-700 text-white font-bold h-8 px-4 text-xs rounded-full cursor-pointer"
              >
                Submit Rejection
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Request Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            <div className="p-4 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-bold text-navy text-sm">Subscription Request Details</h3>
              <button
                className="text-muted-foreground hover:text-navy cursor-pointer"
                onClick={() => setSelectedRequest(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 border border-muted rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Property Branch</span>
                  <span className="font-bold text-navy text-sm">{selectedRequest.propertyName}</span>
                </div>
                <div className="p-3 bg-muted/20 border border-muted rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Requested Plan</span>
                  <span className="font-bold text-navy text-sm">{selectedRequest.planName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 border border-muted rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Administrator</span>
                  <span className="font-bold text-navy text-sm">{selectedRequest.adminName}</span>
                </div>
                <div className="p-3 bg-muted/20 border border-muted rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Rate / Month</span>
                  <span className="font-bold text-navy text-sm">₹{selectedRequest.price.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-lg space-y-1.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Status & Log Details</p>
                <div className="flex justify-between items-center text-xs">
                  <span>Current Status:</span>
                  <Tag tone={selectedRequest.status === 'Approved' ? 'success' : selectedRequest.status === 'Rejected' ? 'error' : 'warning'}>
                    {selectedRequest.status}
                  </Tag>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span>Submitted On:</span>
                  <span className="font-semibold">{new Date(selectedRequest.createdAt).toLocaleString("en-IN")}</span>
                </div>
                {selectedRequest.status !== 'Pending' && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span>Decided By:</span>
                      <span className="font-semibold">{selectedRequest.decidedBy === "Nandini Rao" || selectedRequest.decidedBy === "Super Admin" || !selectedRequest.decidedBy ? "Nandini Rao Rao" : selectedRequest.decidedBy}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Decided On:</span>
                      <span className="font-semibold">{new Date(selectedRequest.decidedAt).toLocaleString("en-IN")}</span>
                    </div>
                  </>
                )}
              </div>

              {selectedRequest.status === 'Rejected' && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg space-y-1">
                  <p className="text-[9px] font-bold text-red-700 uppercase tracking-wider">Rejection Reason</p>
                  <p className="font-bold text-red-800 leading-relaxed">{selectedRequest.rejectionReason || "No details specified"}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedRequest(null)}
                className="h-8 px-4 text-xs rounded-full cursor-pointer"
              >
                Close details
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export const Route = createFileRoute("/super-admin/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription Plans & Billing — Hour Stay" },
      { name: "description", content: "Configure platform billing packages and pricing layers." }
    ]
  }),
  component: SuperAdminSubscription
});
