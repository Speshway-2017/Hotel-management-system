import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

function AddAdmin() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    mobile: "",
    propertyId: "",
    status: "Active"
  });

  useEffect(() => {
    const loadProperties = async () => {
      setLoading(true);
      try {
        const res = await superAdminService.getProperties();
        if (res.success) {
          setProperties(res.data);
          if (res.data.length > 0) {
            setFormData(prev => ({
              ...prev,
              propertyId: res.data[0].id || res.data[0]._id
            }));
          }
        }
      } catch (err) {
        toast.error("Failed to load property options.");
      } finally {
        setLoading(false);
      }
    };
    loadProperties();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await superAdminService.createUser({
        ...formData,
        role: "admin"
      });
      if (res.success) {
        toast.success(`Administrator "${formData.name}" registered successfully.`);
        navigate({ to: "/super-admin/admins" });
      }
    } catch (err) {
      setError(err.message || "Failed to register administrator.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Register Property Administrator"
        subtitle="Provision a new workspace administrator account with specific property controls."
      />

      {error && <Notice tone="error" title="Form Submission Error">{error}</Notice>}

      <Panel title="Administrator Credentials & Scope" description="Specify account logins and assigned properties.">
        <form onSubmit={handleSubmit} className="p-5 space-y-4 bg-white rounded-b-xl max-w-xl">
          <FormField label="Full Name" required id="admin-name">
            <Input
              id="admin-name"
              required
              placeholder="e.g. Vikram Rathore"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-10 text-xs"
            />
          </FormField>

          <FormField label="Email Address" required id="admin-email">
            <Input
              id="admin-email"
              type="email"
              required
              placeholder="e.g. vikram.rathore@hourstay.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="h-10 text-xs"
            />
          </FormField>

          <div className="relative">
            <Label htmlFor="admin-pass" className="text-xs text-navy font-semibold">Temporary Password <span className="text-error">*</span></Label>
            <div className="relative mt-1">
              <Input
                id="admin-pass"
                type={showPassword ? "text" : "password"}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 6 characters"
                className="h-10 pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <FormField label="Mobile Number" id="admin-mobile">
            <Input
              id="admin-mobile"
              placeholder="e.g. 98290 11223"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="h-10 text-xs"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="admin-prop" className="text-xs text-navy font-semibold">Assigned Property</Label>
              {loading ? (
                <div className="h-10 border border-muted flex items-center px-3 text-xs text-muted-foreground rounded-md mt-1">
                  Loading properties...
                </div>
              ) : (
                <select
                  id="admin-prop"
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })}
                  className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                >
                  <option value="">Unassigned</option>
                  {properties.map(p => (
                    <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <Label htmlFor="admin-status" className="text-xs text-navy font-semibold">Account Status</Label>
              <select
                id="admin-status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
              >
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate({ to: "/super-admin/admins" })}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-navy hover:bg-navy/90 text-white rounded-full text-xs font-bold px-6 cursor-pointer"
            >
              {submitting ? "Registering..." : "Register Administrator"}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/admins/add")({
  component: AddAdmin
});
