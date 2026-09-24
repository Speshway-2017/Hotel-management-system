import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { validateWithZod, guestProfileSchema } from "@/schemas";

export const Route = createFileRoute("/admin/guests/add")({
  head: () => ({
    meta: [
      { title: "Register New Guest Profile — Speshway Luxury Hotel" }
    ]
  }),
  component: AddGuestPage
});

function AddGuestPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "India",
    address: "",
    notes: "",
    type: "regular",
    idType: "aadhaar",
    idNumber: "",
    emergencyContact: "",
    status: "active"
  });

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (fieldErrors[id]) {
      setFieldErrors((prev) => ({ ...prev, [id]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const val = validateWithZod(guestProfileSchema, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      address: formData.address,
      idDocType: formData.idType,
      idDocNumber: formData.idNumber,
      notes: formData.notes
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    setLoading(true);
    try {
      // 1. First format custom metadata and ID info
      const notesWithId = `[ID: ${formData.idType.toUpperCase()} - ${formData.idNumber || 'None'}] ${formData.notes || ''}`.trim();
      
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        address: formData.address,
        notes: notesWithId,
        type: formData.type,
        status: formData.status
      };

      await superAdminService.createGuest(payload);
      
      toast.success(`Guest profile for ${formData.name} created!`);
      navigate({ to: "/admin/guests" });
    } catch (err) {
      toast.error(err.message || "Failed to create guest record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="space-y-3.5">
        <PageHeader
          title="Register Guest Profile"
          subtitle="Define personal dossiers, preferences, and secure regulatory documents."
        />
      </div>

      <div className="max-w-2xl">
        <Panel title="Guest Dossier Profile">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required id="name" status={fieldErrors.name ? "error" : undefined} errorMsg={fieldErrors.name}>
                <Input
                  id="name"
                  type="text"
                  nameOnly
                  required
                  placeholder="e.g. Surya"
                  value={formData.name}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Guest Classification Type" required id="type">
                <Select
                  id="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="font-bold text-xs h-10"
                >
                  <option value="Regular">Regular Member</option>
                  <option value="VIP">VIP Guest</option>
                  <option value="Corporate">Corporate Account</option>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email Address" required id="email" status={fieldErrors.email ? "error" : undefined} errorMsg={fieldErrors.email}>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Phone Number" required id="phone" status={fieldErrors.phone ? "error" : undefined} errorMsg={fieldErrors.phone}>
                <Input
                  id="phone"
                  type="tel"
                  required
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="City" id="city">
                <Input
                  id="city"
                  type="text"
                  textOnly
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="State" id="state">
                <Input
                  id="state"
                  type="text"
                  textOnly
                  placeholder="e.g. Maharashtra"
                  value={formData.state}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Country" id="country">
                <Input
                  id="country"
                  type="text"
                  textOnly
                  placeholder="e.g. India"
                  value={formData.country}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Residential Street Address" id="address">
              <Input
                id="address"
                type="text"
                placeholder="Building Name, Flat, Street..."
                value={formData.address}
                onChange={handleChange}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="ID Document Type" id="idDocType">
                <Select
                  id="idDocType"
                  value={formData.idDocType}
                  onChange={handleChange}
                  className="font-bold text-xs h-10"
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Driver License">Driver License</option>
                </Select>
              </FormField>
              <FormField label="Secure Document ID Number" id="idDocNumber" status={fieldErrors.idDocNumber || fieldErrors.aadhaar ? "error" : undefined} errorMsg={fieldErrors.idDocNumber || fieldErrors.aadhaar}>
                <Input
                  id="idDocNumber"
                  type="text"
                  placeholder="e.g. Z-8849502"
                  value={formData.idDocNumber}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Preferences (Comma Separated)" id="preferences">
                <Input
                  id="preferences"
                  type="text"
                  placeholder="e.g. High floor, Silent room"
                  value={formData.preferences}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Operational Note Profile" id="notes">
              <Textarea
                id="notes"
                placeholder="Any special remarks or staff instructions regarding stays..."
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </FormField>

            <div className="pt-4 border-t border-muted/40 flex justify-end gap-2.5 select-none">
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-xs px-5 rounded-full"
                onClick={() => navigate({ to: "/admin/guests" })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full shadow-soft flex items-center gap-1.5"
              >
                <Save className="size-3.5" /> Save Guest Profile
              </Button>
            </div>

          </form>
        </Panel>
      </div>
    </div>
  );
}
