import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  Bed,
  Users,
  ConciergeBell,
  Search,
  Lock,
  Eye,
  Award,
  Sparkles,
  Heart,
  History,
  XCircle,
  EyeOff,
  MessageSquareWarning,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users },
  { label: "Front Desk", to: "/admin/front-desk", icon: ConciergeBell }
];

export const Route = createFileRoute("/admin/guests")({
  head: () => ({
    meta: [
      { title: "Guests CRM — Speshway Luxury Hotel" },
      { name: "description", content: "Access property guest profiles, stay history, preferences, and secure ID documents." }
    ]
  }),
  component: GuestsCrmPage
});

// Mock guest CRM records with feedback/complaints logs
const initialGuests = [
  {
    id: "GST-1001",
    name: "Karan Malhotra",
    email: "karan.m@gmail.com",
    phone: "+91 98765 43210",
    city: "Mumbai, Maharashtra",
    tier: "Platinum",
    stays: 12,
    spend: 184500,
    preferences: ["High floor", "King size bed", "Extra feather pillows"],
    idDocType: "Passport",
    idDocNumber: "Z-8849502",
    feedback: [
      { stay: "Aug 2026", rating: 4, comment: "Beautiful heritage vibe, though room service was slightly delayed on day 2." }
    ],
    complaints: [
      { stay: "Aug 2026", issue: "AC Remote battery dead", status: "Resolved", details: "batteries replaced by staff within 10 mins." }
    ],
    history: [
      { checkIn: "2026-08-13", checkOut: "2026-08-15", room: "Suite Room 302", amount: 15400 }
    ]
  },
  {
    id: "GST-1002",
    name: "Aisha Sharma",
    email: "aisha.sharma@yahoo.com",
    phone: "+91 99112 23344",
    city: "Delhi, NCR",
    tier: "Gold",
    stays: 8,
    spend: 92400,
    preferences: ["Soft beverages only", "Late check-out"],
    idDocType: "Aadhaar Card",
    idDocNumber: "9820-1122-3344",
    feedback: [
      { stay: "Jul 2026", rating: 5, comment: "Superb check-in workflow! Love the pool villas." }
    ],
    complaints: [
      { stay: "Jul 2026", issue: "Requested non-alcoholic mini-fridge but found beer", status: "Resolved", details: "Cleaned and replaced immediately by F&B." }
    ],
    history: [
      { checkIn: "2026-08-13", checkOut: "2026-08-14", room: "Deluxe Room 104", amount: 8900 }
    ]
  },
  {
    id: "GST-1003",
    name: "Rohan Varma",
    email: "rohan.varma@outlook.com",
    phone: "+91 98300 12345",
    city: "Kolkata, West Bengal",
    tier: "Silver",
    stays: 4,
    spend: 44200,
    preferences: ["Newspaper in morning", "Near elevator"],
    idDocType: "PAN Card",
    idDocNumber: "ABCDE1234F",
    feedback: [
      { stay: "Jun 2026", rating: 3.5, comment: "Decent stay. WiFi was patchy near the courtyard." }
    ],
    complaints: [
      { stay: "Jun 2026", issue: "WiFi latency at peak hours", status: "Compensated", details: "Offered complimentary high-speed voucher for next stay." }
    ],
    history: [
      { checkIn: "2026-08-12", checkOut: "2026-08-14", room: "Executive Room 205", amount: 12500 }
    ]
  },
  {
    id: "GST-1004",
    name: "Meera Nair",
    email: "meera.nair@gmail.com",
    phone: "+91 97777 88888",
    city: "Bangalore, Karnataka",
    tier: "Platinum",
    stays: 16,
    spend: 215000,
    preferences: ["Airport pickup", "Vegetarian food only", "Silent room"],
    idDocType: "Passport",
    idDocNumber: "X-2244950",
    feedback: [
      { stay: "May 2026", rating: 5, comment: "Always my preferred hotel. Top hospitality." }
    ],
    complaints: [],
    history: [
      { checkIn: "2026-08-14", checkOut: "2026-08-17", room: "Villa Suite 101", amount: 4500 }
    ]
  }
];

function GuestsCrmPage() {
  const [guestsList, setGuestsList] = useState(initialGuests);
  const [selectedGuest, setSelectedGuest] = useState(initialGuests[0]);
  const [searchQuery, setSearchQuery] = useState("");

  // Secure ID document passcode states
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [isDocRevealed, setIsDocRevealed] = useState(false);

  function handleVerifyPasscode(e) {
    e.preventDefault();
    if (passcode === "admin123") {
      setIsDocRevealed(true);
      setIsPasscodeOpen(false);
      setPasscode("");
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  }

  const filteredGuests = guestsList.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={operationsTabs} />

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: Guests listing */}
        <div className="md:col-span-1 bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col space-y-4 max-h-[750px] overflow-hidden">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guests by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-muted rounded-lg text-xs bg-[#fafafa]/50 focus:outline-none focus:border-navy"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredGuests.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No guest profiles found.</p>
            ) : (
              filteredGuests.map((g) => {
                const isSelected = selectedGuest?.id === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGuest(g);
                      setIsDocRevealed(false); // Relock secure ID document when switching guests
                    }}
                    className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "border-navy bg-navy/5 shadow-sm"
                        : "border-muted hover:border-navy/40 hover:bg-muted/15"
                    }`}
                  >
                    <div className="min-w-0">
                      <h4 className="font-semibold text-navy text-sm truncate">{g.name}</h4>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">{g.email}</p>
                      <p className="text-[10px] text-muted-foreground/85 mt-1">{g.city}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        g.tier === "Platinum"
                          ? "bg-[#9b59b6]/10 text-[#9b59b6]"
                          : g.tier === "Gold"
                          ? "bg-gold/15 text-[#b8860b]"
                          : "bg-muted text-navy"
                      }`}
                    >
                      {g.tier}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right columns: Guest profile details panel */}
        {selectedGuest ? (
          <div className="md:col-span-2 space-y-5">
            
            {/* Top overview card */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-full bg-navy/5 text-navy font-bold text-lg select-none">
                  {selectedGuest.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-display font-black text-navy text-lg">{selectedGuest.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedGuest.phone} · {selectedGuest.email}</p>
                </div>
              </div>

              {/* Loyalty Tier Status */}
              <div className="p-3 bg-muted/30 border border-muted rounded-xl flex items-center gap-2.5 sm:self-center shrink-0">
                <span className="grid size-8 place-items-center rounded-lg bg-navy/10 text-navy">
                  <Award className="size-4.5" />
                </span>
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Loyalty Status Tier</div>
                  <div className="text-xs font-black text-navy-deep">{selectedGuest.tier} Member ({selectedGuest.stays * 100} Points)</div>
                </div>
              </div>
            </div>

            {/* Middle split: Preferences & Secure ID Check */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Preferences */}
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-muted">
                  <Heart className="size-4 text-brand" />
                  <h4 className="font-semibold text-navy text-sm">Guest Preferences</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedGuest.preferences.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted/65 border border-muted/80 px-2.5 py-1 text-xs font-semibold text-navy">
                      <Sparkles className="size-3 text-gold" /> {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Secure ID documents checking */}
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-muted">
                  <Lock className="size-4 text-navy" />
                  <h4 className="font-semibold text-navy text-sm">Restricted ID Document</h4>
                </div>

                <div className="p-3.5 bg-[#fafafa]/50 border border-muted rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">{selectedGuest.idDocType}</div>
                    <div className="font-mono text-sm font-semibold tracking-wider text-navy mt-0.5">
                      {isDocRevealed ? selectedGuest.idDocNumber : "••••-••••-••••"}
                    </div>
                  </div>
                  
                  {isDocRevealed ? (
                    <Button
                      onClick={() => setIsDocRevealed(false)}
                      size="icon"
                      variant="ghost"
                      className="size-9 text-muted-foreground hover:text-navy"
                      aria-label="Hide ID"
                    >
                      <EyeOff className="size-4.5" />
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setIsPasscodeOpen(true)}
                      size="sm"
                      className="bg-navy hover:bg-navy-deep text-white shadow-soft shrink-0 text-xs px-3 h-8.5"
                    >
                      <Eye className="size-3.5 mr-1" /> Reveal
                    </Button>
                  )}
                </div>
              </div>

            </div>

            {/* Stay Incidents: Feedback & Operational Complaints Log */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <MessageSquareWarning className="size-4.5 text-warning" />
                <h4 className="font-semibold text-navy text-sm">Feedback & Complaints History</h4>
              </div>

              <div className="space-y-3">
                {/* Render Feedback rating comments */}
                {selectedGuest.feedback?.map((f, i) => (
                  <div key={i} className="p-3 rounded-lg border border-[#e2e8f0] bg-[#fafafa]/45 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-navy">Rating: {f.rating}/5 ({f.stay})</span>
                      <span className="text-muted-foreground text-[10px]">Guest Review</span>
                    </div>
                    <p className="text-xs text-[#2a2a2a] italic">"{f.comment}"</p>
                  </div>
                ))}

                {/* Render Complaints log */}
                {selectedGuest.complaints && selectedGuest.complaints.length > 0 ? (
                  selectedGuest.complaints.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg border border-[#fdd6d6] bg-[#fff5f5]/65 flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="size-3.5 text-destructive" />
                          <h5 className="font-semibold text-xs text-navy">{c.issue} ({c.stay})</h5>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Resolution: {c.details}</p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        c.status === "Resolved"
                          ? "bg-success/10 text-success border border-success/20"
                          : "bg-brand/10 text-brand border border-brand/20"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic pl-1.5 select-none">No active or resolved complaints logged for this guest profile.</p>
                )}
              </div>
            </div>

            {/* Bottom Section: Stay History list */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <History className="size-4 text-[#9b59b6]" />
                <h4 className="font-semibold text-navy text-sm">Historical Stays ({selectedGuest.history.length})</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="py-2.5 px-3">Stay Date Range</th>
                      <th className="py-2.5 px-3">Room Assigned</th>
                      <th className="py-2.5 px-3 text-right">Revenue spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
                    {selectedGuest.history.map((hist, i) => (
                      <tr key={i} className="hover:bg-[#fcfcfc]">
                        <td className="py-3 px-3 font-semibold text-navy">{hist.checkIn} → {hist.checkOut}</td>
                        <td className="py-3 px-3">{hist.room}</td>
                        <td className="py-3 px-3 text-right font-bold text-navy">₹{hist.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#fcfcfc] font-bold text-navy">
                      <td colSpan="2" className="py-3 px-3 text-right">Lifetime spend:</td>
                      <td className="py-3 px-3 text-right text-brand">₹{selectedGuest.spend.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          <div className="md:col-span-2 bg-white border border-muted rounded-xl p-16 shadow-soft text-center grid place-items-center">
            <Users className="size-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select a guest from the panel to view stay records, preferences and CRM metrics.</p>
          </div>
        )}
      </div>

      {/* Restricted Passcode Prompt Modal */}
      {isPasscodeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-xs w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-semibold text-navy text-sm">Security Verification</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => {
                  setIsPasscodeOpen(false);
                  setPasscode("");
                  setPasscodeError(false);
                }}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleVerifyPasscode} className="p-5 space-y-3.5">
              <p className="text-[11px] text-muted-foreground">Viewing sensitive guest documentation requires security authorization. Enter administrator passcode:</p>
              
              <div>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode (admin123)"
                  className="w-full px-3.5 py-2 border border-muted rounded-lg text-sm bg-[#fafafa]/50 focus:outline-none focus:border-navy"
                />
                {passcodeError && (
                  <p className="text-[10px] text-destructive font-bold mt-1.5">Incorrect passcode. Access Denied.</p>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsPasscodeOpen(false);
                    setPasscode("");
                    setPasscodeError(false);
                  }}
                  className="h-8 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-xs">
                  Verify Credentials
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}