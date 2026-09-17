import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { adminService } from "@/services/admin";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Calendar, Sparkles, Building2, Layers, Clock, AlertOctagon } from "lucide-react";

function AdminSubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requestingPlan, setRequestingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [property, setProperty] = useState(null);
  const [requests, setRequests] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, currentRes, myRequestsRes] = await Promise.all([
        superAdminService.getPlans().catch(() => ({ plans: [] })),
        adminService.getCurrentProperty().catch(() => ({})),
        adminService.getSubscriptionRequests().catch(() => ({ data: [] }))
      ]);

      const plansList = plansRes.plans || (Array.isArray(plansRes) ? plansRes : []);
      setPlans(plansList.filter(p => p.isActive !== false));

      const propData = currentRes.property || currentRes.data || currentRes;
      setProperty(propData);

      const reqList = myRequestsRes.data || (Array.isArray(myRequestsRes) ? myRequestsRes : []);
      setRequests(reqList);
    } catch (err) {
      setError(err.message || "Failed to load subscription tiers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getMappedTierName = (tier) => {
    if (!tier || tier === "None") return "Free Tier";
    const matched = plans.find(p => p._id === tier || p.name?.toLowerCase() === tier?.toLowerCase());
    return matched ? matched.name : tier;
  };

  const handleRequestPlan = async (plan) => {
    if (!property?._id && !property?.id) {
      toast.error("Property context missing.");
      return;
    }
    setRequestingPlan(plan._id || plan.name);
    try {
      await adminService.requestSubscription({
        propertyId: property._id || property.id,
        planName: plan.name,
        requestedTier: plan.name,
        notes: `Property requested upgrade/switch to ${plan.name} tier.`
      });
      toast.success(`Request submitted for ${plan.name}! Super Admin will review.`);
      loadData();
    } catch (err) {
      toast.error(err.message || "Failed to submit subscription request.");
    } finally {
      setRequestingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left font-sans animate-fade-in">
        <LoadingRows rows={4} />
      </div>
    );
  }

  const currentPlanName = getMappedTierName(property?.subscriptionTier);
  const pendingRequest = requests.find(r => r.status === "Pending");
  const lastRequest = requests[0]; // sorted descending by createdAt in backend

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in select-none">
      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {/* Expiry Details Notice */}
      {property && property.subscriptionTier !== "None" && (
        <Notice tone="success" title="Subscription Activated">
          Your property has an active **{currentPlanName}** subscription plan.
          {property.subscriptionExpiry && (
            <span> Renewal cycle expires on **{new Date(property.subscriptionExpiry).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}** (Automatic billing active).</span>
          )}
        </Notice>
      )}

      {/* Pending Request Notice */}
      {pendingRequest && (
        <Notice tone="warning" title="Request Pending Review">
          <div className="flex items-center gap-2 font-semibold">
            <Clock className="size-4 animate-pulse text-amber-500" />
            <span>A request to switch your subscription to **{pendingRequest.planName}** (₹{pendingRequest.price.toLocaleString("en-IN")}/mo) has been submitted to the Super Admin. The status is currently **Pending Approval**.</span>
          </div>
        </Notice>
      )}

      {/* Rejected Request Notice */}
      {lastRequest && lastRequest.status === "Rejected" && !pendingRequest && (
        <Notice tone="error" title="Subscription Request Rejected">
          <div className="flex items-start gap-2 font-semibold">
            <AlertOctagon className="size-4 text-red-500 mt-0.5" />
            <div>
              <p>Your subscription request for **{lastRequest.planName}** was rejected by the Super Admin.</p>
              <p className="mt-1 text-[11px] font-bold text-red-700">Rejection Reason: {lastRequest.rejectionReason || "No details provided"}</p>
            </div>
          </div>
        </Notice>
      )}

      {/* Pricing Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Available Subscription Plans</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isActivePlan = p.name === currentPlanName && property?.subscriptionStatus === 'Active';
            const isRequestedPending = pendingRequest && pendingRequest.planName === p.name;
            const isRejectedPlan = lastRequest && lastRequest.status === "Rejected" && lastRequest.planName === p.name && !pendingRequest;
            
            return (
              <div
                key={p._id || p.id}
                className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col p-6 relative ${
                  isActivePlan
                    ? "border-emerald-500 shadow-lift ring-2 ring-emerald-500/20 scale-[1.02]"
                    : isRequestedPending
                    ? "border-amber-500 shadow-lift ring-2 ring-amber-500/20"
                    : isRejectedPlan
                    ? "border-red-500 shadow-lift ring-2 ring-red-500/20"
                    : "border-muted shadow-soft hover:shadow-lift hover:-translate-y-1"
                }`}
              >
                {isActivePlan && (
                  <span className="absolute -top-3 right-6 bg-emerald-500 text-white border-2 border-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <ShieldCheck size={11} /> Current Active
                  </span>
                )}

                {isRequestedPending && (
                  <span className="absolute -top-3 right-6 bg-amber-500 text-white border-2 border-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Clock size={11} /> Requested Pending
                  </span>
                )}

                {isRejectedPlan && (
                  <span className="absolute -top-3 right-6 bg-red-500 text-white border-2 border-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 animate-fade-in">
                    <AlertOctagon size={11} /> Request Rejected
                  </span>
                )}

                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-navy-deep">{p.name}</h4>
                  <p className="text-[11px] text-muted-foreground font-semibold leading-relaxed min-h-[36px]">
                    {p.description}
                  </p>
                </div>

                <div className="my-6 space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-navy">₹{p.monthlyPrice.toLocaleString("en-IN")}</span>
                    <span className="text-[10px] font-bold text-muted-foreground">/ month</span>
                  </div>
                  <div className="text-[10px] font-semibold text-purple">
                    Or ₹{p.yearlyPrice.toLocaleString("en-IN")} billed annually
                  </div>
                </div>

                {/* Plan Limits */}
                <div className="border-t border-muted/50 py-4 space-y-2 text-xs font-semibold text-navy">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Property Slots</span>
                    <span>{p.propertyLimit} {p.propertyLimit === 1 ? "Property" : "Properties"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Rooms Limit</span>
                    <span>{p.roomLimit} Rooms Max</span>
                  </div>
                </div>

                {/* Included Features */}
                <div className="border-t border-muted/50 pt-4 flex-1 space-y-3">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Included Features:</h5>
                  <ul className="space-y-2.5">
                    {p.includedFeatures.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-navy font-semibold">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action upgrade/downgrade button */}
                <div className="mt-6 pt-4 border-t border-muted/30">
                  {isActivePlan ? (
                    <Button
                      disabled
                      className="w-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed select-none animate-fade-in"
                    >
                      Active Plan
                    </Button>
                  ) : isRequestedPending ? (
                    <Button
                      disabled
                      className="w-full bg-amber-50 text-amber-700 font-bold border border-amber-200 h-9 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
                    >
                      Request Pending
                    </Button>
                  ) : (
                    <Button
                      disabled={requestingPlan !== null || pendingRequest !== undefined}
                      onClick={() => handleRequestPlan(p.name, p.monthlyPrice)}
                      className={`w-full font-bold h-9 rounded-xl shadow-soft cursor-pointer flex items-center justify-center transition-all ${
                        p.name === "Enterprise Pro"
                          ? "bg-purple text-white hover:bg-purple-deep"
                          : "bg-navy text-white hover:bg-navy-deep"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {requestingPlan === p.name ? "Requesting..." : "Request Plan"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/subscription")({
  component: AdminSubscriptionPage
});
