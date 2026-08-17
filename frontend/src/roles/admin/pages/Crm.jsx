import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import {
  UserCog,
  Activity,
  Gift,
  Bell,
  Search,
  Award,
  Calendar,
  Sparkles,
  DollarSign,
  TrendingUp,
  XCircle,
  Eye,
  Info
} from "lucide-react";

const managementTabs = [
  { label: "Staff Management", to: "/admin/staff", icon: UserCog },
  { label: "OTA / Channels", to: "/admin/channels", icon: Activity },
  { label: "CRM / Loyalty", to: "/admin/crm", icon: Gift },
  { label: "Notifications", to: "/admin/notifications", icon: Bell }
];

export const Route = createFileRoute("/admin/crm")({
  head: () => ({
    meta: [
      { title: "CRM & Loyalty — Speshway Luxury Hotel" },
      { name: "description", content: "Review loyalty tier point distributions and guest stay records." }
    ]
  }),
  component: AdminCrmPage
});

function AdminCrmPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [staysFilter, setStaysFilter] = useState("all");

  // Details Modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getReservations();
      setReservations(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to load CRM stay logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Aggregation of guest loyalty stats from reservations
  const guestGroup = {};

  reservations.forEach((r) => {
    if (!r.guest) return;
    const name = r.guest;
    
    if (!guestGroup[name]) {
      // Find matching guest details or mock email/phone realistically
      const rawEmail = r.email || `${name.toLowerCase().replace(/\s+/g, "")}@example.com`;
      const rawPhone = r.phone || "+91 98765 43210";
      
      guestGroup[name] = {
        name,
        email: rawEmail,
        phone: rawPhone,
        totalStays: 0,
        lifetimeSpend: 0,
        lastStay: r.checkIn,
        reservationsList: []
      };
    }

    guestGroup[name].totalStays += 1;
    guestGroup[name].lifetimeSpend += r.amount || 0;
    guestGroup[name].reservationsList.push(r);
    if (r.checkIn > guestGroup[name].lastStay) {
      guestGroup[name].lastStay = r.checkIn;
    }
  });

  // Transform to loyalty profiles with tier scoring and points mapping
  const guestProfiles = Object.values(guestGroup).map((profile) => {
    const stays = profile.totalStays;
    let tier = "Member";
    let reward = "Welcome Drink";
    let pointsMultiplier = 1;

    if (stays >= 5) {
      tier = "Platinum";
      reward = "Complimentary Suite Upgrade, Spa Access, Executive Lounge Access";
      pointsMultiplier = 1.5;
    } else if (stays >= 3) {
      tier = "Gold";
      reward = "Complimentary Breakfast, Early Check-In/Late Check-Out";
      pointsMultiplier = 1.25;
    } else if (stays === 2) {
      tier = "Silver";
      reward = "Welcome Drink, Premium Wi-Fi";
      pointsMultiplier = 1.1;
    }

    const pointsEarned = Math.round(profile.lifetimeSpend * 0.1 * pointsMultiplier);
    const pointsRedeemed = stays > 1 ? (stays === 2 ? 200 : stays < 5 ? 500 : 1000) : 0;
    const loyaltyPoints = Math.max(0, pointsEarned - pointsRedeemed);

    return {
      ...profile,
      tier,
      loyaltyPoints,
      pointsEarned,
      pointsRedeemed,
      reward
    };
  });

  // Filter profiles
  const filteredProfiles = guestProfiles.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery);

    const matchesTier = tierFilter === "all" || p.tier === tierFilter;

    let matchesStays = true;
    if (staysFilter === "1") {
      matchesStays = p.totalStays === 1;
    } else if (staysFilter === "2-4") {
      matchesStays = p.totalStays >= 2 && p.totalStays <= 4;
    } else if (staysFilter === "5+") {
      matchesStays = p.totalStays >= 5;
    }

    return matchesSearch && matchesTier && matchesStays;
  });

  // Summary counts
  const platinumCount = guestProfiles.filter(p => p.tier === "Platinum").length;
  const goldCount = guestProfiles.filter(p => p.tier === "Gold").length;
  const silverCount = guestProfiles.filter(p => p.tier === "Silver").length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={managementTabs} />

      {error && <Notice tone="error" title="CRM Synchronization Error">{error}</Notice>}

      {/* Loyalty KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9b59b6]">Platinum Guests</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{platinumCount} VIPs</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Top-tier loyalty accounts</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5C06A]">Gold members</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{goldCount} Accounts</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Premium stay benefits active</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#3498db]">Silver Members</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{silverCount} Profiles</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Tier base points active</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Total Database</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{guestProfiles.length} Guests</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Unique guest CRM profiles</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by guest name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-muted rounded-lg text-sm bg-[#fafafa]/50 focus:outline-none focus:border-navy"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 border border-muted rounded-lg text-sm bg-white text-[#2a2a2a] focus:outline-none focus:border-navy"
          >
            <option value="all">All Tiers</option>
            <option value="Member">Member</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
          </select>

          <select
            value={staysFilter}
            onChange={(e) => setStaysFilter(e.target.value)}
            className="px-3 py-2 border border-muted rounded-lg text-sm bg-white text-[#2a2a2a] focus:outline-none focus:border-navy"
          >
            <option value="all">All Stays History</option>
            <option value="1">1 Stay Only</option>
            <option value="2-4">2-4 Stays</option>
            <option value="5+">5+ Stays</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        /* Guest Loyalty ledger table */
        <Panel title="Guest Loyalty & CRM Directory" description="Manage tier points, checkout counts, and custom rewards logs.">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-4 px-4">Guest Profile</th>
                  <th className="py-4 px-4 text-center">Loyalty Tier</th>
                  <th className="py-4 px-4 text-center">Total Stays</th>
                  <th className="py-4 px-4 text-right">Lifetime Spend</th>
                  <th className="py-4 px-4 text-right">Available Points</th>
                  <th className="py-4 px-4">Last Stay Date</th>
                  <th className="py-4 px-6 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-muted-foreground select-none">No guest profiles found matching active search criteria.</td>
                  </tr>
                ) : (
                  filteredProfiles.map((p) => {
                    // Styles Gold indicator using Gold #F5C06A for premium tier label
                    const isGold = p.tier === "Gold";
                    const isPlatinum = p.tier === "Platinum";

                    return (
                      <tr key={p.name} className="hover:bg-[#fcfcfc]/60">
                        <td className="py-4 px-4">
                          <div className="font-semibold text-navy text-xs">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{p.email} | {p.phone}</div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            style={isGold ? { backgroundColor: "#F5C06A", color: "#000000" } : {}}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase tracking-wider ${
                              isPlatinum
                                ? "bg-purple text-cream border border-purple/20"
                                : p.tier === "Silver"
                                ? "bg-sky-100 text-sky-700"
                                : isGold
                                ? "" // Custom gold styled inline
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {p.tier}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold">{p.totalStays} Stays</td>
                        <td className="py-4 px-4 text-right font-bold text-navy">₹{p.lifetimeSpend.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-black text-brand font-mono">{p.loyaltyPoints.toLocaleString()} pts</td>
                        <td className="py-4 px-4">{p.lastStay}</td>
                        <td className="py-4 px-6 text-right select-none w-24">
                          <Button
                            onClick={() => {
                              setSelectedGuest(p);
                              setIsDetailOpen(true);
                            }}
                            size="icon"
                            variant="ghost"
                            className="size-7 flex items-center justify-center"
                            aria-label="View Details"
                          >
                            <Eye className="size-3.5 text-navy" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Guest Loyalty details modal */}
      {isDetailOpen && selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col animate-scale-up">
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-semibold text-navy text-sm">Loyalty Profile Audit</h3>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setIsDetailOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4 text-xs text-navy">
              <div className="bg-muted/20 p-4 rounded-xl border border-muted space-y-2 flex items-center gap-3">
                <div
                  style={selectedGuest.tier === "Gold" ? { backgroundColor: "#F5C06A", color: "#000000" } : {}}
                  className={`grid size-10 place-items-center rounded-full font-bold text-sm select-none ${
                    selectedGuest.tier === "Platinum"
                      ? "bg-purple text-cream"
                      : selectedGuest.tier === "Silver"
                      ? "bg-sky-500 text-white"
                      : selectedGuest.tier === "Gold"
                      ? ""
                      : "bg-navy text-cream"
                  }`}
                >
                  {selectedGuest.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy-deep leading-none">{selectedGuest.name}</h4>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{selectedGuest.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Award className="size-3 text-purple" /> Loyalty Tier
                  </span>
                  <p className="font-semibold mt-0.5">{selectedGuest.tier}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                    <Sparkles className="size-3 text-purple" /> Points Balance
                  </span>
                  <p className="font-black text-brand text-right mt-0.5">{selectedGuest.loyaltyPoints.toLocaleString()} pts</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <Calendar className="size-3 text-purple" /> Stays count
                  </span>
                  <p className="font-semibold mt-0.5">{selectedGuest.totalStays} Stays</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1 justify-end">
                    <DollarSign className="size-3 text-purple" /> Lifetime Spend
                  </span>
                  <p className="font-semibold text-right mt-0.5">₹{selectedGuest.lifetimeSpend.toLocaleString()}</p>
                </div>
              </div>

              <div className="border-t border-muted pt-3 space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Points Activity</span>
                <div className="flex justify-between items-center text-[10px]">
                  <span>Points Earned:</span>
                  <span className="font-bold text-success">+{selectedGuest.pointsEarned} pts</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span>Points Redeemed:</span>
                  <span className="font-bold text-destructive">-{selectedGuest.pointsRedeemed} pts</span>
                </div>
              </div>

              <div className="border-t border-muted pt-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tier Rewards & Privileges</span>
                <p className="p-3 bg-[#fafafa]/50 border border-muted rounded mt-1.5 italic font-semibold leading-relaxed">
                  "{selectedGuest.reward}"
                </p>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end">
                <Button onClick={() => setIsDetailOpen(false)} className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-xs font-bold shadow-soft">
                  Close Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
