import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { publicService } from "@/services/public";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight 
} from "lucide-react";

const DEFAULT_PLANS = [
  {
    _id: "starter",
    name: "Starter Tier",
    description: "Essential suite for boutique properties and standalone guesthouses.",
    monthlyPrice: 3999,
    yearlyPrice: 39990,
    propertyLimit: 1,
    roomLimit: 25,
    includedFeatures: [
      "Front Desk Console", 
      "Direct Booking Engine", 
      "GST Split Invoicing", 
      "Mobile Housekeeping"
    ],
    status: "Active"
  },
  {
    _id: "pro",
    name: "Professional Suite",
    description: "Full-featured management platform for expanding city hotels and resorts.",
    monthlyPrice: 7999,
    yearlyPrice: 79990,
    propertyLimit: 3,
    roomLimit: 75,
    includedFeatures: [
      "Real-time 2-Way Channel Sync", 
      "Advanced Guest CRM", 
      "Dynamic Rate Calendar", 
      "Shift Roster & Biometrics", 
      "POS Restaurant Billing"
    ],
    status: "Active"
  },
  {
    _id: "enterprise",
    name: "Enterprise Pro",
    description: "Unlimited portfolio management for multi-branch chains and heritage groups.",
    monthlyPrice: 14999,
    yearlyPrice: 149990,
    propertyLimit: 10,
    roomLimit: 300,
    includedFeatures: [
      "Multi-Property Central Ledger", 
      "Custom API & Webhooks", 
      "Dedicated SLA Account Manager", 
      "Custom WhatsApp Invoicing", 
      "Auditor & CA Export Portal"
    ],
    status: "Active"
  }
];

export function PricingPlansSection() {
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");

  const loadPlans = async (isSilent = false) => {
    if (!isSilent) setPlansLoading(true);
    setPlansError("");
    try {
      const res = await publicService.getSubscriptionPlans();
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        setPlans(res.data);
      } else {
        setPlans(DEFAULT_PLANS);
      }
    } catch (err) {
      if (!isSilent) {
        // Fallback to default plans silently so the UI remains pristine
        setPlans(DEFAULT_PLANS);
      }
    } finally {
      if (!isSilent) setPlansLoading(false);
    }
  };

  useEffect(() => {
    loadPlans(false);

    const handleFocus = () => loadPlans(true);
    window.addEventListener("focus", handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadPlans(true);
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <section id="pricing" className="bg-white py-24 border-b border-navy/5 scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center font-ui">
        <span className="text-xs font-bold uppercase tracking-widest text-purple">Transparent Pricing</span>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
          Choose the right plan for your property
        </h2>
        <p className="mt-4 mx-auto max-w-2xl text-base text-gray-600 leading-relaxed font-ui">
          All plans include GST compliance, unlimited staff accounts, and dedicated onboarding support.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-8 inline-flex items-center gap-2 p-1.5 rounded-full bg-cream/70 border border-navy/10 shadow-inner">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              billingCycle === "monthly" 
                ? "bg-navy text-cream shadow-sm" 
                : "text-navy/70 hover:text-navy"
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              billingCycle === "yearly" 
                ? "bg-navy text-cream shadow-sm" 
                : "text-navy/70 hover:text-navy"
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-gold text-navy text-[10px] font-black px-2 py-0.5 rounded-full">Save ~17%</span>
          </button>
        </div>

        {/* Plans Grid */}
        <div className="mt-14">
          {plansLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
              <RefreshCw className="size-6 animate-spin text-purple" />
              <p className="text-xs">Loading live subscription plans...</p>
            </div>
          ) : plansError ? (
            <div className="p-6 max-w-md mx-auto rounded-xl bg-error/10 border border-error/20 text-error text-xs flex items-center gap-3">
              <AlertCircle className="size-5 shrink-0" />
              <span>{plansError}</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No active subscription plans found at this time.
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3 text-left">
              {plans.map((plan, idx) => {
                const isPopular = idx === 1 || plan.name.toLowerCase().includes("professional") || plan.name.toLowerCase().includes("pro suite");
                const price = billingCycle === "monthly" ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12);
                const period = billingCycle === "monthly" ? "/month" : "/mo (billed annually)";

                return (
                  <div 
                    key={plan._id || plan.id || idx}
                    className={`relative rounded-2xl p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 ${
                      isPopular 
                        ? "bg-navy text-cream shadow-2xl border-2 border-gold/60 ring-4 ring-gold/10" 
                        : "bg-white text-navy border border-navy/10 shadow-soft"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold to-[#e5a840] text-navy text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <div className="flex justify-between items-baseline mb-2">
                        <h3 className={`font-display text-xl font-bold ${isPopular ? "text-cream" : "text-navy"}`}>
                          {plan.name}
                        </h3>
                      </div>
                      <p className={`text-xs min-h-[32px] leading-relaxed mb-6 font-ui ${isPopular ? "text-gray-300" : "text-gray-600"}`}>
                        {plan.description || "Complete operations suite for Indian hotels."}
                      </p>

                      {/* Price */}
                      <div className="mb-6 pb-6 border-b border-white/10">
                        <div className="flex items-baseline gap-1 font-price">
                          <span className="text-sm font-semibold">₹</span>
                          <span className={`text-3xl font-bold tracking-tight ${isPopular ? "text-[#F5C06A]" : "text-navy"}`}>
                            {price?.toLocaleString("en-IN")}
                          </span>
                          <span className={`text-xs font-ui ${isPopular ? "text-gray-400" : "text-gray-500"}`}>
                            {period}
                          </span>
                        </div>
                        {billingCycle === "yearly" && (
                          <p className={`text-[11px] mt-1 font-medium font-price ${isPopular ? "text-gold/90" : "text-purple"}`}>
                            ₹{plan.yearlyPrice?.toLocaleString("en-IN")} billed annually
                          </p>
                        )}
                      </div>

                      {/* Capacity Limits */}
                      <div className={`mb-6 p-3 rounded-lg text-xs space-y-1.5 font-medium ${
                        isPopular ? "bg-white/5 border border-white/10" : "bg-cream/40 border border-navy/5"
                      }`}>
                        <div className="flex justify-between">
                          <span className={isPopular ? "text-gray-300" : "text-gray-600"}>Property Capacity:</span>
                          <span className="font-bold">{plan.propertyLimit} {plan.propertyLimit === 1 ? "Property" : "Properties"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={isPopular ? "text-gray-300" : "text-gray-600"}>Room Keys Limit:</span>
                          <span className="font-bold">Up to {plan.roomLimit} Rooms</span>
                        </div>
                      </div>

                      {/* Features List */}
                      <div className="space-y-3 mb-8">
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${isPopular ? "text-cream/80" : "text-navy/80"}`}>
                          Included Modules:
                        </p>
                        <ul className="space-y-2.5 text-xs">
                          {(plan.includedFeatures || []).map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2.5">
                              <CheckCircle2 className={`size-4 shrink-0 mt-0.5 ${isPopular ? "text-gold" : "text-purple"}`} />
                              <span className={isPopular ? "text-cream/90" : "text-navy/90"}>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      asChild
                      size="lg"
                      className={`w-full rounded-full py-6 font-bold text-xs uppercase tracking-wider transition-all duration-300 ${
                        isPopular
                          ? "bg-gold text-navy hover:bg-[#e5a840] shadow-lg hover:scale-[1.02]"
                          : "bg-navy text-cream hover:bg-[#081420] shadow-soft hover:scale-[1.02]"
                      }`}
                    >
                      <Link to="/contact">
                        <span>Get Started with {plan.name}</span>
                        <ArrowRight className="size-3.5 ml-2" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

