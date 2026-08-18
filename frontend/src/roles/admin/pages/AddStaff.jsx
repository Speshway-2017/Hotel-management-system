import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

function AddStaff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("receptionist");
  const [phone, setPhone] = useState("");
  const [dept, setDept] = useState("Front Desk");
  const [shift, setShift] = useState("Morning (06:00 - 14:00)");
  const [status, setStatus] = useState("Active");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        role,
        mobile: phone,
        status,
        propertyId: "HS-JAI" // Scoped to admin property Speshway Luxury Hotel
      };
      const res = await superAdminService.createUser(payload);
      if (res.success) {
        toast.success("Staff profile registered successfully.");
        navigate({ to: "/admin/staff" });
      }
    } catch (err) {
      toast.error(err.message || "Failed to register staff profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <PageHeader
        title="Register Staff Profile"
        subtitle="Onboard a new employee, set role configurations and shift assignments."
        actions={
          <Button
            onClick={() => navigate({ to: "/admin/staff" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer"
          >
            Back to Team List
          </Button>
        }
      />

      <div className="max-w-xl">
        <Panel title="Employee Registration Form" description="Assign credentials and contact details.">
          <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white rounded-b-xl">
            <FormField label="Full Name" required id="name">
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Email Address" required id="email">
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@hourstay.com"
                />
              </FormField>
              <FormField label="Password" required id="password">
                <div className="relative w-full">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1 z-10"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Phone Number" required id="phone">
                <Input
                  id="phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </FormField>
              <FormField label="Role Permission" id="role">
                <Select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="receptionist">Receptionist</option>
                  <option value="manager">Manager</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Department" id="dept">
                <Select
                  id="dept"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                >
                  <option value="Front Desk">Front Desk</option>
                  <option value="Management">Management</option>
                  <option value="Operations">Operations</option>
                </Select>
              </FormField>
              <FormField label="Shift Assignment" id="shift">
                <Select
                  id="shift"
                  value={shift}
                  onChange={(e) => setShift(e.target.value)}
                >
                  <option value="Morning (06:00 - 14:00)">Morning (06:00 - 14:00)</option>
                  <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                  <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
                  <option value="General (09:00 - 17:00)">General (09:00 - 17:00)</option>
                </Select>
              </FormField>
            </div>

            <div className="pt-4 border-t border-muted flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/admin/staff" })}
                className="h-10 px-4"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold shadow-soft rounded-full">
                {loading ? "Registering..." : "Register Employee"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/staff/add")({
  component: AddStaff
});
