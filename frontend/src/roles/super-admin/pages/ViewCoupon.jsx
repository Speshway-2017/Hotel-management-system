import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, Settings, List, ChevronLeft } from "lucide-react";

function ViewCoupon() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coupon, setCoupon] = useState(null);

  useEffect(() => {
    const loadCouponDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getPromoCoupons();
        if (res.success) {
          const matched = res.data.find(c => c._id === id || c.id === id);
          if (matched) {
            setCoupon(matched);
          } else {
            setError("Coupon not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load coupon details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadCouponDetail();
  }, [id]);

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title={coupon ? `Promo Coupon: ${coupon.code}` : "Coupon Details"}
        subtitle="Operational parameters, discount slabs, plans coverage, and utilization index."
        actions={
          <Button
            onClick={() => navigate({ to: "/super-admin/coupons" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer flex items-center gap-1.5"
          >
            <ChevronLeft className="size-4" /> Back to Coupons
          </Button>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : coupon ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {/* Coupon Slabs */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Ticket className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Discount Slab</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Coupon Code</span>
                <p className="font-semibold text-sm mt-0.5 font-mono text-purple">{coupon.code}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Discount Value</span>
                <p className="font-bold text-md mt-0.5 text-purple">
                  {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} Off
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Minimum Spend Threshold</span>
                <p className="font-semibold mt-0.5">₹{(coupon.minimumSubscriptionAmount || 0).toLocaleString("en-IN")}</p>
              </div>
            </div>
          </div>

          {/* Validity & Limits */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Calendar className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Validity & Limits</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Valid From</span>
                  <p className="font-semibold mt-0.5">{coupon.validFrom}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Valid Until</span>
                  <p className="font-semibold mt-0.5">{coupon.validUntil}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Usage Limit Cap</span>
                  <p className="font-semibold mt-0.5">{coupon.usageLimit} times</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Used Count Index</span>
                  <p className="font-bold mt-0.5 text-purple">{coupon.usedCount || 0} redeemed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plans Scope */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <List className="size-4 text-purple" />
              <h4 className="font-semibold text-navy text-sm">Subscription Scope</h4>
            </div>
            <div className="space-y-2.5 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Coverage Plans</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {coupon.applicableSubscriptionPlans && coupon.applicableSubscriptionPlans.length > 0 ? (
                    coupon.applicableSubscriptionPlans.map((plan, idx) => (
                      <Tag key={idx} tone="brand">{plan}</Tag>
                    ))
                  ) : (
                    <span className="text-muted-foreground font-medium">All Platform Plans Catalog</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Coupon Status</span>
                <div className="mt-1">
                  <Tag tone={coupon.status === "Active" ? "success" : "neutral"}>{coupon.status}</Tag>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/coupons/view/$id")({
  component: ViewCoupon
});
