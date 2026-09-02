import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

function ManagerAddStaff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dept, setDept] = useState("Front Office");
  const [shift, setShift] = useState("Morning Shift");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        password,
        mobile: phone,
        dept,
        shift
      };
      const res = await managerService.addStaff(payload);
      if (res.success) {
        toast.success("Staff profile registered successfully.");
        navigate({ to: "/manager/shifts" });
      } else {
        toast.error(res.message || "Failed to register staff profile.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to register staff profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in">

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
                className="text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
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
                  className="text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
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
                    className="pr-10 text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
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
              <FormField label="Contact Number" id="phone">
                <Input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 99999 88888"
                  className="text-xs font-semibold text-navy bg-cream/5 border-muted h-9"
                />
              </FormField>
              <FormField label="Department" id="dept">
                <Select
                  id="dept"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  className="text-xs font-semibold text-navy bg-[#FDFCFA]/20 border-muted h-9"
                >
                  <option value="Front Office">Front Office</option>
                  <option value="Front Desk">Front Desk</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Food & Beverage">Food & Beverage</option>
                  <option value="Security">Security</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Preferred Shift Assignment" id="shift">
              <Select
                id="shift"
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="text-xs font-semibold text-navy bg-[#FDFCFA]/20 border-muted h-9"
              >
                <option value="Morning Shift">Morning Shift (06:00 AM - 02:00 PM)</option>
                <option value="Afternoon Shift">Afternoon Shift (02:00 PM - 10:00 PM)</option>
                <option value="Night Shift">Night Shift (10:00 PM - 06:00 AM)</option>
                <option value="General Shift">General Shift (09:00 AM - 05:00 PM)</option>
              </Select>
            </FormField>

            <div className="pt-4 flex justify-end gap-2 border-t border-muted/30">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate({ to: "/manager/shifts" })}
                className="h-9 px-4 text-xs font-bold rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-navy hover:bg-navy-deep text-white font-bold h-9 px-5 rounded-md cursor-pointer"
              >
                {loading ? "Registering..." : "Register Staff"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/staff/add")({
  component: ManagerAddStaff
});
