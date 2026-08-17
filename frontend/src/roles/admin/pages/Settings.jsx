import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HorizontalRouteTabs, Panel, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, User } from "lucide-react";

const settingsTabs = [
  { label: "Settings", to: "/admin/settings", icon: SettingsIcon },
  { label: "Profile", to: "/admin/profile", icon: User }
];

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "Property Settings — Speshway Luxury Hotel" },
      { name: "description", content: "Configure property-level settings, overrides, tax rules, templates and check-in policies." }
    ]
  }),
  component: AdminSettingsPage
});

function AdminSettingsPage() {
  const [activeSubTab, setActiveSubTab] = useState("hotel-info"); // 'hotel-info' | 'tax-gst' | 'policies' | 'payments' | 'notifications'
  
  // Settings Form States (Initialized with realistic Speshway Luxury Hotel data)
  const [hotelName, setHotelName] = useState("Speshway Luxury Hotel");
  const [hotelAddress, setHotelAddress] = useState("Speshway Heights, Hitech City Main Rd, Madhapur, Hyderabad, Telangana 500081");
  const [hotelPhone, setHotelPhone] = useState("+91 40 4495 1022");
  const [hotelEmail, setHotelEmail] = useState("reservations@speshway.com");
  
  const [gstin, setGstin] = useState("36AAAAA1111A1Z1");
  const [cgst, setCgst] = useState(9);
  const [sgst, setSgst] = useState(9);

  const [checkInTime, setCheckInTime] = useState("12:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [cancelPolicy, setCancelPolicy] = useState("Free cancellation up to 24 hours prior to check-in. Cancellation within 24 hours will attract a 1-night tariff penalty.");

  const [autoAssign, setAutoAssign] = useState(true);
  const [waitlistLimit, setWaitlistLimit] = useState(5);
  const [paymentProvider, setPaymentProvider] = useState("Razorpay");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [parityAlerts, setParityAlerts] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");

  function handleSave(e) {
    e.preventDefault();
    setSuccessMsg("Property configuration saved successfully.");
    setTimeout(() => setSuccessMsg(""), 3000);
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={settingsTabs} />

      {successMsg && (
        <Notice tone="success" title="Settings Saved">
          {successMsg}
        </Notice>
      )}

      {/* Sub-tab navigation panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Sub-tab column */}
        <div className="lg:col-span-1 bg-white border border-muted rounded-xl p-3 shadow-soft space-y-1 self-start select-none">
          {[
            { id: "hotel-info", label: "Hotel Profile" },
            { id: "tax-gst", label: "Tax & GST Rule" },
            { id: "policies", label: "Policies & Timings" },
            { id: "payments", label: "Payments & Booking" },
            { id: "notifications", label: "Notification Prefs" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === tab.id
                  ? "bg-navy text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted/15 hover:text-navy"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right Form Content Column */}
        <form onSubmit={handleSave} className="lg:col-span-3">
          {activeSubTab === "hotel-info" && (
            <Panel title="Hotel Profile Information" description="Update property address, support details, and descriptions.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Hotel Name</label>
                    <input
                      type="text"
                      required
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reservation Email</label>
                    <input
                      type="email"
                      required
                      value={hotelEmail}
                      onChange={(e) => setHotelEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Contact Number</label>
                    <input
                      type="text"
                      required
                      value={hotelPhone}
                      onChange={(e) => setHotelPhone(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Physical Address</label>
                    <textarea
                      rows={3}
                      required
                      value={hotelAddress}
                      onChange={(e) => setHotelAddress(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy resize-none"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-6 font-bold shadow-soft">
                    Save Changes
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "tax-gst" && (
            <Panel title="Taxation & GST configuration" description="Specify active goods and service tax slabs.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">GSTIN ID</label>
                    <input
                      type="text"
                      required
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">CGST Slabs (%)</label>
                    <input
                      type="number"
                      required
                      value={cgst}
                      onChange={(e) => setCgst(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">SGST Slabs (%)</label>
                    <input
                      type="number"
                      required
                      value={sgst}
                      onChange={(e) => setSgst(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-6 font-bold shadow-soft">
                    Save Taxation Settings
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "policies" && (
            <Panel title="Timings & Cancellation Policies" description="Set check-in/out SLA limits and cancellation definitions.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Standard Check-In Time</label>
                    <input
                      type="time"
                      required
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Standard Check-Out Time</label>
                    <input
                      type="time"
                      required
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Cancellation Policy Statement</label>
                    <textarea
                      rows={4}
                      required
                      value={cancelPolicy}
                      onChange={(e) => setCancelPolicy(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy resize-none"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-6 font-bold shadow-soft">
                    Save Policy Changes
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "payments" && (
            <Panel title="Payments & Booking Preferences" description="Configure merchant provider bindings and automation limits.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Payment Merchant Provider</label>
                    <select
                      value={paymentProvider}
                      onChange={(e) => setPaymentProvider(e.target.value)}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                    >
                      <option value="Razorpay">Razorpay Checkout API</option>
                      <option value="Stripe">Stripe GDS integration</option>
                      <option value="Paytm">Paytm Merchant SDK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Waitlist Max Capacity Limit</label>
                    <input
                      type="number"
                      required
                      value={waitlistLimit}
                      onChange={(e) => setWaitlistLimit(Number(e.target.value))}
                      className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-2.5 pt-2">
                    <input
                      type="checkbox"
                      id="autoAssign"
                      checked={autoAssign}
                      onChange={(e) => setAutoAssign(e.target.checked)}
                      className="rounded border-muted text-navy focus:ring-navy"
                    />
                    <label htmlFor="autoAssign" className="text-xs font-bold uppercase tracking-wider text-navy select-none">
                      Enable Auto Room Assignment on Confirmed bookings
                    </label>
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-6 font-bold shadow-soft">
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Panel>
          )}

          {activeSubTab === "notifications" && (
            <Panel title="Property Notification Alerts" description="Configure alert channels for managers and receptionist operators.">
              <div className="p-6 bg-white rounded-b-xl space-y-4">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="emailAlerts"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                      className="rounded border-muted text-navy focus:ring-navy"
                    />
                    <div>
                      <label htmlFor="emailAlerts" className="text-xs font-bold uppercase tracking-wider text-navy select-none">Email Notifications</label>
                      <p className="text-[10px] text-muted-foreground">Send daily ledger summaries and cancellation audits to manager email.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="smsAlerts"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="rounded border-muted text-navy focus:ring-navy"
                    />
                    <div>
                      <label htmlFor="smsAlerts" className="text-xs font-bold uppercase tracking-wider text-navy select-none">SMS Transaction Alerts</label>
                      <p className="text-[10px] text-muted-foreground">Dispatch transaction confirmation texts directly to guests (standard carrier rates apply).</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="parityAlerts"
                      checked={parityAlerts}
                      onChange={(e) => setParityAlerts(e.target.checked)}
                      className="rounded border-muted text-navy focus:ring-navy"
                    />
                    <div>
                      <label htmlFor="parityAlerts" className="text-xs font-bold uppercase tracking-wider text-navy select-none">OTA Sync Failure Warning</label>
                      <p className="text-[10px] text-muted-foreground">Enable high-priority console alerts if channel manager fails to sync rates within 2 minutes.</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-muted flex justify-end">
                  <Button type="submit" className="bg-navy hover:bg-navy-deep text-white text-xs h-9 px-6 font-bold shadow-soft">
                    Save Notification Prefs
                  </Button>
                </div>
              </div>
            </Panel>
          )}
        </form>

      </div>
    </div>
  );
}