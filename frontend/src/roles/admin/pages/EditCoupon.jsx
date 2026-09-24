import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useParams } from "react-router-dom";
import { Panel } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, FormField } from "@/components/hs/FormFields";
import { adminService } from "@/services/admin";
import { superAdminService } from "@/services/superAdmin";
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
  Building2,
  Clock,
  Loader2
} from "lucide-react";
import { validateWithZod, couponSchema } from "@/schemas";

function EditCoupon() {
  const navigate = useNavigate();
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    maxDiscount: 1000,
    minBookingAmount: 2000,
    validFrom: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
    usageLimit: 100,
    status: "Active",
    propertyId: "all"
  });

  useEffect(() => {
    async function loadCoupon() {
      if (!id) return;
      try {
        setLoading(true);
        let data = null;
        try {
          const res = await adminService.getCouponById(id);
          data = res?.data || res;
        } catch {}

        if (!data) {
          try {
            const superRes = await superAdminService.getPromoCoupons();
            const list = superRes?.data || superRes || [];
            data = list.find(c => String(c._id) === String(id) || String(c.id) === String(id) || String(c.code).toUpperCase() === String(id).toUpperCase());
          } catch {}
        }
        if (data) {
          setFormData({
            code: data.code || "",
            title: data.title || "",
            description: data.description || "",
            discountType: data.discountType || "percentage",
            discountValue: data.discountValue ?? 10,
            maxDiscount: data.maxDiscount ?? 1000,
            minBookingAmount: data.minBookingAmount ?? 2000,
            validFrom: data.validFrom ? String(data.validFrom).split("T")[0] : new Date().toISOString().split("T")[0],
            validUntil: data.validUntil ? String(data.validUntil).split("T")[0] : new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0],
            usageLimit: data.usageLimit ?? 100,
            status: data.status || "Active",
            propertyId: data.propertyId || "all"
          });
        }
      } catch (err) {
        toast.error("Failed to load coupon details.");
      } finally {
        setLoading(false);
      }
    }
    loadCoupon();
  }, [id]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === "code" ? String(value).toUpperCase().replace(/[^A-Z0-9_-]/g, "") : value
    }));
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const val = validateWithZod(couponSchema, {
      code: formData.code,
      title: formData.title,
      description: formData.description,
      discountType: formData.discountType,
      discountValue: formData.discountValue,
      maxDiscount: formData.maxDiscount,
      minBookingAmount: formData.minBookingAmount,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      usageLimit: formData.usageLimit,
      status: formData.status,
      propertyId: formData.propertyId
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    setSaving(true);
    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        title: formData.title.trim() || formData.code.trim().toUpperCase(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.discountType === "percentage" ? Number(formData.maxDiscount || 0) : Number(formData.discountValue),
        minBookingAmount: Number(formData.minBookingAmount || 0),
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        usageLimit: Number(formData.usageLimit || 0),
        status: formData.status,
        propertyId: formData.propertyId,
        applicableSource: "website"
      };

      const res = await adminService.updateCoupon(id, payload);
      if (res && res.success !== false) {
        toast.success(`Coupon '${payload.code}' updated successfully!`);
        navigate({ to: "/admin/coupons" });
      } else {
        toast.error(res?.message || "Failed to update coupon.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to update coupon.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-purple" />
        <p className="text-sm font-semibold">Loading coupon details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-4xl pb-16">
      <Panel
        title="Edit Coupon Configuration"
        description="Update parameters and save changes to apply immediately across website bookings."
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white rounded-b-xl border-t border-muted">
          {/* Basic Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TagIcon className="size-3.5 text-purple" /> Basic Identity
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Coupon Code" required id="code" helper="Unique promotional code" status={fieldErrors.code ? "error" : undefined} errorMsg={fieldErrors.code}>
                <div className="relative">
                  <Input
                    id="code"
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value)}
                    placeholder="e.g. WELCOME10"
                    className="font-mono font-bold tracking-wider uppercase text-navy"
                  />
                  <Sparkles className="size-4 text-purple absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                </div>
              </FormField>

              <FormField label="Campaign Title" required id="title" helper="Display title visible to guests" status={fieldErrors.title ? "error" : undefined} errorMsg={fieldErrors.title}>
                <Input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="e.g. Special Holiday Getaway Offer"
                />
              </FormField>
            </div>

            <FormField label="Description / Offer Terms" id="description" helper="Brief explanation of terms or inclusions">
              <Textarea
                id="description"
                rows={2}
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="e.g. Apply this coupon during direct website checkout to receive instant discount."
              />
            </FormField>
          </div>

          <div className="border-t border-muted/80 pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-emerald-600" /> Discount Calculations
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Discount Type" id="discountType">
                <Select
                  id="discountType"
                  value={formData.discountType}
                  onChange={(e) => handleChange("discountType", e.target.value)}
                >
                  <option value="percentage">Percentage (%) Off</option>
                  <option value="fixed">Fixed Amount (₹) Off</option>
                </Select>
              </FormField>

              <FormField
                label={formData.discountType === "percentage" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                required
                id="discountValue"
                status={fieldErrors.discountValue ? "error" : undefined}
                errorMsg={fieldErrors.discountValue}
              >
                <div className="relative">
                  <Input
                    id="discountValue"
                    type="number"
                    step="0.01"
                    min="1"
                    max={formData.discountType === "percentage" ? "100" : "100000"}
                    required
                    value={formData.discountValue}
                    onChange={(e) => handleChange("discountValue", e.target.value)}
                    placeholder="10"
                    className="font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">
                    {formData.discountType === "percentage" ? "%" : "₹"}
                  </span>
                </div>
              </FormField>

              {formData.discountType === "percentage" ? (
                <FormField label="Maximum Discount Cap (₹)" id="maxDiscount" helper="0 = No upper limit">
                  <div className="relative">
                    <Input
                      id="maxDiscount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.maxDiscount}
                      onChange={(e) => handleChange("maxDiscount", e.target.value)}
                      placeholder="1000"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">₹</span>
                  </div>
                </FormField>
              ) : (
                <FormField label="Applicable Source" id="applicableSource" helper="Fixed to website">
                  <Input
                    id="applicableSource"
                    type="text"
                    disabled
                    value="Direct Website Only"
                    className="bg-muted/40 text-muted-foreground font-semibold"
                  />
                </FormField>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Minimum Booking Amount (₹)" id="minBookingAmount" helper="Threshold required before discount applies">
                <div className="relative">
                  <Input
                    id="minBookingAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minBookingAmount}
                    onChange={(e) => handleChange("minBookingAmount", e.target.value)}
                    placeholder="2000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">₹</span>
                </div>
              </FormField>

              <FormField label="Total Usage Limit" id="usageLimit" helper="0 = Unlimited redemptions across all guests">
                <Input
                  id="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={(e) => handleChange("usageLimit", e.target.value)}
                  placeholder="100"
                />
              </FormField>
            </div>
          </div>

          {/* Validity and Scope */}
          <div className="border-t border-muted/80 pt-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Calendar className="size-3.5 text-blue-600" /> Validity & Scope
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Valid From" required id="validFrom">
                <Input
                  id="validFrom"
                  type="date"
                  required
                  value={formData.validFrom}
                  onChange={(e) => handleChange("validFrom", e.target.value)}
                />
              </FormField>

              <FormField label="Valid Until (Expiry)" required id="validUntil" status={fieldErrors.validUntil ? "error" : undefined} errorMsg={fieldErrors.validUntil}>
                <Input
                  id="validUntil"
                  type="date"
                  required
                  value={formData.validUntil}
                  onChange={(e) => handleChange("validUntil", e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Property Scope" id="propertyId" helper="Restrict offer to specific property or all">
                <Select
                  id="propertyId"
                  value={formData.propertyId}
                  onChange={(e) => handleChange("propertyId", e.target.value)}
                >
                  <option value="all">All Properties (Global)</option>
                  <option value="HS-9HQ8P">Speshway Luxury Hotel (HS-9HQ8P)</option>
                  <option value="HS-JAI">The Jaipur Heritage Palace (HS-JAI)</option>
                  <option value="HS-UDA">Lake View Palace Udaipur (HS-UDA)</option>
                  <option value="HS-GOA">Goa Beachfront Resort (HS-GOA)</option>
                </Select>
              </FormField>

              <FormField label="Status" id="status">
                <Select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleChange("status", e.target.value)}
                >
                  <option value="Active">Active (Immediately Redeemable)</option>
                  <option value="Inactive">Inactive (Draft / Suspended)</option>
                </Select>
              </FormField>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-muted flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/admin/coupons" })}
              className="h-11 px-6 font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-navy hover:bg-navy/90 text-white h-11 px-8 font-bold shadow-soft rounded-full transition-all duration-200 hover:shadow-lift flex items-center gap-2"
            >
              <Ticket className="size-4" />
              {saving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/admin/coupons/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Coupon — Admin Console" },
      { name: "description", content: "Edit a promotional discount coupon for website bookings." }
    ]
  }),
  component: EditCoupon
});

export default EditCoupon;
