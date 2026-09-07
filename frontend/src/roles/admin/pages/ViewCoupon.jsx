import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import { toast } from "sonner";
import {
  Ticket,
  Percent,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Tag as TagIcon,
  Flame,
  ShieldCheck,
  Building2,
  Clock,
  Edit2,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/admin/coupons/view/$id")({
  head: () => ({
    meta: [
      { title: "Coupon Details — Admin Console" },
      { name: "description", content: "View configuration, discount rules, validity, and usage analytics for this coupon." }
    ]
  }),
  component: ViewCouponPage
});

export function ViewCouponPage() {
  const navigate = useNavigate();
  const { id } = useParams({ strict: false });
  const [coupon, setCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toggling, setToggling] = useState(false);

  const loadCoupon = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await adminService.getCoupon(id);
      const data = res?.data || res;
      if (data) {
        setCoupon(data);
      } else {
        setError("Coupon not found.");
      }
    } catch (err) {
      setError(err.message || "Failed to load coupon details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupon();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!coupon) return;
    const couponId = coupon._id || coupon.id;
    try {
      setToggling(true);
      const res = await adminService.toggleCouponStatus(couponId);
      if (res.success || res.data) {
        toast.success(`Coupon ${coupon.code} status updated!`);
        loadCoupon();
      }
    } catch (err) {
      toast.error(err.message || "Failed to toggle status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 text-left pb-16">
        <PageHeader
          title="Coupon Details"
          subtitle="Loading coupon parameters and metrics..."
        />
        <div className="p-6 bg-white rounded-2xl border border-muted shadow-soft">
          <LoadingRows count={4} />
        </div>
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="space-y-6 text-left pb-16">
        <Crumbs
          items={[
            { label: "Coupons", to: "/admin/coupons" },
            { label: "Coupon Details" }
          ]}
        />
        <PageHeader
          title="Coupon Details"
          subtitle="View promotional campaign parameters"
        />
        <div className="p-8 bg-white rounded-2xl border border-rose-200 text-center shadow-soft">
          <AlertCircle className="size-10 text-rose-500 mx-auto mb-3" />
          <h3 className="font-display text-lg font-bold text-navy">Unable to Load Coupon</h3>
          <p className="text-xs text-rose-600 mt-1">{error || "Coupon record not found."}</p>
        </div>
      </div>
    );
  }

  const couponId = coupon._id || coupon.id;
  const isExpired = new Date() > new Date(coupon.validUntil);
  const isExhausted = coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit;
  const discountDisplay = coupon.discountType === 'percentage'
    ? `${coupon.discountValue}% OFF ${coupon.maxDiscount > 0 ? `(Max ₹${coupon.maxDiscount.toLocaleString('en-IN')})` : ''}`
    : `Flat ₹${Number(coupon.discountValue || 0).toLocaleString('en-IN')} OFF`;
  const usagePercent = coupon.usageLimit > 0 ? Math.min(100, Math.round(((coupon.usedCount || 0) / coupon.usageLimit) * 100)) : 0;

  return (
    <div className="space-y-6 text-left pb-16">
      <Crumbs
        items={[
          { label: "Coupons", to: "/admin/coupons" },
          { label: coupon ? coupon.code : "Coupon Details" }
        ]}
      />

      {/* 1. Page Header with Edit Action */}
      <PageHeader
        title={`Coupon: ${coupon.code}`}
        subtitle="Full operational parameters, discount rules, and usage ledger."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => navigate({ to: `/admin/coupons/edit/${couponId}` })}
              className="bg-navy hover:bg-navy/90 text-white rounded-full font-bold shadow-soft hover:shadow-lift transition-all px-5 h-10 gap-2 cursor-pointer"
            >
              <Edit2 className="size-4" /> Edit Coupon
            </Button>
          </div>
        }
      />

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Discount Slab */}
        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount Value</p>
              <h3 className="mt-1 font-display text-xl font-black text-purple">{discountDisplay}</h3>
            </div>
            <div className="p-2 rounded-lg bg-purple/10 text-purple">
              {coupon.discountType === 'percentage' ? <Percent className="size-4" /> : <DollarSign className="size-4" />}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground font-medium capitalize">
            {coupon.discountType} discount model
          </p>
        </div>

        {/* Min Booking Spend */}
        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min. Spend</p>
              <h3 className="mt-1 font-display text-xl font-black text-navy">
                {coupon.minBookingAmount > 0 ? `₹${Number(coupon.minBookingAmount).toLocaleString('en-IN')}` : "No Minimum"}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-navy/5 text-navy">
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground font-medium">
            Required cart total threshold
          </p>
        </div>

        {/* Usage Analytics */}
        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Usage / Limit</p>
              <h3 className="mt-1 font-display text-xl font-black text-navy">
                {coupon.usedCount || 0} <span className="text-xs font-normal text-muted-foreground">/ {coupon.usageLimit > 0 ? `${coupon.usageLimit} max` : 'Unlimited'}</span>
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            {coupon.usageLimit > 0 ? (
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-purple" style={{ width: `${usagePercent}%` }} />
              </div>
            ) : (
              <span className="text-[11px] text-muted-foreground font-medium">Unlimited redemptions</span>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Campaign Status</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Tag tone={coupon.status === "Active" ? "success" : "neutral"}>
                  {coupon.status}
                </Tag>
                {isExpired && <span className="text-[10px] font-bold text-rose-600">Expired</span>}
                {isExhausted && <span className="text-[10px] font-bold text-amber-600">Limit Reached</span>}
              </div>
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              className="p-1 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
              title="Click to toggle status"
            >
              {coupon.status === "Active" ? (
                <ToggleRight className="size-6 text-emerald-600" />
              ) : (
                <ToggleLeft className="size-6 text-muted-foreground" />
              )}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground font-medium">
            {coupon.status === "Active" ? "Visible to website guests" : "Disabled on booking engine"}
          </p>
        </div>
      </div>

      {/* 3. Detailed Parameter Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
        {/* Left 2 Cols: Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Coupon Configuration & Slabs" description="Core discount rules and campaign overview.">
            <div className="p-6 bg-white rounded-b-xl space-y-5 text-xs text-navy">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-muted">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Coupon Code</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono font-bold text-base bg-purple/10 text-purple border border-purple/20 px-3 py-1 rounded-lg tracking-wider">
                      {coupon.code}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Campaign Title</span>
                  <p className="mt-1 font-bold text-sm text-navy">{coupon.title || coupon.code}</p>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                <p className="mt-1 text-xs text-muted-foreground font-medium leading-relaxed">
                  {coupon.description || "No public description provided for this coupon."}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-muted">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Discount Slabs</span>
                  <p className="mt-1 font-bold text-navy">{discountDisplay}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Maximum Discount Cap</span>
                  <p className="mt-1 font-bold text-navy">
                    {coupon.maxDiscount > 0 ? `₹${Number(coupon.maxDiscount).toLocaleString('en-IN')}` : "No maximum limit"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Minimum Booking Value</span>
                  <p className="mt-1 font-bold text-navy">
                    {coupon.minBookingAmount > 0 ? `₹${Number(coupon.minBookingAmount).toLocaleString('en-IN')}` : "None"}
                  </p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Validity Timeline */}
          <Panel title="Campaign Timeline & Validity" description="Calendar schedule for promo code availability.">
            <div className="p-6 bg-white rounded-b-xl space-y-4 text-xs text-navy">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-muted bg-[#fcfcfc]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-purple" /> Valid From
                  </span>
                  <p className="mt-1.5 font-bold text-sm text-navy">{coupon.validFrom || "Immediate"}</p>
                </div>
                <div className="p-4 rounded-xl border border-muted bg-[#fcfcfc]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-purple" /> Valid Until
                  </span>
                  <p className="mt-1.5 font-bold text-sm text-navy">{coupon.validUntil || "Never expires"}</p>
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Right 1 Col: Operational Scope */}
        <div className="space-y-6">
          <Panel title="Scope & Deployment" description="Channel and property availability.">
            <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs text-navy">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Applicable Property</span>
                <p className="mt-1 font-semibold text-navy flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-navy/60" />
                  {coupon.propertyId === 'all' || !coupon.propertyId ? "All Managed Properties" : coupon.propertyId}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Booking Channel</span>
                <p className="mt-1 font-semibold text-navy flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-purple" />
                  Direct Website Booking Engine
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Creation Date</span>
                <p className="mt-1 font-medium text-muted-foreground">
                  {coupon.createdAt ? new Date(coupon.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Recently"}
                </p>
              </div>

              <div className="pt-4 border-t border-muted">
                <Button
                  onClick={() => navigate({ to: `/admin/coupons/edit/${couponId}` })}
                  className="w-full bg-navy hover:bg-navy/90 text-white rounded-xl font-bold text-xs h-10 gap-2 cursor-pointer"
                >
                  <Edit2 className="size-3.5" /> Modify Parameters
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default ViewCouponPage;
