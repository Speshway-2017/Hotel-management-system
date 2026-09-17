import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/hs/FormFields";
import { toast } from "sonner";
import {
  Building,
  Calendar,
  CreditCard,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck
} from "lucide-react";

export const Route = createFileRoute("/super-admin/subscription/requests/view/$id")({
  head: () => ({
    meta: [
      { title: "Subscription Request Details — Super Admin | Hour Stay" },
      { name: "description", content: "Review and decide hotel property subscription upgrade and renewal requests." }
    ]
  }),
  component: ViewSubscriptionRequest
});

export function ViewSubscriptionRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [requestItem, setRequestItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getSubscriptionRequests();
        if (res && res.success && Array.isArray(res.data)) {
          const found = res.data.find((r) => r._id === id || r.id === id);
          if (found) {
            setRequestItem(found);
          } else {
            setError("Subscription request record not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load subscription request details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchRequests();
  }, [id]);

  const handleDecision = async (action) => {
    if (!requestItem) return;
    if (action === "Reject" && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason.");
      return;
    }

    setIsDeciding(true);
    try {
      const res = await superAdminService.decideSubscriptionRequest(
        requestItem._id || requestItem.id,
        action,
        action === "Reject" ? rejectionReason : ""
      );
      if (res && res.success) {
        toast.success(`Request ${action === "Approve" ? "Approved" : "Rejected"} successfully.`);
        navigate({ to: "/super-admin/subscription" });
      }
    } catch (err) {
      toast.error(err.message || `Failed to ${action.toLowerCase()} request.`);
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-ui">
      <PageHeader
        title={requestItem ? `Subscription Request: ${requestItem.propertyName}` : "Subscription Request"}
        subtitle="Review plan tier upgrade/renewal details and grant workspace access."
      />

      {error && <Notice tone="error" title="Request Notice">{error}</Notice>}

      {loading ? (
        <LoadingRows count={4} />
      ) : requestItem ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Overview Card */}
          <div className="md:col-span-1 space-y-4">
            <Panel title="Request Summary" description="Property and plan tier coordinates">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 p-4 border border-navy/10 rounded-xl bg-cream/30">
                  <div className="size-12 rounded-full bg-purple/10 text-purple flex items-center justify-center font-extrabold text-lg shrink-0">
                    <Building className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy text-sm">{requestItem.propertyName}</h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">Property Upgrade Lead</span>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Request Status</span>
                    <Tag
                      tone={
                        requestItem.status === "Approved"
                          ? "success"
                          : requestItem.status === "Rejected"
                          ? "error"
                          : "warning"
                      }
                      className="text-xs font-bold"
                    >
                      {requestItem.status}
                    </Tag>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Requested Tier</span>
                    <span className="font-bold text-navy text-sm">{requestItem.planName}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Subscription Fee</span>
                    <span className="font-bold text-purple text-sm">₹{requestItem.price?.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Submitted By Admin</span>
                    <span className="font-semibold text-navy">{requestItem.adminName}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-4 text-navy/40 shrink-0" />
                    <span>
                      Date: {requestItem.createdAt ? new Date(requestItem.createdAt).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Decision Box */}
          <div className="md:col-span-2 space-y-4">
            <Panel title="Plan Scope & Decision Desk" description="Authorize or decline this subscription plan upgrade">
              <div className="p-6 bg-white rounded-b-xl space-y-6 text-xs font-sans">
                <div className="p-4 rounded-xl bg-cream/30 border border-navy/10 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-navy text-xs">
                    <ShieldCheck className="size-4 text-purple" />
                    <span>Platform Tier Access Scope</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Approving this request immediately activates the <strong>{requestItem.planName}</strong> features, limits, and channel integrations for <strong>{requestItem.propertyName}</strong> across their workspace.
                  </p>
                </div>

                {requestItem.status === "Pending" ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-navy uppercase tracking-wider block mb-2">
                        Rejection Feedback (Required only if rejecting)
                      </label>
                      <Textarea
                        placeholder="State reasons for declining (e.g., payment pending, invalid property credentials)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full text-xs min-h-[90px] rounded-xl border-navy/15 bg-white p-3 font-sans"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-navy/10">
                      <Button
                        disabled={isDeciding}
                        onClick={() => handleDecision("Approve")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-full text-xs shadow-soft cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="size-4" />
                        Approve Upgrade
                      </Button>

                      <Button
                        disabled={isDeciding}
                        onClick={() => handleDecision("Reject")}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-full text-xs shadow-soft cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <XCircle className="size-4" />
                        Reject Request
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-navy/10 bg-muted/10">
                    <div className="font-bold text-navy text-xs mb-1">
                      Status: {requestItem.status}
                    </div>
                    {requestItem.decidedBy && (
                      <p className="text-[11px] text-muted-foreground">
                        Decided by {requestItem.decidedBy} on {requestItem.decidedAt ? new Date(requestItem.decidedAt).toLocaleString("en-IN") : "—"}.
                      </p>
                    )}
                    {requestItem.rejectionReason && (
                      <p className="text-xs text-error font-medium mt-2">
                        Reason: {requestItem.rejectionReason}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ViewSubscriptionRequest;
