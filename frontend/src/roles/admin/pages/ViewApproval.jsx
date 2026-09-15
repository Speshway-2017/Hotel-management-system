import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { FormField, Textarea } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { superAdminService } from "@/services/superAdmin";
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
  ArrowRight,
  XCircle,
  CheckCircle
} from "lucide-react";

function AdminViewApproval() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [request, setRequest] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  
  // Decision Form State
  const [decisionReason, setDecisionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const mapApprovalData = (matched) => {
    const aid = matched._id || matched.id;
    return {
      id: aid,
      bookingId: matched.bookingId || ("BK26-" + String(aid).substring(0, 4).toUpperCase()),
      guest: matched.guest || "Stay Folio Request",
      type: matched.category === "Discount" ? "Discounts" : matched.category === "Refund" ? "Refunds" : matched.category === "Upgrade" ? "Complimentary Upgrades" : (matched.category || "Override Request"),
      propertyId: matched.propertyId || "HS-JAI",
      propertyName: matched.propertyName || "Speshway Luxury Hotel",
      amountChange: matched.amount > 0 ? `₹${Number(matched.amount).toLocaleString('en-IN')}` : "Value Override",
      originalValue: matched.originalValue || (matched.amount > 0 ? `₹${Number(matched.amount).toLocaleString('en-IN')}` : "--"),
      newValue: matched.newValue || (matched.category === "Discount" ? "Approved Discount Rate" : matched.category === "Refund" ? `₹${Number(matched.amount).toLocaleString('en-IN')} Refund` : "Approved Override"),
      reason: matched.reason || matched.description || "Operational override request logged",
      requestedBy: matched.requestedBy || "Front Desk Staff",
      requestedDate: matched.createdAt ? new Date(matched.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: matched.status || "Pending",
      decisionLog: matched.status !== "Pending" ? {
        user: matched.decidedBy || "Administrator",
        email: matched.decidedBy || "admin@speshway.com",
        timestamp: matched.decidedAt ? new Date(matched.decidedAt).toLocaleString() : new Date().toLocaleString(),
        action: matched.status,
        reason: matched.decisionReason || "Decision recorded in system."
      } : null
    };
  };

  const loadRequestDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      let appRes;
      try {
        appRes = await managerService.getApprovals();
      } catch (e) {
        appRes = await superAdminService.getApprovals();
      }

      const list = (appRes && appRes.data) ? appRes.data : (Array.isArray(appRes) ? appRes : []);
      const matched = list.find(r => (r._id || r.id) === id || String(r._id) === String(id) || String(r.id) === String(id));
      if (matched) {
        setRequest(mapApprovalData(matched));
      } else {
        setError("Approval request record not found.");
      }
    } catch (err) {
      setError(err.message || "Failed to load approval request details.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (id) loadRequestDetail();
  }, [id]);

  const handleDecisionSubmit = async (action) => {
    if (!request) return;
    setProcessing(true);
    try {
      const reasonText = decisionReason.trim() || `${action} by Admin Console`;
      let res;
      try {
        res = await managerService.updateApproval(request.id, action, reasonText);
      } catch (e) {
        res = await superAdminService.updateApproval(request.id, action, reasonText);
      }
      
      if (res && res.success !== false) {
        toast.success(`Request has been successfully marked as ${action.toLowerCase()}.`);
        setDecisionReason("");
        await loadRequestDetail(true);
      } else {
        toast.error(res?.message || `Failed to update request to ${action}`);
      }
    } catch (err) {
      toast.error("Failed to record approval decision.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui">
      <Crumbs
        items={[
          { label: "Approvals", to: "/admin/approvals" },
          { label: request ? `Approval: ${request.id}` : "Approval Details" }
        ]}
      />

      {error && <Notice tone="error" title="Ledger Fetch Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : request ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
          {/* Main Request info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Request parameters panel */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <FileCheck className="size-5 text-purple" />
                  <h4 className="font-semibold text-navy text-sm">Request Parameters</h4>
                </div>
                <Tag tone={
                  request.status === "Approved" ? "success" :
                  request.status === "Processing" ? "brand" :
                  request.status === "Refunded" ? "success" :
                  request.status === "Rejected" ? "error" : "warning"
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
                  <span className="font-bold block mt-0.5 text-purple">{request.guest}</span>
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
                <div className="p-4 bg-purple/5 border border-purple/20 rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-purple">Requested Value</span>
                  <div className="font-bold text-purple text-sm mt-1.5 font-mono">{request.newValue}</div>
                </div>
              </div>
            </div>

            {/* Target Booking Info */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Calendar className="size-4.5 text-purple" />
                <h4 className="font-semibold text-navy text-sm">Linked Folio Reservation</h4>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-navy-deep">Booking Reference ID: #{request.bookingId}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Guest stayed / reserved: {request.guest}</p>
                </div>
                {request.bookingId && !request.bookingId.startsWith("HS-MOCK") ? (
                  <Link
                    to={`/admin/reservations/view/${request.bookingId}`}
                    className="text-purple font-bold hover:underline flex items-center gap-1.5"
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
              <Panel title="Admin Authorization" description="Review exceptions and record authorization choices.">
                <div className="p-5 space-y-4 bg-white rounded-b-xl">
                  <FormField label="Operational Decision Notes" required id="notes">
                    <Textarea
                      id="notes"
                      placeholder="Input review notes or justification reasons here..."
                      value={decisionReason}
                      onChange={(e) => setDecisionReason(e.target.value)}
                      className="min-h-[100px] text-xs font-medium"
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
            ) : request.status === "Approved" ? (
              <Panel title="Processing & Payout Actions" description="Initiate refund processing or finalize authorization.">
                <div className="p-5 space-y-4 bg-white rounded-b-xl">
                  <div className="pt-2 flex flex-col gap-2">
                    <Button
                      onClick={() => handleDecisionSubmit("Processing")}
                      disabled={processing}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Clock className="size-4" /> Move to Processing
                    </Button>
                    <Button
                      onClick={() => handleDecisionSubmit("Rejected")}
                      disabled={processing}
                      className="w-full bg-destructive hover:bg-destructive/90 text-white font-bold h-9 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="size-4" /> Revoke / Reject
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : request.status === "Processing" ? (
              <Panel title="Settlement Action" description="Mark disbursement and settle refund.">
                <div className="p-5 space-y-4 bg-white rounded-b-xl">
                  <Button
                    onClick={() => handleDecisionSubmit("Refunded")}
                    disabled={processing}
                    className="w-full bg-purple hover:bg-purple/90 text-white font-bold h-9 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="size-4" /> Mark as Refunded (Settled)
                  </Button>
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
                      <Clock className="size-3.5 text-purple" />
                      <span>{request.decisionLog.timestamp}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Decision Result</span>
                    <div className="mt-1">
                      <Tag tone={
                        request.decisionLog.action === "Approved" || request.decisionLog.action === "Refunded" ? "success" :
                        request.decisionLog.action === "Processing" ? "brand" : "error"
                      }>
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

export const Route = createFileRoute("/admin/approvals/view/$id")({
  component: AdminViewApproval
});
