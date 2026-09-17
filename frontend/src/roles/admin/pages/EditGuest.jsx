import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/guests/edit/$id")({
  head: () => ({
    meta: [
      { title: "Edit Guest Profile — Speshway Luxury Hotel" }
    ]
  }),
  component: EditGuestPage
});

import { superAdminService } from "@/services/superAdmin";
import { managerService } from "@/services/manager";

function EditGuestPage() {
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "India",
    address: "",
    type: "Regular",
    preferences: "",
    idDocType: "Aadhaar Card",
    idDocNumber: "",
    notes: ""
  });

  useEffect(() => {
    const loadGuestDetail = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [usersRes, guestsRes] = await Promise.all([
          superAdminService.getUsers().catch(() => ({ success: false })),
          managerService.getGuests().catch(() => ({ success: false }))
        ]);

        const cleanId = decodeURIComponent(String(id)).trim().toLowerCase();
        let matched = null;
        if (usersRes.success && Array.isArray(usersRes.data)) {
          matched = usersRes.data.find(g => 
            String(g._id).toLowerCase() === cleanId || 
            String(g.id).toLowerCase() === cleanId || 
            (g.guestId && String(g.guestId).toLowerCase() === cleanId) ||
            (g.email && String(g.email).toLowerCase() === cleanId) ||
            (g.mobile && String(g.mobile).toLowerCase() === cleanId) ||
            (g.phone && String(g.phone).toLowerCase() === cleanId)
          );
        }

        if (!matched && guestsRes.success && Array.isArray(guestsRes.data)) {
          matched = guestsRes.data.find(g => 
            String(g._id).toLowerCase() === cleanId || 
            String(g.id).toLowerCase() === cleanId || 
            (g.guestId && String(g.guestId).toLowerCase() === cleanId) ||
            (g.email && String(g.email).toLowerCase() === cleanId) ||
            (g.mobile && String(g.mobile).toLowerCase() === cleanId) ||
            (g.phone && String(g.phone).toLowerCase() === cleanId)
          );
        }

        if (matched) {
          setFormData({
            name: matched.name || matched.guestName || "",
            email: matched.email || "",
            phone: matched.phone || matched.mobile || matched.phoneNumber || "",
            city: matched.city || "",
            state: matched.state || "",
            country: matched.country || "India",
            address: matched.address || "",
            type: matched.type || matched.tier || matched.guestType || "Regular",
            preferences: matched.preferences || "",
            idDocType: matched.idDocType || matched.idType || "Aadhaar Card",
            idDocNumber: matched.idDocNumber || matched.idNumber || matched.idProofNumber || "",
            notes: matched.notes || ""
          });
        }
      } catch (err) {
        toast.error("Failed to load guest profile.");
      } finally {
        setLoading(false);
      }
    };
    loadGuestDetail();
  }, [id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in guest name, email, and phone contact.");
      return;
    }

    setLoading(true);
    try {
      await superAdminService.updateUser(id, {
        name: formData.name,
        email: formData.email,
        mobile: formData.phone,
        city: formData.city,
        state: formData.state,
        country: formData.country,
        address: formData.address,
        type: formData.type,
        preferences: formData.preferences,
        idDocType: formData.idDocType,
        idDocNumber: formData.idDocNumber,
        notes: formData.notes
      });
      toast.success(`Guest profile for ${formData.name} updated!`);
      navigate({ to: "/admin/guests" });
    } catch (err) {
      toast.error(err.message || "Failed to update guest profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="space-y-3.5">
        <PageHeader
          title="Edit Guest Profile"
          subtitle="Modify details, preferences, and secure identification logs."
        />
      </div>

      <div className="max-w-2xl">
        <Panel title="Update Dossier details">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required id="name">
                <Input
                  id="name"
                  type="text"
                  required
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
              <FormField label="Email Address" required id="email">
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Phone Number" required id="phone">
                <Input
                  id="phone"
                  type="text"
                  required
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
                  value={formData.city}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="State" id="state">
                <Input
                  id="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                />
              </FormField>
              <FormField label="Country" id="country">
                <Input
                  id="country"
                  type="text"
                  value={formData.country}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Residential Street Address" id="address">
              <Input
                id="address"
                type="text"
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
              <FormField label="Secure Document ID Number" id="idDocNumber">
                <Input
                  id="idDocNumber"
                  type="text"
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
                  value={formData.preferences}
                  onChange={handleChange}
                />
              </FormField>
            </div>

            <FormField label="Operational Note Profile" id="notes">
              <Textarea
                id="notes"
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
                <Save className="size-3.5" /> Save Changes
              </Button>
            </div>

          </form>
        </Panel>
      </div>
    </div>
  );
}
