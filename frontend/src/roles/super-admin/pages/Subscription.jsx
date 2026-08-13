import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, ShieldCheck, RefreshCw, X, CheckCircle, Clock } from "lucide-react";

function SuperAdminSubscription() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // Form Fields
  const [formData, setFormData] = useState({
    subscriptionTier: "Basic",
    subscriptionStatus: "Active",
    subscriptionExpiryDays: 30
  });

  const loadProperties = async () => {
    setLoading(true);
    try {
      const res = await superAdminService.getProperties();
      if (res.success) {
        setProperties(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const openManageModal = (prop) => {
    setSelectedProperty(prop);
    setFormData({
      subscriptionTier: prop.subscriptionTier || "Basic",
      subscriptionStatus: prop.subscriptionStatus || "Active",
      subscriptionExpiryDays: 30
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const expiryDate = new Date(Date.now() + Number(formData.subscriptionExpiryDays) * 24 * 60 * 60 * 1000);
      const res = await superAdminService.updateProperty(selectedProperty.id || selectedProperty._id, {
        subscriptionTier: formData.subscriptionTier,
        subscriptionStatus: formData.subscriptionStatus,
        subscriptionExpiry: expiryDate
      });
      if (res.success) {
        setModalOpen(false);
        loadProperties();
      }
    } catch (err) {
      setError(err.message || "Failed to update subscription");
    }
  };

  const filteredProperties = properties.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription & Billing"
        subtitle="Manage SaaS platform subscriptions, plan tiers, payment status, and licensing across Hour Stay hotels."
        actions={
          <Button onClick={loadProperties} variant="outline" className="rounded-full gap-2 border-muted hover:bg-muted text-navy-deep">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh Billing
          </Button>
        }
      />

      {error && <Notice tone="error" title="Billing Error" className="text-left">{error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main List */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4 bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search properties by name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
          </div>

          <Panel title="Property Subscriptions" description={`Showing ${filteredProperties.length} records`}>
            {loading ? (
              <LoadingRows rows={4} />
            ) : filteredProperties.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No property records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Hotel Property</th>
                      <th className="p-4">SaaS Tier Plan</th>
                      <th className="p-4">Billing Status</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredProperties.map((p) => (
                      <tr key={p.id || p._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-navy text-sm">{p.name}</p>
                            <p className="text-muted-foreground text-xs">{p.city}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Tag tone={p.subscriptionTier === "Enterprise" ? "brand" : p.subscriptionTier === "Premium" ? "info" : "neutral"}>
                            {p.subscriptionTier || "None"}
                          </Tag>
                        </td>
                        <td className="p-4">
                          <Tag tone={statusTone(p.subscriptionStatus || "Active")}>
                            {p.subscriptionStatus || "Active"}
                          </Tag>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-muted-foreground">
                          {p.subscriptionExpiry ? new Date(p.subscriptionExpiry).toLocaleDateString("en-IN") : "No Plan"}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            onClick={() => openManageModal(p)}
                            variant="outline"
                            size="xs"
                            className="rounded-full text-[10px] font-semibold hover:bg-muted text-navy border-muted"
                          >
                            Manage Plan
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Pricing Guide */}
        <div className="space-y-4">
          <Panel title="Plan pricing reference" description="Standard SaaS pricing brackets.">
            <div className="p-4 space-y-4 text-xs leading-relaxed text-muted-foreground">
              <div className="border-b pb-3 space-y-1">
                <div className="flex justify-between font-semibold text-navy">
                  <span>Basic Plan</span>
                  <span className="text-purple">₹15,000 / mo</span>
                </div>
                <p className="text-[10px]">Up to 50 rooms, standard PMS grid, cash/card payment records, single property.</p>
              </div>
              <div className="border-b pb-3 space-y-1">
                <div className="flex justify-between font-semibold text-navy">
                  <span>Premium Plan</span>
                  <span className="text-purple">₹35,000 / mo</span>
                </div>
                <p className="text-[10px]">Up to 150 rooms, automated 2-way OTA channel sync, custom reporting, SMS integrations.</p>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between font-semibold text-navy">
                  <span>Enterprise Plan</span>
                  <span className="text-purple">₹75,000 / mo</span>
                </div>
                <p className="text-[10px]">Unlimited rooms, Multi-property centralized dashboard, dedicated database, premium support SLAs.</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Subscription Manage Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy">Manage SaaS Subscription</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="py-4 space-y-4 text-left">
              <div className="bg-cream/30 p-3 rounded-lg border border-navy/5 text-xs text-navy font-semibold">
                Property: {selectedProperty?.name}
              </div>

              <div>
                <Label htmlFor="sub-plan" className="text-xs text-navy font-semibold">Pricing Plan Tier</Label>
                <select
                  id="sub-plan"
                  value={formData.subscriptionTier}
                  onChange={(e) => setFormData({ ...formData, subscriptionTier: e.target.value })}
                  className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                >
                  <option value="Basic">Basic Plan (₹15,000/mo)</option>
                  <option value="Premium">Premium Plan (₹35,000/mo)</option>
                  <option value="Enterprise">Enterprise Plan (₹75,000/mo)</option>
                  <option value="None">None (Inactive)</option>
                </select>
              </div>

              <div>
                <Label htmlFor="sub-status" className="text-xs text-navy font-semibold">Payment / Billing State</Label>
                <select
                  id="sub-status"
                  value={formData.subscriptionStatus}
                  onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                  className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                >
                  <option value="Active">Active (Paid)</option>
                  <option value="Unpaid">Unpaid (Awaiting payment)</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              <div>
                <Label htmlFor="sub-expiry" className="text-xs text-navy font-semibold">Extend License Validity (Days)</Label>
                <select
                  id="sub-expiry"
                  value={formData.subscriptionExpiryDays}
                  onChange={(e) => setFormData({ ...formData, subscriptionExpiryDays: e.target.value })}
                  className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                >
                  <option value="30">Extend by 30 Days (1 Month)</option>
                  <option value="90">Extend by 90 Days (3 Months)</option>
                  <option value="180">Extend by 180 Days (6 Months)</option>
                  <option value="365">Extend by 365 Days (1 Year)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                <Button variant="ghost" type="button" onClick={() => setModalOpen(false)} className="rounded-full">
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
                  Save Billing Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription & Billing — Hour Stay" },
      { name: "description", content: "Manage SaaS platform subscriptions." },
      { property: "og:title", content: "Subscription & Billing — Hour Stay" },
      { property: "og:description", content: "Manage SaaS platform subscriptions." }
    ]
  }),
  component: SuperAdminSubscription
});
