import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { validateWithZod, planSchema } from "@/schemas";

function EditPlan() {
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    monthlyPrice: "",
    yearlyPrice: "",
    propertyLimit: "",
    roomLimit: "",
    status: "Active",
    includedFeaturesText: ""
  });

  useEffect(() => {
    const loadPlan = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getSubscriptionPlans();
        if (res.success && Array.isArray(res.data)) {
          const plan = res.data.find(p => String(p._id) === String(id) || String(p.id) === String(id) || String(p.name).toLowerCase() === decodeURIComponent(id).toLowerCase());
          if (plan) {
            setFormData({
              name: plan.name || "",
              description: plan.description || "",
              monthlyPrice: plan.monthlyPrice !== undefined ? plan.monthlyPrice : "",
              yearlyPrice: plan.yearlyPrice !== undefined ? plan.yearlyPrice : "",
              propertyLimit: plan.propertyLimit !== undefined ? plan.propertyLimit : "",
              roomLimit: plan.roomLimit !== undefined ? plan.roomLimit : "",
              status: plan.status || "Active",
              includedFeaturesText: Array.isArray(plan.includedFeatures) ? plan.includedFeatures.join(", ") : (plan.includedFeatures || "")
            });
          } else {
            setError("Subscription Plan not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load subscription plan detail.");
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(planSchema, formData);
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
      name: formData.name,
      description: formData.description,
      monthlyPrice: Number(formData.monthlyPrice),
      yearlyPrice: Number(formData.yearlyPrice),
      propertyLimit: Number(formData.propertyLimit),
      roomLimit: Number(formData.roomLimit),
      status: formData.status,
      includedFeatures: formData.includedFeaturesText
        ? formData.includedFeaturesText.split(",").map(f => f.trim()).filter(Boolean)
        : []
    };

    try {
      const res = await superAdminService.updateSubscriptionPlan(id, payload);
      if (res.success) {
        toast.success(`Subscription Plan "${payload.name}" updated successfully.`);
        navigate({ to: "/super-admin/subscription" });
      }
    } catch (err) {
      setError(err.message || "Failed to update subscription plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title="Edit Subscription Plan"
        subtitle="Modify pricing thresholds, property caps, and operational limits."
      />

      {error && <Notice tone="error" title="Form Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : (
        <Panel title="Plan Details Update" description="Submit tier adjustments.">
          <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white rounded-b-xl">
            <FormField
              label="Plan Name"
              required
              id="name"
              status={fieldErrors.name ? "error" : undefined}
              errorMsg={fieldErrors.name}
            >
              <Input
                id="name"
                required
                placeholder="e.g. Starter Tier, Professional Suite"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                }}
              />
            </FormField>

            <FormField label="Plan Description" id="description">
              <Textarea
                id="description"
                placeholder="Describe the plan limits and targeting..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Monthly Tariff"
                required
                id="monthlyPrice"
                status={fieldErrors.monthlyPrice ? "error" : undefined}
                errorMsg={fieldErrors.monthlyPrice}
              >
                <Input
                  id="monthlyPrice"
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 5999"
                  value={formData.monthlyPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, monthlyPrice: e.target.value });
                    if (fieldErrors.monthlyPrice) setFieldErrors({ ...fieldErrors, monthlyPrice: undefined });
                  }}
                  suffix="₹"
                />
              </FormField>
              <FormField
                label="Yearly Tariff"
                required
                id="yearlyPrice"
                status={fieldErrors.yearlyPrice ? "error" : undefined}
                errorMsg={fieldErrors.yearlyPrice}
              >
                <Input
                  id="yearlyPrice"
                  type="number"
                  required
                  min="0"
                  placeholder="e.g. 59990"
                  value={formData.yearlyPrice}
                  onChange={(e) => {
                    setFormData({ ...formData, yearlyPrice: e.target.value });
                    if (fieldErrors.yearlyPrice) setFieldErrors({ ...fieldErrors, yearlyPrice: undefined });
                  }}
                  suffix="₹"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="Properties Onboard Limit"
                required
                id="propertyLimit"
                status={fieldErrors.propertyLimit ? "error" : undefined}
                errorMsg={fieldErrors.propertyLimit}
              >
                <Input
                  id="propertyLimit"
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 3"
                  value={formData.propertyLimit}
                  onChange={(e) => {
                    setFormData({ ...formData, propertyLimit: e.target.value });
                    if (fieldErrors.propertyLimit) setFieldErrors({ ...fieldErrors, propertyLimit: undefined });
                  }}
                />
              </FormField>
              <FormField
                label="Rooms Onboard Limit (Per Prop)"
                required
                id="roomLimit"
                status={fieldErrors.roomLimit ? "error" : undefined}
                errorMsg={fieldErrors.roomLimit}
              >
                <Input
                  id="roomLimit"
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 150"
                  value={formData.roomLimit}
                  onChange={(e) => {
                    setFormData({ ...formData, roomLimit: e.target.value });
                    if (fieldErrors.roomLimit) setFieldErrors({ ...fieldErrors, roomLimit: undefined });
                  }}
                />
              </FormField>
            </div>

            <FormField label="Included Features (Comma separated)" id="includedFeatures">
              <Textarea
                id="includedFeatures"
                placeholder="e.g. Direct Website Builder, 2-Way OTA XML Channel Sync, Advanced CRM Module"
                value={formData.includedFeaturesText}
                onChange={(e) => setFormData({ ...formData, includedFeaturesText: e.target.value })}
                className="min-h-[70px]"
              />
            </FormField>

            <FormField label="Plan Status" id="status">
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
                onClick={() => navigate({ to: "/super-admin/subscription" })}
                className="rounded-full text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-navy hover:bg-navy/90 text-white rounded-full text-xs font-bold px-6 cursor-pointer"
              >
                {submitting ? "Saving..." : "Save Adjustments"}
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/subscription/edit/$id")({
  component: EditPlan
});
