import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { cn } from "@/utils/utils";
import { Eye, EyeOff } from "lucide-react";
import { validateWithZod, propertySchema } from "@/schemas";
import { toast } from "sonner";

function AddProperty() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [adminMode, setAdminMode] = useState("create"); // "create" | "select"
  const [showPassword, setShowPassword] = useState(false);

  const [propertyForm, setPropertyForm] = useState({
    name: "",
    city: "",
    propertyType: "Boutique Resort",
    rooms: 50,
    gm: "",
    assignedAdmin: "",
    status: "Onboarding",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    adminMobile: ""
  });

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const usersRes = await superAdminService.getUsers();
        if (usersRes.success) setUsers(usersRes.data);
      } catch (err) {
        setError(err.message || "Failed to load staff list");
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const handlePropertySubmit = async (e) => {
    e.preventDefault();
    const validation = validateWithZod(propertySchema, propertyForm);
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Please correct the highlighted errors.");
      return;
    }

    if (adminMode === "create") {
      const adminValidationErrors = {};
      if (!propertyForm.adminName?.trim()) {
        adminValidationErrors.adminName = "Admin Full Name is required";
      }
      if (!propertyForm.adminEmail?.trim() || !propertyForm.adminEmail.includes("@")) {
        adminValidationErrors.adminEmail = "Valid Admin Email is required";
      }
      if (!propertyForm.adminPassword || propertyForm.adminPassword.length < 6) {
        adminValidationErrors.adminPassword = "Password must be at least 6 characters";
      }
      if (Object.keys(adminValidationErrors).length > 0) {
        setFieldErrors(adminValidationErrors);
        toast.error(Object.values(adminValidationErrors)[0]);
        return;
      }
    } else {
      if (!propertyForm.assignedAdmin) {
        setFieldErrors({ assignedAdmin: "Please select an existing property admin" });
        toast.error("Please select an existing property admin");
        return;
      }
    }

    setFieldErrors({});
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: propertyForm.name,
        city: propertyForm.city,
        propertyType: propertyForm.propertyType,
        rooms: propertyForm.rooms,
        status: propertyForm.status
      };

      if (adminMode === "create") {
        payload.adminName = propertyForm.adminName;
        payload.adminEmail = propertyForm.adminEmail;
        payload.adminPassword = propertyForm.adminPassword;
        payload.adminMobile = propertyForm.adminMobile;
      } else {
        payload.assignedAdmin = propertyForm.assignedAdmin;
        const selectedUserObj = users.find(u => u.id === propertyForm.assignedAdmin || u._id === propertyForm.assignedAdmin);
        payload.gm = selectedUserObj ? selectedUserObj.name : "—";
      }

      const res = await superAdminService.createProperty(payload);
      if (res.success) {
        toast.success(`Property "${propertyForm.name}" registered successfully.`);
        navigate({ to: "/super-admin/properties" });
      }
    } catch (err) {
      setError(err.message || "Failed to save property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">

      <PageHeader
        title="Register Hotel Property"
        subtitle="Onboard a new property onto the Hour Stay platform."
      />

      {error && <Notice tone="error" title="Property Registration Error" className="text-left">{error}</Notice>}

      <Panel title="Property Onboarding Form" description="Provide the key operational details to initialize this hotel property node.">
        {loading ? (
          <div className="p-6">
            <LoadingRows rows={4} />
          </div>
        ) : (
          <form onSubmit={handlePropertySubmit} className="max-w-2xl p-6 space-y-5 text-left font-sans">
            <FormField
              label="Hotel Property Name"
              required
              id="prop-name"
              status={fieldErrors.name ? "error" : undefined}
              errorMsg={fieldErrors.name}
            >
              <Input
                id="prop-name"
                required
                value={propertyForm.name}
                onChange={(e) => {
                  setPropertyForm({ ...propertyForm, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                }}
                placeholder="e.g. Hour Stay Rambagh Residency"
              />
            </FormField>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                label="Location City"
                required
                id="prop-city"
                status={fieldErrors.city ? "error" : undefined}
                errorMsg={fieldErrors.city}
              >
                <Input
                  id="prop-city"
                  required
                  textOnly
                  value={propertyForm.city}
                  onChange={(e) => {
                    setPropertyForm({ ...propertyForm, city: e.target.value });
                    if (fieldErrors.city) setFieldErrors({ ...fieldErrors, city: undefined });
                  }}
                  placeholder="e.g. Jaipur"
                />
              </FormField>
              <FormField
                label="Property Category"
                required
                id="prop-type"
                status={fieldErrors.propertyType ? "error" : undefined}
                errorMsg={fieldErrors.propertyType}
              >
                <Input
                  id="prop-type"
                  required
                  value={propertyForm.propertyType}
                  onChange={(e) => {
                    setPropertyForm({ ...propertyForm, propertyType: e.target.value });
                    if (fieldErrors.propertyType) setFieldErrors({ ...fieldErrors, propertyType: undefined });
                  }}
                  placeholder="e.g. Heritage Haveli"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField
                label="Total Room Keys"
                required
                id="prop-rooms"
                status={fieldErrors.rooms ? "error" : undefined}
                errorMsg={fieldErrors.rooms}
              >
                <Input
                  id="prop-rooms"
                  type="number"
                  required
                  value={propertyForm.rooms}
                  onChange={(e) => {
                    setPropertyForm({ ...propertyForm, rooms: Number(e.target.value) });
                    if (fieldErrors.rooms) setFieldErrors({ ...fieldErrors, rooms: undefined });
                  }}
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

            {/* Admin Details Form Block */}
            <div className="space-y-4 pt-4 border-t border-muted">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-navy font-bold uppercase tracking-wider">Property Admin / Owner</Label>
                <div className="flex gap-1.5 bg-muted/40 p-1 rounded-full border">
                  <button
                    type="button"
                    onClick={() => setAdminMode("create")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer",
                      adminMode === "create" ? "bg-navy text-white shadow-sm" : "text-muted-foreground hover:text-navy"
                    )}
                  >
                    Create New
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminMode("select")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all cursor-pointer",
                      adminMode === "select" ? "bg-navy text-white shadow-sm" : "text-muted-foreground hover:text-navy"
                    )}
                  >
                    Choose Existing
                  </button>
                </div>
              </div>

              {adminMode === "create" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-muted/10 border border-muted/50 p-4.5 rounded-xl animate-fade-in">
                  <FormField
                    label="Admin Full Name"
                    required={adminMode === "create"}
                    id="admin-name"
                    status={fieldErrors.adminName ? "error" : undefined}
                    errorMsg={fieldErrors.adminName}
                  >
                    <Input
                      id="admin-name"
                      required={adminMode === "create"}
                      nameOnly
                      value={propertyForm.adminName}
                      onChange={(e) => {
                        setPropertyForm({ ...propertyForm, adminName: e.target.value });
                        if (fieldErrors.adminName) setFieldErrors({ ...fieldErrors, adminName: undefined });
                      }}
                      placeholder="e.g. Vikram Singh"
                    />
                  </FormField>
                  <FormField
                    label="Admin Email Address"
                    required={adminMode === "create"}
                    id="admin-email"
                    status={fieldErrors.adminEmail ? "error" : undefined}
                    errorMsg={fieldErrors.adminEmail}
                  >
                    <Input
                      id="admin-email"
                      type="email"
                      required={adminMode === "create"}
                      value={propertyForm.adminEmail}
                      onChange={(e) => {
                        setPropertyForm({ ...propertyForm, adminEmail: e.target.value });
                        if (fieldErrors.adminEmail) setFieldErrors({ ...fieldErrors, adminEmail: undefined });
                      }}
                      placeholder="e.g. admin@resort.com"
                    />
                  </FormField>
                  <FormField
                    label="Security Password"
                    required={adminMode === "create"}
                    id="admin-password"
                    status={fieldErrors.adminPassword ? "error" : undefined}
                    errorMsg={fieldErrors.adminPassword}
                  >
                    <div className="relative w-full">
                      <Input
                        id="admin-password"
                        type={showPassword ? "text" : "password"}
                        required={adminMode === "create"}
                        value={propertyForm.adminPassword}
                        onChange={(e) => {
                          setPropertyForm({ ...propertyForm, adminPassword: e.target.value });
                          if (fieldErrors.adminPassword) setFieldErrors({ ...fieldErrors, adminPassword: undefined });
                        }}
                        placeholder="Min 6 characters"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1 z-10"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormField>
                  <FormField
                    label="Mobile Number"
                    id="admin-mobile"
                    status={fieldErrors.adminMobile ? "error" : undefined}
                    errorMsg={fieldErrors.adminMobile}
                  >
                    <Input
                      id="admin-mobile"
                      type="tel"
                      value={propertyForm.adminMobile}
                      onChange={(e) => {
                        setPropertyForm({ ...propertyForm, adminMobile: e.target.value });
                        if (fieldErrors.adminMobile) setFieldErrors({ ...fieldErrors, adminMobile: undefined });
                      }}
                      placeholder="e.g. 9876543210"
                    />
                  </FormField>
                </div>
              ) : (
                <div className="bg-muted/10 border border-muted/50 p-4.5 rounded-xl space-y-1.5 animate-fade-in">
                  <FormField label="Select Property Admin / Owner" id="prop-admin">
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
                </div>
              )}
            </div>

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

export const Route = createFileRoute("/super-admin/properties/add")({
  head: () => ({
    meta: [
      { title: "Register Property — Hour Stay" },
      { name: "description", content: "Onboard and register new hotel properties onto the Hour Stay platform." }
    ]
  }),
  component: AddProperty
});
