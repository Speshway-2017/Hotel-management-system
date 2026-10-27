import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Notice, LoadingRows, Tag } from "@/components/hs/kit";
import { adminService } from "@/services/admin";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, ShieldCheck, Calendar, Sparkles, Building2, Layers, Clock, AlertOctagon, AlertTriangle, RefreshCw } from "lucide-react";

import { subscribeRealtimeSync } from "@/services/socket";

function AdminSubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requestingPlan, setRequestingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [property, setProperty] = useState(null);
  const [requests, setRequests] = useState([]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [plansRes, currentRes, myRequestsRes] = await Promise.all([
        superAdminService.getSubscriptionPlans().catch(() => ({ data: [] })),
        adminService.getProperty().catch(() => ({})),
        adminService.getSubscriptionRequests().catch(() => ({ data: [] }))
      ]);

      const plansList = plansRes.data || plansRes.plans || (Array.isArray(plansRes) ? plansRes : []);
      setPlans(plansList.filter(p => p.status === "Active" || p.isActive !== false));

      const propData = currentRes.property || currentRes.data || currentRes;
      setProperty(propData);

      const reqList = myRequestsRes.data || (Array.isArray(myRequestsRes) ? myRequestsRes : []);
      setRequests(reqList);
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load subscription tiers.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getMappedTierName = (tier, planName) => {
    if (planName) return planName;
    if (!tier || tier === "None") return "Free Tier";
    if (tier === "Basic") return "Starter Tier";
    if (tier === "Premium") return "Professional Suite";
    if (tier === "Enterprise") return "Enterprise Pro";
    const matched = plans.find(p => p._id === tier || p.name?.toLowerCase() === tier?.toLowerCase());
    return matched ? matched.name : tier;
  };

  const handleRequestPlan = async (plan) => {
    const planName = typeof plan === 'object' ? plan.name : plan;
    const planPrice = typeof plan === 'object' ? (plan.monthlyPrice || plan.price || 0) : 0;

    if (!property?._id && !property?.id) {
      toast.error("Property context missing.");
      return;
    }
    setRequestingPlan(planName);
    try {
      await adminService.createSubscriptionRequest(
        planName,
        planPrice
      );
      toast.success(`Request submitted for ${planName}! Super Admin will review.`);
      await loadData(true);
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

  const currentPlanName = getMappedTierName(property?.subscriptionTier, property?.subscriptionPlanName);
  const pendingRequest = requests.find(r => r.status === "Pending");
  const lastRequest = requests[0]; // sorted descending by createdAt in backend

  const getExpiryInfo = () => {
    if (!property?.subscriptionExpiry) return null;
    const expiryDate = new Date(property.subscriptionExpiry);
    if (isNaN(expiryDate.getTime())) return null;

    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    const isExpiringSoon = daysRemaining <= 15;

    return {
      expiryDate,
      formattedDate: expiryDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }),
      daysRemaining,
      isExpired,
      isExpiringSoon
    };
  };

  const expiryInfo = getExpiryInfo();

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in select-none">
      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {/* Neat & Clean Subscription Expiration Card (Triggered when plan expires within 15 days or has expired) */}
      {expiryInfo && expiryInfo.isExpiringSoon && (
        <div
          className={`bg-white rounded-2xl border border-muted shadow-soft p-5 sm:p-6 transition-all duration-200 relative overflow-hidden ${
            expiryInfo.isExpired ? "border-l-4 border-l-rose-500" : "border-l-4 border-l-amber-500"
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            {/* Left: Icon & Details */}
            <div className="flex items-start gap-4 min-w-0">
              <div
                className={`size-11 rounded-xl grid place-items-center shrink-0 border ${
                  expiryInfo.isExpired
                    ? "bg-rose-50/80 border-rose-200/80 text-rose-600"
                    : "bg-amber-50/80 border-amber-200/80 text-amber-600"
                }`}
              >
                {expiryInfo.isExpired ? (
                  <AlertTriangle className="size-5" />
                ) : (
                  <Clock className="size-5" />
                )}
              </div>

              <div className="space-y-1.5 min-w-0">
                {/* Meta Ribbon */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      expiryInfo.isExpired
                        ? "bg-rose-100 text-rose-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {expiryInfo.isExpired
                      ? "Plan Expired"
                      : `Expiring in ${expiryInfo.daysRemaining} ${expiryInfo.daysRemaining === 1 ? "day" : "days"}`}
                  </span>
                  <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Plan: <strong className="text-navy font-bold">{currentPlanName}</strong>
                  </span>
                  <span className="text-muted-foreground/40 hidden sm:inline">•</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    Renewal Date: <strong className="text-navy font-bold">{expiryInfo.formattedDate}</strong>
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-navy-deep tracking-tight">
                  {expiryInfo.isExpired
                    ? "Your property subscription plan has expired"
                    : `Your subscription plan will expire in ${expiryInfo.daysRemaining} days`}
                </h3>

                {/* Subtitle */}
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  {expiryInfo.isExpired
                    ? `Your subscription expired on ${expiryInfo.formattedDate}. Please renew or upgrade your plan to maintain uninterrupted reservations, rates sync, and front-desk operations.`
                    : `Your ${currentPlanName} plan expires on ${expiryInfo.formattedDate}. Renew your plan before the expiration date to prevent any disruption to hotel bookings and channel integrations.`}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
              <Button
                disabled={requestingPlan !== null || pendingRequest !== undefined}
                onClick={() => {
                  const activePlanObj = plans.find(
                    (p) =>
                      p.name === currentPlanName ||
                      p.name?.toLowerCase() === property?.subscriptionTier?.toLowerCase() ||
                      p.name?.toLowerCase() === property?.subscriptionPlanName?.toLowerCase()
                  ) || { name: currentPlanName, monthlyPrice: 0 };
                  handleRequestPlan(activePlanObj);
                }}
                className={`h-9 px-4 rounded-xl font-bold text-xs shadow-soft flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  expiryInfo.isExpired
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "bg-navy hover:bg-navy-deep text-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <RefreshCw className={`size-3.5 ${requestingPlan ? "animate-spin" : ""}`} />
                {requestingPlan
                  ? "Submitting..."
                  : expiryInfo.isExpired
                  ? "Renew Plan Now"
                  : "Renew Current Plan"}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  document.getElementById("plans-grid")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="h-9 px-3.5 rounded-xl font-semibold text-xs bg-white text-navy border-muted hover:bg-muted/50 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="size-3.5 text-purple" />
                Change Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Normal Active Plan Notice (Shown when expiry is > 15 days) */}
      {property && (property.subscriptionTier !== "None" || property.subscriptionPlanName) && property.subscriptionStatus === 'Active' && !expiryInfo?.isExpiringSoon && (
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
      <div id="plans-grid" className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Available Subscription Plans</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isActivePlan = (
              p.name === currentPlanName ||
              p.name?.toLowerCase() === property?.subscriptionTier?.toLowerCase() ||
              p.name?.toLowerCase() === property?.subscriptionPlanName?.toLowerCase()
            ) && property?.subscriptionStatus === 'Active';
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
                      onClick={() => handleRequestPlan(p)}
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
