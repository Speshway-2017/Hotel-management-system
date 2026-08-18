import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";

function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [propertyForm, setPropertyForm] = useState({
    name: "",
    city: "",
    propertyType: "Boutique Resort",
    rooms: 50,
    gm: "",
    assignedAdmin: "",
    status: "Onboarding"
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [propRes, usersRes] = await Promise.all([
          superAdminService.getProperty(id),
          superAdminService.getUsers()
        ]);
        if (propRes.success) {
          const item = propRes.data;
          setPropertyForm({
            name: item.name,
            city: item.city,
            propertyType: item.propertyType || "Boutique Resort",
            rooms: item.rooms,
            gm: item.gm || "",
            assignedAdmin: item.assignedAdmin ? (item.assignedAdmin._id || item.assignedAdmin) : "",
            status: item.status
          });
        }
        if (usersRes.success) {
          setUsers(usersRes.data);
        }
      } catch (err) {
        setError(err.message || "Failed to load operational configuration data");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const selectedUserObj = users.find(u => u.id === propertyForm.assignedAdmin || u._id === propertyForm.assignedAdmin);
      const payload = {
        name: propertyForm.name,
        city: propertyForm.city,
        propertyType: propertyForm.propertyType,
        rooms: propertyForm.rooms,
        status: propertyForm.status,
        assignedAdmin: propertyForm.assignedAdmin || null,
        gm: selectedUserObj ? selectedUserObj.name : "—"
      };

      const res = await superAdminService.updateProperty(id, payload);
      if (res.success) {
        navigate({ to: "/super-admin/properties" });
      }
    } catch (err) {
      setError(err.message || "Failed to save updates");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      <PageHeader
        title="Edit Hotel Property"
        subtitle="Modify settings and configurations for this property node."
      />

      {error && <Notice tone="error" title="Property Sync Failure" className="text-left">{error}</Notice>}

      <Panel title="Property Settings Form" description="Update operational metrics and owner mapping below.">
        {loading ? (
          <div className="p-6">
            <LoadingRows rows={4} />
          </div>
        ) : (
          <form onSubmit={handlePropertySubmit} className="max-w-2xl p-6 space-y-5 text-left font-sans">
            <FormField label="Hotel Property Name" required id="prop-name">
              <Input
                id="prop-name"
                required
                value={propertyForm.name}
                onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                placeholder="e.g. Hour Stay Rambagh Residency"
              />
            </FormField>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Location City" required id="prop-city">
                <Input
                  id="prop-city"
                  required
                  value={propertyForm.city}
                  onChange={(e) => setPropertyForm({ ...propertyForm, city: e.target.value })}
                  placeholder="e.g. Jaipur"
                />
              </FormField>
              <FormField label="Property Category" required id="prop-type">
                <Input
                  id="prop-type"
                  required
                  value={propertyForm.propertyType}
                  onChange={(e) => setPropertyForm({ ...propertyForm, propertyType: e.target.value })}
                  placeholder="e.g. Heritage Haveli"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Total Room Keys" required id="prop-rooms">
                <Input
                  id="prop-rooms"
                  type="number"
                  required
                  value={propertyForm.rooms}
                  onChange={(e) => setPropertyForm({ ...propertyForm, rooms: Number(e.target.value) })}
                />
              </FormField>
              <FormField label="Onboarding Status" id="prop-status">
                <Select
                  id="prop-status"
                  value={propertyForm.status}
                  onChange={(e) => setPropertyForm({ ...propertyForm, status: e.target.value })}
                >
                  <option value="Onboarding">Onboarding</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Assign Property Admin / Owner" id="prop-admin">
              <Select
                id="prop-admin"
                value={propertyForm.assignedAdmin || ""}
                onChange={(e) => {
                  const selectedAdminId = e.target.value;
                  setPropertyForm({ 
                    ...propertyForm, 
                    assignedAdmin: selectedAdminId
                  });
                }}
              >
                <option value="">Select Property Admin / Owner</option>
                {users.filter(u => u.role === "admin" || u.role === "manager").map(u => (
                  <option key={u.id || u._id} value={u.id || u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="flex gap-3 justify-end pt-5 border-t border-muted mt-6">
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => navigate({ to: "/super-admin/properties" })} 
                className="rounded-full px-5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitting}
                className="bg-navy hover:bg-navy/90 text-white rounded-full px-6 text-xs font-bold transition-all cursor-pointer"
              >
                {submitting ? "Saving..." : "Save Property"}
              </Button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/properties/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Property Settings — Hour Stay" },
      { name: "description", content: "Modify hotel PMS configurations and mappings." }
    ]
  }),
  component: EditProperty
});
