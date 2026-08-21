import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function EditAdmin() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    propertyId: "",
    status: "Active"
  });

  useEffect(() => {
    const loadAdminAndProperties = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, propertiesRes] = await Promise.all([
          superAdminService.getUsers(),
          superAdminService.getProperties()
        ]);

        if (propertiesRes.success) {
          setProperties(propertiesRes.data);
        }

        if (usersRes.success) {
          const admin = usersRes.data.find(u => u.id === id || u._id === id);
          if (admin) {
            setFormData({
              name: admin.name,
              email: admin.email,
              mobile: admin.mobile || "",
              propertyId: admin.propertyId || "",
              status: admin.status || "Active"
            });
          } else {
            setError("Administrator not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load administrator details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadAdminAndProperties();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Please enter a name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await superAdminService.updateUser(id, {
        name: formData.name,
        mobile: formData.mobile,
        propertyId: formData.propertyId,
        status: formData.status,
        role: "admin"
      });
      if (res.success) {
        toast.success(`Credentials for "${formData.name}" updated successfully.`);
        navigate({ to: "/super-admin/admins" });
      }
    } catch (err) {
      setError(err.message || "Failed to update administrator credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Edit Admin Credentials"
        subtitle="Modify credential fields, contact info, and assigned platform properties."
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : (
        <Panel title="Update Credentials" description="Adjust fields for this administrator.">
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

            <FormField label="Email Address (Cannot be modified)" required id="admin-email">
              <Input
                id="admin-email"
                type="email"
                required
                disabled
                value={formData.email}
                className="h-10 text-xs disabled:bg-muted text-muted-foreground"
              />
            </FormField>

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
                {submitting ? "Saving..." : "Save Credentials"}
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/admins/edit/$id")({
  component: EditAdmin
});
