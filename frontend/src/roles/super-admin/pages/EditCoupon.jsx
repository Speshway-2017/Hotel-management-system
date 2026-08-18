import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";

function EditCoupon() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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
      setLoading(true);
      setError(null);
      try {
        const [couponsRes, plansRes] = await Promise.all([
          superAdminService.getPromoCoupons(),
          superAdminService.getSubscriptionPlans()
        ]);

        if (plansRes.success) {
          setPlans(plansRes.data);
        }

        if (couponsRes.success) {
          const coupon = couponsRes.data.find(c => c._id === id || c.id === id);
          if (coupon) {
            setFormData({
              code: coupon.code,
              description: coupon.description || "",
              discountType: coupon.discountType,
              discountValue: coupon.discountValue,
              validFrom: coupon.validFrom,
              validUntil: coupon.validUntil,
              usageLimit: coupon.usageLimit,
              minimumSubscriptionAmount: coupon.minimumSubscriptionAmount || 0,
              applicableSubscriptionPlans: coupon.applicableSubscriptionPlans || [],
              status: coupon.status
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
    if (!formData.code || !formData.discountValue || !formData.validFrom || !formData.validUntil || !formData.usageLimit) {
      toast.error("Please fill in all required fields.");
      return;
    }

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
            <FormField label="Coupon Code" required id="code">
              <Input
                id="code"
                required
                placeholder="e.g. WELCOME25, FLAT1000"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
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
              >
                <Input
                  id="discountValue"
                  type="number"
                  required
                  min="1"
                  placeholder={formData.discountType === "percentage" ? "e.g. 15" : "e.g. 500"}
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Valid From" required id="validFrom">
                <Input
                  id="validFrom"
                  type="date"
                  required
                  value={formData.validFrom}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                />
              </FormField>
              <FormField label="Valid Until" required id="validUntil">
                <Input
                  id="validUntil"
                  type="date"
                  required
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Max Redemptions Limit" required id="usageLimit">
                <Input
                  id="usageLimit"
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 150"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                />
              </FormField>
              <FormField label="Min Spend Threshold" required id="minimumSubscriptionAmount">
                <Input
                  id="minimumSubscriptionAmount"
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 3000"
                  value={formData.minimumSubscriptionAmount}
                  onChange={(e) => setFormData({ ...formData, minimumSubscriptionAmount: e.target.value })}
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
