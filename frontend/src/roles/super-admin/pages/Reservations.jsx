import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Search, RefreshCw, Calendar, Bed, Users, Star } from "lucide-react";

const mockRooms = [
  { type: "Deluxe Suite", count: 45, occupied: 38, baseRate: 8500, taxRate: "18% GST" },
  { type: "Executive Club", count: 30, occupied: 22, baseRate: 11000, taxRate: "18% GST" },
  { type: "Courtyard Room", count: 60, occupied: 48, baseRate: 6500, taxRate: "12% GST" },
  { type: "Presidential Villa", count: 5, occupied: 2, baseRate: 25000, taxRate: "18% GST" }
];

const mockGuests = [
  { name: "Rahul Deshmukh", email: "rahul@gmail.com", phone: "+91 98765 43210", stays: 12, lastStay: "Rambagh Residency", tier: "Gold" },
  { name: "Priya Sen", email: "priya.sen@outlook.com", phone: "+91 99112 23344", stays: 8, lastStay: "Lake Palace View", tier: "Silver" },
  { name: "Amit Trivedi", email: "amit.t@yahoo.co.in", phone: "+91 98300 12345", stays: 24, lastStay: "Candolim Beach Resort", tier: "Platinum" }
];

const mockFeedback = [
  { guest: "Rahul Deshmukh", hotel: "Rambagh Residency", rating: 5, comment: "Exemplary heritage hospitality. Staff were incredibly attentive to room choices.", date: "12 Aug 2026" },
  { guest: "Priya Sen", hotel: "Lake Palace View", rating: 4, comment: "Spectacular sunset views over Pichola. Room service took slightly long.", date: "10 Aug 2026" },
  { guest: "Amit Trivedi", hotel: "Candolim Beach Resort", rating: 5, comment: "Fantastic beachfront vibes. Parity rates matched MMT exactly. Will return.", date: "09 Aug 2026" }
];

function SuperAdminReservations() {
  const [activeTab, setActiveTab] = useState("reservations"); // 'reservations' | 'rooms' | 'guests' | 'feedback'
  const [reservations, setReservations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, propertiesRes] = await Promise.all([
        superAdminService.getReservations(),
        superAdminService.getProperties()
      ]);

      if (bookingsRes.success && propertiesRes.success) {
        setReservations(bookingsRes.data);
        setProperties(propertiesRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load operations logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPropertyName = (pId) => {
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Hotel";
  };

  const filteredReservations = reservations.filter((r) => {
    const matchesSearch =
      r.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.phone && r.phone.includes(searchQuery));
    
    const matchesProperty = propertyFilter === "All" || r.propertyId === propertyFilter;
    return matchesSearch && matchesProperty;
  });

  const filteredGuests = mockGuests.filter((g) => {
    return (
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone.includes(searchQuery)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations Control"
        subtitle="Manage daily bookings, room inventory rates, guest histories, and reviews across properties."
        actions={
          <Button onClick={loadData} variant="outline" className="rounded-full gap-2 border-muted hover:bg-muted text-navy-deep">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh Ops
          </Button>
        }
      />

      {error && <Notice tone="error" title="Data Load Failure" className="text-left">{error}</Notice>}

      {/* Compact pill-shaped segmented tab bar */}
      <div className="flex justify-start mb-6">
        <div className="bg-white p-1 rounded-full border border-muted shadow-soft inline-flex items-center gap-1 overflow-x-auto max-w-full scrollbar-none">
          {[
            { label: "Reservations Ledger", key: "reservations", icon: Calendar },
            { label: "Rooms & Rates", key: "rooms", icon: Bed },
            { label: "Guest Directory", key: "guests", icon: Users },
            { label: "Feedback & Reviews", key: "feedback", icon: Star }
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-purple/10 text-purple border border-purple/15 shadow-sm font-bold"
                    : "text-muted-foreground hover:text-navy hover:bg-muted/40 border border-transparent"
                )}
              >
                {tab.icon && <tab.icon className={cn("size-3.5", active ? "text-purple" : "text-muted-foreground")} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "reservations" ? (
        <div className="space-y-4">
          {/* Filter toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative w-full sm:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search bookings by guest name, ID, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
            <div className="flex gap-2 items-center w-full sm:w-auto">
              <Label htmlFor="prop-filter" className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">Filter Property:</Label>
              <select
                id="prop-filter"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="bg-white border border-muted px-3 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple w-full sm:w-56"
              >
                <option value="All">All Hotels</option>
                {properties.map(p => (
                  <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Panel title="Active Booking Reservations" description={`Showing ${filteredReservations.length} records`}>
            {loading ? (
              <LoadingRows rows={5} />
            ) : filteredReservations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No bookings found matching filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Booking ID</th>
                      <th className="p-4">Guest Details</th>
                      <th className="p-4">Hotel Property</th>
                      <th className="p-4">Room & Stay Duration</th>
                      <th className="p-4">Source</th>
                      <th className="p-4 text-right">Net Value</th>
                      <th className="p-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {filteredReservations.map((r) => (
                      <tr key={r.id || r._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 font-semibold text-navy">{r.id}</td>
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-navy text-sm">{r.guest}</p>
                            <p className="text-muted-foreground text-xs">{r.phone}</p>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{getPropertyName(r.propertyId)}</td>
                        <td className="p-4 text-muted-foreground">
                          <p className="font-medium text-navy text-xs">{r.room}</p>
                          <p className="text-[10px]">{r.checkIn} → {r.checkOut}</p>
                        </td>
                        <td className="p-4">
                          <Tag tone="brand">{r.source}</Tag>
                        </td>
                        <td className="p-4 text-right font-bold text-navy font-mono">
                          ₹{(r.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right">
                          <Tag tone={statusTone(r.status)}>{r.status}</Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      ) : activeTab === "rooms" ? (
        <Panel title="Rooms Category & Pricing Guide" description="Tariff structure and keys counts.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4">Room Type</th>
                  <th className="p-4">Total Inventory</th>
                  <th className="p-4">Active Occupied</th>
                  <th className="p-4">Base Rate Tariff</th>
                  <th className="p-4">Tax Structure</th>
                  <th className="p-4 text-right">Estimated Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {mockRooms.map((room) => (
                  <tr key={room.type} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-semibold text-navy text-sm">{room.type}</td>
                    <td className="p-4 text-muted-foreground">{room.count} Keys</td>
                    <td className="p-4 text-muted-foreground">{room.occupied} Keys</td>
                    <td className="p-4 font-semibold text-navy">₹{room.baseRate.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-purple font-medium">{room.taxRate}</td>
                    <td className="p-4 text-right font-bold text-navy font-mono">₹{(room.occupied * room.baseRate).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : activeTab === "guests" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4 bg-card border rounded-xl p-4 shadow-soft">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search guest directory by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-full border-muted text-xs"
              />
            </div>
          </div>
          <Panel title="Guest Directory" description="Lifetime stay record indices.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Guest Name</th>
                    <th className="p-4">Email Address</th>
                    <th className="p-4">Phone Contact</th>
                    <th className="p-4">Total Stays</th>
                    <th className="p-4">Last Visited Hotel</th>
                    <th className="p-4 text-right">Loyalty Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {filteredGuests.map((g) => (
                    <tr key={g.name} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4 font-semibold text-navy text-sm">{g.name}</td>
                      <td className="p-4 text-muted-foreground">{g.email}</td>
                      <td className="p-4 text-muted-foreground font-mono">{g.phone}</td>
                      <td className="p-4 font-semibold text-navy">{g.stays} stays</td>
                      <td className="p-4 text-muted-foreground">{g.lastStay}</td>
                      <td className="p-4 text-right">
                        <Tag tone={g.tier === "Platinum" ? "brand" : g.tier === "Gold" ? "warning" : "info"}>{g.tier}</Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      ) : (
        <Panel title="Guest Feedback Index" description="Latest verified reviews and ratings.">
          <div className="p-4 space-y-4">
            {mockFeedback.map((f, i) => (
              <div key={i} className="p-4 border rounded-xl hover:bg-muted/10 transition-colors space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-navy text-sm">{f.guest}</h5>
                    <p className="text-muted-foreground text-xs">Hotel: <strong>{f.hotel}</strong> · Review Date: {f.date}</p>
                  </div>
                  <Tag tone={f.rating >= 4 ? "success" : "warning"}>{f.rating} / 5 Rating</Tag>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed italic">"{f.comment}"</p>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations & Booking Ledger — Hour Stay" },
      { name: "description", content: "Consolidated booking database across all active and onboarding hotel properties." },
      { property: "og:title", content: "Reservations & Booking Ledger — Hour Stay" },
      { property: "og:description", content: "Consolidated booking database across all active and onboarding hotel properties." }
    ]
  }),
  component: SuperAdminReservations
});