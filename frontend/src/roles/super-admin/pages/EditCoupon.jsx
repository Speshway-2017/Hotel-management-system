import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { validateWithZod, couponSchema } from "@/schemas";

function EditCoupon() {
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    minimumSubscriptionAmount: "",
    applicableSubscriptionPlans: [],
    status: "Active"
  });

  useEffect(() => {
    const loadCouponData = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const [couponsRes, plansRes] = await Promise.all([
          superAdminService.getPromoCoupons().catch(() => ({ success: false })),
          superAdminService.getSubscriptionPlans().catch(() => ({ success: false }))
        ]);

        if (plansRes.success && Array.isArray(plansRes.data)) {
          setPlans(plansRes.data);
        }

        if (couponsRes.success && Array.isArray(couponsRes.data)) {
          const coupon = couponsRes.data.find(c => 
            String(c._id) === String(id) || 
            String(c.id) === String(id) || 
            String(c.code).toUpperCase() === String(decodeURIComponent(id)).toUpperCase()
          );

          if (coupon) {
            setFormData({
              code: coupon.code || "",
              description: coupon.description || "",
              discountType: coupon.discountType || "percentage",
              discountValue: coupon.discountValue !== undefined ? coupon.discountValue : "",
              validFrom: coupon.validFrom ? String(coupon.validFrom).split("T")[0] : "",
              validUntil: coupon.validUntil ? String(coupon.validUntil).split("T")[0] : "",
              usageLimit: coupon.usageLimit !== undefined ? coupon.usageLimit : "",
              minimumSubscriptionAmount: coupon.minimumSubscriptionAmount || 0,
              applicableSubscriptionPlans: Array.isArray(coupon.applicableSubscriptionPlans) ? coupon.applicableSubscriptionPlans : [],
              status: coupon.status || "Active"
            });
          } else {
            setError("Promo Coupon not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load coupon configurations.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadCouponData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(couponSchema, formData);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Please correct the highlighted errors.");
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    setError(null);

    const payload = {
      code: formData.code.toUpperCase().trim(),
      description: formData.description,
      discountType: formData.discountType,
      discountValue: Number(formData.discountValue),
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      usageLimit: Number(formData.usageLimit),
      minimumSubscriptionAmount: Number(formData.minimumSubscriptionAmount),
      applicableSubscriptionPlans: formData.applicableSubscriptionPlans,
      status: formData.status
    };

    try {
      const res = await superAdminService.updatePromoCoupon(id, payload);
      if (res.success) {
        toast.success(`Promo Coupon "${payload.code}" updated successfully.`);
        navigate({ to: "/super-admin/coupons" });
      }
    } catch (err) {
      setError(err.message || "Failed to update coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleApplicablePlan = (planName) => {
    setFormData(prev => {
      const plans = prev.applicableSubscriptionPlans.includes(planName)
        ? prev.applicableSubscriptionPlans.filter(p => p !== planName)
        : [...prev.applicableSubscriptionPlans, planName];
      return { ...prev, applicableSubscriptionPlans: plans };
    });
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title="Edit Promo Coupon"
        subtitle="Modify coupon configurations, validation dates, and subscription plan restrictions."
      />

      {error && <Notice tone="error" title="Form Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : (
        <Panel title="Update Coupon Parameters" description="Submit updates.">
          <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white rounded-b-xl">
            <FormField
              label="Coupon Code"
              required
              id="code"
              status={fieldErrors.code ? "error" : undefined}
              errorMsg={fieldErrors.code}
            >
              <Input
                id="code"
                required
                placeholder="e.g. WELCOME25, FLAT1000"
                value={formData.code}
                onChange={(e) => {
                  setFormData({ ...formData, code: e.target.value.toUpperCase() });
                  if (fieldErrors.code) setFieldErrors({ ...fieldErrors, code: undefined });
                }}
                disabled
                className="uppercase"
              />
            </FormField>

            <FormField label="Coupon Description" id="description">
              <Input
                id="description"
                placeholder="Describe the promo package..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Discount Type" id="discountType">
                <Select
                  id="discountType"
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat Amount (INR)</option>
                </Select>
              </FormField>
              <FormField
                label={formData.discountType === "percentage" ? "Percentage Value (%)" : "Value (INR)"}
                required
                id="discountValue"
                status={fieldErrors.discountValue ? "error" : undefined}
                errorMsg={fieldErrors.discountValue}
              >
                <Input
                  id="discountValue"
                  type="number"
                  required
                  min="1"
                  placeholder={formData.discountType === "percentage" ? "e.g. 15" : "e.g. 500"}
                  value={formData.discountValue}
                  onChange={(e) => {
                    setFormData({ ...formData, discountValue: e.target.value });
                    if (fieldErrors.discountValue) setFieldErrors({ ...fieldErrors, discountValue: undefined });
                  }}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Valid From"
                required
                id="validFrom"
                status={fieldErrors.validFrom ? "error" : undefined}
                errorMsg={fieldErrors.validFrom}
              >
                <Input
                  id="validFrom"
                  type="date"
                  required
                  value={formData.validFrom}
                  onChange={(e) => {
                    setFormData({ ...formData, validFrom: e.target.value });
                    if (fieldErrors.validFrom) setFieldErrors({ ...fieldErrors, validFrom: undefined });
                  }}
                />
              </FormField>
              <FormField
                label="Valid Until"
                required
                id="validUntil"
                status={fieldErrors.validUntil ? "error" : undefined}
                errorMsg={fieldErrors.validUntil}
              >
                <Input
                  id="validUntil"
                  type="date"
                  required
                  value={formData.validUntil}
                  onChange={(e) => {
                    setFormData({ ...formData, validUntil: e.target.value });
                    if (fieldErrors.validUntil) setFieldErrors({ ...fieldErrors, validUntil: undefined });
                  }}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Max Redemptions Limit"
                required
                id="usageLimit"
                status={fieldErrors.usageLimit ? "error" : undefined}
                errorMsg={fieldErrors.usageLimit}
              >
                <Input
                  id="usageLimit"
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 150"
                  value={formData.usageLimit}
                  onChange={(e) => {
                    setFormData({ ...formData, usageLimit: e.target.value });
                    if (fieldErrors.usageLimit) setFieldErrors({ ...fieldErrors, usageLimit: undefined });
                  }}
                />
              </FormField>
              <FormField
                label="Min Spend Threshold"
                required
                id="minimumSubscriptionAmount"
                status={fieldErrors.minimumSubscriptionAmount ? "error" : undefined}
                errorMsg={fieldErrors.minimumSubscriptionAmount}
              >
                <Input
                  id="minimumSubscriptionAmount"
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 3000"
                  value={formData.minimumSubscriptionAmount}
                  onChange={(e) => {
                    setFormData({ ...formData, minimumSubscriptionAmount: e.target.value });
                    if (fieldErrors.minimumSubscriptionAmount) setFieldErrors({ ...fieldErrors, minimumSubscriptionAmount: undefined });
                  }}
                  suffix="₹"
                />
              </FormField>
            </div>

            <FormField label="Applicable Tier Plans">
              <div className="grid grid-cols-2 gap-2 mt-1 border border-muted rounded-lg p-3 bg-cream/5 max-h-32 overflow-y-auto">
                {plans.map((p) => {
                  const isChecked = formData.applicableSubscriptionPlans.includes(p.name);
                  return (
                    <Checkbox
                      key={p._id || p.id}
                      label={p.name}
                      checked={isChecked}
                      onChange={() => toggleApplicablePlan(p.name)}
                    />
                  );
                })}
              </div>
            </FormField>

            <FormField label="Status" id="status">
              <Select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </FormField>

            <div className="pt-4 border-t flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/super-admin/coupons" })}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-navy hover:bg-navy/90 text-white rounded-full text-xs font-bold px-6 cursor-pointer"
              >
                {submitting ? "Saving..." : "Save Coupon"}
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/coupons/edit/$id")({
  component: EditCoupon
});
