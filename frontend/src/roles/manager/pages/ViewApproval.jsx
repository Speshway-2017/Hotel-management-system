import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { FormField, Textarea } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileCheck,
  Calendar,
  User,
  Building,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight
} from "lucide-react";

function ManagerViewApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  
  // Decision Form State
  const [decisionReason, setDecisionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadRequestDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const appRes = await managerService.getApprovals();
        if (appRes.success && appRes.data) {
          const list = appRes.data;
          const matched = list.find(r => r._id === id || r.id === id);
          if (matched) {
            // Compile database approval to matching UI request schema
            setRequest({
              id: matched._id || matched.id,
              bookingId: "BK26-" + (matched._id || matched.id).substring(0, 4).toUpperCase(),
              guest: "Stay Folio Request",
              type: matched.category === "Discount" ? "Discounts" : matched.category === "Refund" ? "Refunds" : matched.category === "Upgrade" ? "Complimentary Upgrades" : matched.category,
              propertyId: matched.propertyId,
              propertyName: "assigned hotel branch",
              amountChange: matched.amount > 0 ? `₹${matched.amount}` : "Value Override",
              originalValue: "--",
              newValue: "--",
              reason: matched.reason,
              requestedBy: matched.requestedBy,
              requestedDate: new Date(matched.createdAt).toISOString().split('T')[0],
              status: matched.status,
              decisionLog: matched.status !== "Pending" ? {
                user: matched.decidedBy,
                email: matched.decidedBy,
                timestamp: new Date(matched.decidedAt).toLocaleString(),
                action: matched.status,
                originalValue: "--",
                newValue: "--",
                reason: matched.decisionReason
              } : null
            });
          } else {
            setError("Approval request record not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load approval request details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadRequestDetail();
  }, [id]);

  const handleDecisionSubmit = async (action) => {
    if (!currentUser || !request) return;
    setProcessing(true);
    try {
      const res = await managerService.updateApproval(id, action, decisionReason || `Approved by ${currentUser.role}`);
      if (res.success) {
        toast.success(`Request has been successfully ${action.toLowerCase()}.`);
        
        // Reload details dynamically
        const appRes = await managerService.getApprovals();
        if (appRes.success && appRes.data) {
          const matched = appRes.data.find(r => r._id === id || r.id === id);
          if (matched) {
            setRequest({
              id: matched._id || matched.id,
              bookingId: "BK26-" + (matched._id || matched.id).substring(0, 4).toUpperCase(),
              guest: "Stay Folio Request",
              type: matched.category === "Discount" ? "Discounts" : matched.category === "Refund" ? "Refunds" : matched.category === "Upgrade" ? "Complimentary Upgrades" : matched.category,
              propertyId: matched.propertyId,
              propertyName: "assigned hotel branch",
              amountChange: matched.amount > 0 ? `₹${matched.amount}` : "Value Override",
              originalValue: "--",
              newValue: "--",
              reason: matched.reason,
              requestedBy: matched.requestedBy,
              requestedDate: new Date(matched.createdAt).toISOString().split('T')[0],
              status: matched.status,
              decisionLog: matched.status !== "Pending" ? {
                user: matched.decidedBy,
                email: matched.decidedBy,
                timestamp: new Date(matched.decidedAt).toLocaleString(),
                action: matched.status,
                originalValue: "--",
                newValue: "--",
                reason: matched.decisionReason
              } : null
            });
          }
        }
      }
    } catch (err) {
      toast.error("Failed to record approval decision.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view approval logs for this property. Access is strictly scoped to your assigned hotel branch.
        </Notice>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <PageHeader
        title={request ? `Approval Request: ${request.id}` : "Approval Details"}
        subtitle="Audit operational exceptions, check values change, and log authorization decisions."
      />

      {error && <Notice tone="error" title="Ledger Fetch Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : request ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          {/* Main Request info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Request parameters panel */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <FileCheck className="size-5 text-brand" />
                  <h4 className="font-semibold text-navy text-sm">Request Parameters</h4>
                </div>
                <Tag tone={
                  request.status === "Approved" ? "success" :
                  request.status === "Rejected" ? "error" : "brand"
                }>
                  {request.status}
                </Tag>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Category / Type</span>
                  <span className="font-bold text-navy-deep text-sm block mt-0.5">{request.type}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Submission Date</span>
                  <span className="font-semibold block mt-0.5">{request.requestedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Requested By</span>
                  <span className="font-bold block mt-0.5 text-navy">{request.requestedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Target Guest</span>
                  <span className="font-bold block mt-0.5 text-brand">{request.guest}</span>
                </div>
                <div className="md:col-span-2 pt-2.5 border-t border-muted/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Operational Reason</span>
                  <p className="font-medium text-navy-deep mt-1 leading-relaxed">{request.reason}</p>
                </div>
              </div>
            </div>

            {/* Original vs. New values transition panel */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <ArrowRight className="size-4.5 text-purple" />
                <h4 className="font-semibold text-navy text-sm">Value Deviation Audit</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-center">
                <div className="p-4 bg-muted/20 border border-muted rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Original Value</span>
                  <div className="font-bold text-navy text-sm mt-1.5 font-mono">{request.originalValue}</div>
                </div>
                <div className="flex justify-center text-muted-foreground">
                  <ArrowRight className="size-6 rotate-90 md:rotate-0" />
                </div>
                <div className="p-4 bg-brand/5 border border-brand/20 rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand">Requested Value</span>
                  <div className="font-bold text-brand text-sm mt-1.5 font-mono">{request.newValue}</div>
                </div>
              </div>
            </div>

            {/* Target Booking Info */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Calendar className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm">Linked Folio Reservation</h4>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-navy-deep">Booking Reference ID: #{request.bookingId}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Guest stayed / reserved: {request.guest}</p>
                </div>
                {request.bookingId !== "HS-MOCK-99" && request.bookingId !== "HS-MOCK-98" && request.bookingId !== "HS-MOCK-97" ? (
                  <Link
                    to={`/manager/reservations/view/${request.bookingId}`}
                    className="text-brand font-bold hover:underline flex items-center gap-1.5"
                  >
                    Open Stay Folio <ArrowRight className="size-3.5" />
                  </Link>
                ) : (
                  <span className="text-muted-foreground italic">Mock booking ledger reference</span>
                )}
              </div>
            </div>

          </div>

          {/* Sidebar Decision panel */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Decisional Input box */}
            {request.status === "Pending" ? (
              <Panel title="Manager Authorization" description="Review exceptions and record authorization choices.">
                <div className="p-5 space-y-4 bg-white rounded-b-xl">
                  <FormField label="Operational Decision Notes" required id="notes">
                    <Textarea
                      id="notes"
                      placeholder="Input review notes or justification reasons here..."
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      className="min-h-[100px] text-xs"
                    />
                  </FormField>
                  
                  <div className="pt-2 border-t border-muted/70 flex flex-col gap-2">
                    <Button
                      onClick={() => handleDecisionSubmit("Approved")}
                      disabled={processing}
                      className="w-full bg-success hover:bg-success/90 text-white font-bold h-9 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="size-4" /> Grant Approval
                    </Button>
                    <Button
                      onClick={() => handleDecisionSubmit("Rejected")}
                      disabled={processing}
                      className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold h-9 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="size-4" /> Deny / Reject Request
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : request.decisionLog ? (
              /* Already decided audit log */
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-muted">
                  <ShieldCheck className="size-4.5 text-success" />
                  <h4 className="font-semibold text-navy text-sm">Authorization Decision Log</h4>
                </div>
                <div className="space-y-3.5 text-xs text-navy">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Authorized By</span>
                    <strong className="text-navy-deep block mt-0.5">{request.decisionLog.user}</strong>
                    <span className="text-[10px] text-muted-foreground">{request.decisionLog.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Audit Action Timestamp</span>
                    <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-muted-foreground">
                      <Clock className="size-3.5 text-brand" />
                      <span>{request.decisionLog.timestamp}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Decision Result</span>
                    <div className="mt-1">
                      <Tag tone={request.decisionLog.action === "Approved" ? "success" : "error"}>
                        {request.decisionLog.action}
                      </Tag>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-muted/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Reason Justification</span>
                    <p className="italic text-muted-foreground mt-1 leading-relaxed">"{request.decisionLog.reason}"</p>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/manager/approvals/view/$id")({
  component: ManagerViewApproval
});
