import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { CreditCard, Shield, Settings, List, ChevronLeft } from "lucide-react";

function ViewPlan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    const loadPlanDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getSubscriptionPlans();
        if (res.success) {
          const matched = res.data.find(p => p._id === id || p.id === id);
          if (matched) {
            setPlan(matched);
          } else {
            setError("Plan not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load plan details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadPlanDetail();
  }, [id]);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={plan ? `Subscription Plan: ${plan.name}` : "Plan Details"}
        subtitle="Tier rates configuration, access permissions limits, and feature permissions index."
        actions={
          <Button
            onClick={() => navigate({ to: "/super-admin/subscription" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer flex items-center gap-1.5"
          >
            <ChevronLeft className="size-4" /> Back to Plans
          </Button>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : plan ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {/* Rate Parameters */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <CreditCard className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Pricing Slabs</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Monthly price tier</span>
                <p className="font-bold text-sm mt-0.5 text-purple">₹{plan.monthlyPrice.toLocaleString("en-IN")}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Yearly price tier</span>
                <p className="font-bold text-sm mt-0.5 text-navy">₹{plan.yearlyPrice.toLocaleString("en-IN")}</p>
              </div>
              {plan.description && (
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Description</span>
                  <p className="font-semibold text-muted-foreground mt-0.5">{plan.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Limits */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Settings className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Access Limits</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Property limits</span>
                <p className="font-semibold text-sm mt-0.5">{plan.propertyLimit} {plan.propertyLimit === 1 ? "Property" : "Properties"}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Room capacity limits</span>
                <p className="font-semibold text-sm mt-0.5">{plan.roomLimit} Rooms</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Subscribers Index</span>
                <p className="font-bold mt-0.5 text-purple">{plan.activeSubscribers || 0} hotels enrolled</p>
              </div>
            </div>
          </div>

          {/* Included Features */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <List className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Features coverage</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Bundled Features</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {plan.includedFeatures && plan.includedFeatures.length > 0 ? (
                    plan.includedFeatures.map((feat, idx) => (
                      <Tag key={idx} tone="brand">{feat}</Tag>
                    ))
                  ) : (
                    <span className="text-muted-foreground font-medium">Standard modules only</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Plan Status</span>
                <div className="mt-1">
                  <Tag tone={plan.status === "Active" ? "success" : "neutral"}>{plan.status}</Tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/subscription/view/$id")({
  component: ViewPlan
});
