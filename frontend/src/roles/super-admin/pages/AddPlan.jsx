import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Notice } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/hs/FormFields";
import { toast } from "sonner";

function AddPlan() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const res = await superAdminService.createSubscriptionPlan(payload);
      if (res.success) {
        toast.success(`Subscription Plan "${payload.name}" created successfully.`);
        navigate({ to: "/super-admin/subscription" });
      }
    } catch (err) {
      setError(err.message || "Failed to create subscription plan.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title="Create Subscription Plan"
        subtitle="Establish a new pricing tier package with custom limits and platform features."
      />

      {error && <Notice tone="error" title="Form Submission Error">{error}</Notice>}

      <Panel title="Plan Parameter Configuration" description="Specify limits, rates, and inclusions.">
        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white rounded-b-xl">
          <FormField label="Plan Name" required id="name">
            <Input
              id="name"
              required
              placeholder="e.g. Starter Tier, Professional Suite"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <FormField label="Monthly Tariff" required id="monthlyPrice">
              <Input
                id="monthlyPrice"
                type="number"
                required
                min="0"
                placeholder="e.g. 5999"
                value={formData.monthlyPrice}
                onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
                suffix="₹"
              />
            </FormField>
            <FormField label="Yearly Tariff" required id="yearlyPrice">
              <Input
                id="yearlyPrice"
                type="number"
                required
                min="0"
                placeholder="e.g. 59990"
                value={formData.yearlyPrice}
                onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
                suffix="₹"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Properties Onboard Limit" required id="propertyLimit">
              <Input
                id="propertyLimit"
                type="number"
                required
                min="1"
                placeholder="e.g. 3"
                value={formData.propertyLimit}
                onChange={(e) => setFormData({ ...formData, propertyLimit: e.target.value })}
              />
            </FormField>
            <FormField label="Rooms Onboard Limit (Per Prop)" required id="roomLimit">
              <Input
                id="roomLimit"
                type="number"
                required
                min="1"
                placeholder="e.g. 150"
                value={formData.roomLimit}
                onChange={(e) => setFormData({ ...formData, roomLimit: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Included Features (Comma separated)" id="includedFeatures">
            <Textarea
              id="includedFeatures"
              placeholder="e.g. Direct Website Builder, 2-Way OTA XML Channel Sync, Custom Loyalty System"
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
              {submitting ? "Creating..." : "Create Plan"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/subscription/add")({
  component: AddPlan
});
