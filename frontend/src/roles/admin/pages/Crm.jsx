import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { managerService } from "@/services/manager";
import { toast } from "sonner";
import {
  Award, Search, Eye, Sparkles, DollarSign, TrendingUp, XCircle, Heart,
  Users, CheckCircle2, MessageSquareText, ShieldAlert, Award as AwardIcon, Gift,
  Star
} from "lucide-react";

export const Route = createFileRoute("/admin/crm")({
  head: () => ({
    meta: [
      { title: "CRM & Loyalty Directory — Speshway Luxury Hotel" },
      { name: "description", content: "Manage guest segments, loyalty tiers, member rewards points, and dining preferences." }
    ]
  }),
  component: AdminCrmPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-display text-base font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

const mockEngagementLogs = [
  { date: "Aug 16", guest: "Karan Malhotra", channel: "WhatsApp", message: "Sent Platinum anniversary coupon" },
  { date: "Aug 15", guest: "Aisha Sharma", channel: "Email", message: "Feedback invite dispatched post check-out" },
  { date: "Aug 12", guest: "Rohan Varma", channel: "SMS", message: "Pre-arrival room preference verification" }
];

function AdminCrmPage() {
  const [activeTab, setActiveTab] = useState("directory"); // "directory" or "feedback"
  const [reservations, setReservations] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Directory Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [segmentFilter, setSegmentFilter] = useState("all");

  // Feedback Filters
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState("all");

  // Selected Guest detail modal
  const [selectedGuest, setSelectedGuest] = useState(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [res, feedbackRes, propertiesRes] = await Promise.all([
        superAdminService.getReservations(),
        managerService.getFeedback(),
        superAdminService.getProperties()
      ]);
      setReservations(res.data || []);
      if (feedbackRes.success) {
        setFeedbackList(feedbackRes.data || []);
      }
      if (propertiesRes.success) {
        setProperties(propertiesRes.data || []);
      }
    } catch (err) {
      setError(err.message || "Failed to load CRM stay logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const getPropertyName = (pId) => {
    const found = properties.find(p => p._id === pId || p.id === pId);
    return found ? found.name : pId;
  };

  // Aggregation of guest loyalty stats from reservations
  const guestGroup = {};

  reservations.forEach((r) => {
    if (!r.guest) return;
    const name = r.guest;
    
    if (!guestGroup[name]) {
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
    let tier = "Bronze";
    let reward = "Welcome Drink";
    let pointsMultiplier = 1;
    let segment = "Leisure";

    if (stays >= 5) {
      tier = "Platinum";
      reward = "Complimentary Suite Upgrade, Spa Access";
      pointsMultiplier = 1.5;
      segment = "VIP";
    } else if (stays >= 3) {
      tier = "Gold";
      reward = "Complimentary Lounge Access, Late Check-Out";
      pointsMultiplier = 1.25;
      segment = "Corporate";
    } else if (stays === 2) {
      tier = "Silver";
      reward = "Premium Wi-Fi, Welcome Drink";
      pointsMultiplier = 1.1;
      segment = "Corporate";
    }

    const calculatedPoints = Math.round(profile.lifetimeSpend * 0.05 * pointsMultiplier);
    
    // Mapped preferences based on guest names
    let preferences = "High floor room";
    if (profile.name.includes("Aisha")) preferences = "Vegan meals, extra towels";
    if (profile.name.includes("Rohan")) preferences = "Early check-in, feather pillow";

    return {
      ...profile,
      tier,
      reward,
      segment,
      points: calculatedPoints,
      preferences
    };
  });

  // Filter application for loyalty
  const filteredProfiles = guestProfiles.filter(p => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s);

    const matchesTier = tierFilter === "all" || p.tier === tierFilter;
    const matchesSegment = segmentFilter === "all" || p.segment === segmentFilter;

    return matchesSearch && matchesTier && matchesSegment;
  });

  // Filter application for feedbacks
  const filteredFeedbacks = feedbackList.filter(f => {
    const s = feedbackSearch.toLowerCase();
    const matchesSearch =
      f.guestName.toLowerCase().includes(s) ||
      (f.comment || "").toLowerCase().includes(s);

    const overall = Math.round((f.ratings.cleanliness + f.ratings.service + f.ratings.room) / 3);
    let matchesRating = true;
    if (feedbackRatingFilter === "5") matchesRating = overall === 5;
    else if (feedbackRatingFilter === "4") matchesRating = overall >= 4;
    else if (feedbackRatingFilter === "3") matchesRating = overall >= 3;
    else if (feedbackRatingFilter === "less3") matchesRating = overall < 3;

    return matchesSearch && matchesRating;
  });

  // KPIs
  const totalMembers = guestProfiles.length;
  const platinumCount = guestProfiles.filter(p => p.tier === "Platinum").length;
  const totalLoyaltyPoints = guestProfiles.reduce((acc, curr) => acc + curr.points, 0);

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {error && <Notice tone="error" title="CRM Sync Fail">{error}</Notice>}

      {/* Tabs Switcher */}
      <div className="flex gap-2 border-b border-muted pb-px select-none">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-2 border-b-2 font-bold text-xs transition-all ${
            activeTab === "directory"
              ? "border-navy text-navy"
              : "border-transparent text-muted-foreground hover:text-navy"
          }`}
        >
          Loyalty Directory
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          className={`px-4 py-2 border-b-2 font-bold text-xs transition-all ${
            activeTab === "feedback"
              ? "border-navy text-navy"
              : "border-transparent text-muted-foreground hover:text-navy"
          }`}
        >
          Guest Feedback
        </button>
      </div>

      {loading ? (
        <LoadingRows rows={5} />
      ) : activeTab === "directory" ? (
        <>
          {/* KPI Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PremiumStatCard
              label="Total Loyalty Members"
              value={totalMembers.toString()}
              hint="Registered loyalty database"
              icon={Users}
              accentColor="#6366f1"
            />
            <PremiumStatCard
              label="Platinum Tier Members"
              value={platinumCount.toString()}
              hint="Top-tier VIP guest segment"
              icon={Award}
              accentColor="#10b981"
            />
            <PremiumStatCard
              label="Total Reward Points Issued"
              value={totalLoyaltyPoints.toLocaleString()}
              hint="Total accrued member points"
              icon={Sparkles}
              accentColor="#a855f7"
            />
            <PremiumStatCard
              label="Avg Rating Index"
              value="4.8 / 5.0"
              hint="Member guest feedback index"
              icon={Heart}
              accentColor="#ec4899"
            />
          </div>

          {/* Search & Filters */}
          <Panel title="CRM Directory Search Filters">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <FormField label="Search Guest Profile" id="search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    className="pl-9 h-10 text-xs font-bold"
                    placeholder="Name, email address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </FormField>

              <FormField label="Loyalty Tier Status" id="tier">
                <Select
                  id="tier"
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="h-10 text-xs font-bold"
                >
                  <option value="all">All Loyalty Tiers</option>
                  <option value="Platinum">Platinum Elite</option>
                  <option value="Gold">Gold Star</option>
                  <option value="Silver">Silver Member</option>
                  <option value="Bronze">Bronze Tier</option>
                </Select>
              </FormField>

              <FormField label="Guest Segment Class" id="segment">
                <Select
                  id="segment"
                  value={segmentFilter}
                  onChange={(e) => setSegmentFilter(e.target.value)}
                  className="h-10 text-xs font-bold"
                >
                  <option value="all">All Segments</option>
                  <option value="VIP">VIP Elite</option>
                  <option value="Corporate">Corporate Accounts</option>
                  <option value="Leisure">Leisure / Retail</option>
                </Select>
              </FormField>
            </div>
          </Panel>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main loyalty table */}
            <div className="lg:col-span-2 space-y-4">
              <Panel title="Loyalty Members Registry">
                {filteredProfiles.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground select-none">No loyalty profiles matched query filters.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[750px]">
                      <thead>
                        <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                          <th className="py-3 px-4 text-left">Loyalty Member</th>
                          <th className="py-3 px-4 text-left">Tier Level</th>
                          <th className="py-3 px-4 text-center font-bold">Stays Count</th>
                          <th className="py-3 px-4 text-right">Points Accrued</th>
                          <th className="py-3 px-4 text-left">Preferences / Custom Notes</th>
                          <th className="py-3 px-4 text-left">Segment</th>
                          <th className="py-3 px-4 text-center font-bold" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                        {filteredProfiles.map((p) => (
                          <tr key={p.name} className="hover:bg-muted/5">
                            <td className="py-3.5 px-4">
                              <div>
                                <p className="font-bold text-navy">{p.name}</p>
                                <p className="text-[10px] text-muted-foreground font-semibold">{p.email}</p>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-black">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                                p.tier === "Platinum" ? "bg-purple-100 text-purple-800" : p.tier === "Gold" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                              }`}>{p.tier}</span>
                            </td>
                            <td className="py-3.5 px-4 text-center font-mono font-bold text-navy">{p.totalStays} stays</td>
                            <td className="py-3.5 px-4 text-right font-black text-navy">{p.points.toLocaleString()} pts</td>
                            <td className="py-3.5 px-4 text-muted-foreground font-medium truncate max-w-[150px]">{p.preferences}</td>
                            <td className="py-3.5 px-4 font-semibold text-navy">{p.segment}</td>
                            <td className="py-3 px-4 text-center" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                              <Button
                                onClick={() => setSelectedGuest(p)}
                                variant="ghost"
                                className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 mx-auto flex items-center justify-center rounded-full"
                                title="View stays log"
                              >
                                <Eye className="size-4" />
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

            {/* Customer Engagement */}
            <div className="lg:col-span-1">
              <Panel title="Loyalty Engagement Dispatcher" description="Review recent guest campaigns.">
                <div className="p-4 space-y-4">
                  {mockEngagementLogs.map((log, idx) => (
                    <div key={idx} className="p-3 bg-[#fafafa]/50 border border-muted rounded-xl space-y-1.5 text-xs text-left">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                        <span>{log.date}</span>
                        <span className="bg-muted px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px]">{log.channel}</span>
                      </div>
                      <p className="font-bold text-navy mt-1">{log.guest}</p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">{log.message}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

          </div>
        </>
      ) : (
        <div className="space-y-6">
          <Panel title="Guest Feedback Search Filters">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <FormField label="Search Guest or Review Comments" id="feedbackSearch">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="feedbackSearch"
                    type="text"
                    className="pl-9 h-10 text-xs font-bold"
                    placeholder="Guest name, comment keywords..."
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                  />
                </div>
              </FormField>

              <FormField label="Filter by Rating" id="feedbackRating">
                <Select
                  id="feedbackRating"
                  value={feedbackRatingFilter}
                  onChange={(e) => setFeedbackRatingFilter(e.target.value)}
                  className="h-10 text-xs font-bold"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars only</option>
                  <option value="4">4 Stars & above</option>
                  <option value="3">3 Stars & above</option>
                  <option value="less3">Under 3 Stars</option>
                </Select>
              </FormField>
            </div>
          </Panel>

          <Panel title="Guest Reviews & Feedback Registry">
            {filteredFeedbacks.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground select-none">No guest reviews matched your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[850px]">
                  <thead>
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                      <th className="py-3 px-4 text-left">Guest Name</th>
                      <th className="py-3 px-4 text-left">Property Branch</th>
                      <th className="py-3 px-4 text-left">Cleanliness / Service / Room</th>
                      <th className="py-3 px-4 text-left">Feedback & Comments</th>
                      <th className="py-3 px-4 text-left">Submitted Date</th>
                      <th className="py-3 px-4 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                    {filteredFeedbacks.map((f) => {
                      const overall = Math.round((f.ratings.cleanliness + f.ratings.service + f.ratings.room) / 3);
                      return (
                        <tr key={f._id || f.id} className="hover:bg-muted/5">
                          <td className="py-3.5 px-4 font-bold text-navy">{f.guestName}</td>
                          <td className="py-3.5 px-4 font-semibold text-navy-deep">{getPropertyName(f.propertyId)}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 font-semibold">
                              <span className="font-bold text-navy flex items-center gap-0.5">
                                {overall} <Star className="size-3 text-amber-500 fill-amber-500" />
                              </span>
                              <span className="text-[10px] text-muted-foreground font-semibold">
                                ({f.ratings.cleanliness}/{f.ratings.service}/{f.ratings.room})
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-navy font-semibold whitespace-normal max-w-[300px]">
                            <p>{f.comment}</p>
                            {f.response && (
                              <div className="mt-1.5 p-2 bg-[#f0f9ff] border border-blue-100 rounded text-[11px] text-blue-800">
                                <span className="font-bold block">Response:</span>
                                {f.response}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-muted-foreground font-semibold">
                            {new Date(f.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-3.5 px-4">
                            <Tag tone={f.response ? "success" : "warning"}>
                              {f.response ? "Responded" : "Pending Response"}
                            </Tag>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Guest stay log modal */}
      {selectedGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Loyalty Profile: {selectedGuest.name}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">Tier Tiers: {selectedGuest.tier}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy"
                onClick={() => setSelectedGuest(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Member Details */}
            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 border border-muted rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Reward Balance</span>
                  <span className="font-black text-navy text-sm">{selectedGuest.points.toLocaleString()} Points</span>
                </div>
                <div className="p-3 bg-muted/20 border border-muted rounded-lg">
                  <span className="text-[10px] text-muted-foreground uppercase block font-bold">Stays Count</span>
                  <span className="font-black text-navy text-sm">{selectedGuest.totalStays} Stays</span>
                </div>
              </div>

              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-lg space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Preferences</p>
                <p className="text-navy font-bold">{selectedGuest.preferences}</p>
              </div>

              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-lg space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Active rewards privileges</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{selectedGuest.reward}</p>
              </div>

              {/* Stays History */}
              <div className="space-y-2 pt-2 border-t border-muted/50">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Stay History logs</p>
                <div className="max-h-[140px] overflow-y-auto space-y-2">
                  {selectedGuest.reservationsList.map((res, i) => (
                    <div key={i} className="flex justify-between items-center p-2 bg-[#fcfcfc] border border-muted rounded">
                      <div>
                        <p className="font-bold text-navy">Room #{res.room} • {res.checkIn}</p>
                        <p className="text-[10px] text-muted-foreground">Reference: {res.id}</p>
                      </div>
                      <span className="font-black text-navy">₹{(res.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedGuest(null)}
                className="h-8 px-4 text-xs rounded-full"
              >
                Close Profile
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
