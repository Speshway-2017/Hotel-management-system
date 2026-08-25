import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle, Plus, CreditCard
} from "lucide-react";

export const Route = createFileRoute("/reception/guest-search/$id")({
  head: () => ({
    meta: [
      { title: "Guest Details — Hour Stay" },
      { name: "description", content: "Guest occupancy parameters, timeline events and folio settings." }
    ]
  }),
  component: ReceptionGuestDetailsPage
});

import { receptionistService } from "@/services/receptionist";

function ReceptionGuestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(null);

  // Quick Action form inputs
  const [chargeAmount, setChargeAmount] = useState("");
  const [chargeDescription, setChargeDescription] = useState("Restaurant POS");
  const [extendDays, setExtendDays] = useState("1");

  const loadGuestDetails = () => {
    setLoading(true);
    receptionistService.getGuests()
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(g => g.id === id);
          if (found) {
            setGuest(found);
          } else {
            // fallback mock or alert
            console.warn("Guest not found in in-house list.");
          }
        }
      })
      .catch(err => console.error("Failed to load guest details:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGuestDetails();
  }, [id]);

  const handlePostCharge = () => {
    if (!chargeAmount || isNaN(chargeAmount) || Number(chargeAmount) <= 0) {
      alert("Please enter a valid numeric charge amount!");
      return;
    }
    const charge = Number(chargeAmount);
    receptionistService.postGuestCharge(guest.id, charge, chargeDescription)
      .then(res => {
        if (res.success) {
          alert(`Posted charge of ₹${charge.toLocaleString()} successfully to guest room account.`);
          setChargeAmount("");
          loadGuestDetails();
        }
      })
      .catch(err => {
        console.error("Failed to post charge:", err);
        alert(err.message || "Failed to post charge.");
      });
  };

  const handleExtendStay = () => {
    const days = parseInt(extendDays || "1");
    receptionistService.extendGuestStay(guest.id, days)
      .then(res => {
        if (res.success) {
          alert(`Stay extended by ${days} days successfully.`);
          loadGuestDetails();
        }
      })
      .catch(err => {
        console.error("Failed to extend stay:", err);
        alert(err.message || "Failed to extend stay.");
      });
  };

  if (loading || !guest) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading guest dossier...
      </div>
    );
  }

  const statusMeta = {
    Staying: { tone: "success", label: "In-House" },
    "Due Out Today": { tone: "warning", label: "Due Out Today" },
    "Extended Stay": { tone: "brand", label: "Extended Stay" }
  };

  const sM = statusMeta[guest.status] || statusMeta.Staying;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Top Navbar Header */}
      <PageHeader />

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left Column Details */}
        <div className="md:col-span-2 space-y-6">
          <Panel title="Occupancy Dossier Profile" description="Detailed in-house guest registration records and custom preferences.">
            <div className="p-6 space-y-5 text-xs font-semibold text-navy">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Guest Profile Name</p>
                  <p className="font-semibold text-sm text-navy">{guest.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Mobile Phone</p>
                  <p className="font-semibold text-sm text-navy">{guest.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Email Address</p>
                  <p className="font-semibold text-sm text-navy">{guest.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Occupied Room</p>
                  <p className="font-semibold text-sm text-indigo">Room #{guest.room} ({guest.roomType})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Stay Dates</p>
                  <p className="font-semibold text-sm text-navy">{guest.checkIn} - {guest.checkOut} ({guest.duration})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">pax Capacity</p>
                  <p className="font-semibold text-sm text-navy">{guest.pax}</p>
                </div>
              </div>

              <div className="bg-[#fafafa]/50 border border-muted p-4 rounded-xl space-y-1">
                <p className="text-muted-foreground uppercase text-[9px] font-bold">Special Requests / Alerts</p>
                <p className="text-xs text-navy font-semibold italic">"{guest.specialRequests || "None"}"</p>
              </div>

              {/* Guest Timeline logs */}
              <div className="space-y-3 pt-2 border-t border-muted/50">
                <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest block border-b border-muted/50 pb-1">Activity Timeline Logs</span>
                <div className="space-y-2.5 font-semibold">
                  {guest.timeline.map((log, idx) => (
                    <div key={idx} className="flex gap-3 text-[10px] leading-relaxed">
                      <span className="text-muted-foreground shrink-0">{log.time}</span>
                      <span className="text-navy">{log.action}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </Panel>
        </div>

        {/* Right Actions Column */}
        <div className="space-y-6">
          
          {/* Status Panel */}
          <Panel title="Status & Billing Summary" description="Overview stats.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy">
              <div className="space-y-3 border-b border-muted pb-3.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Guest Status:</span>
                  <Tag tone={sM.tone}>{sM.label}</Tag>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">VIP Tier Level:</span>
                  <Tag tone="brand">{guest.vipTier}</Tag>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Tag tone={guest.paymentStatus === "Paid" ? "success" : "warning"}>{guest.paymentStatus}</Tag>
                </div>
              </div>
              
              <div className="flex justify-between text-sm font-black text-navy-deep">
                <span className="uppercase text-[9px] text-muted-foreground">Folio Outstanding Balance:</span>
                <span className={guest.balance > 0 ? "text-rose-600 animate-pulse font-black" : "text-emerald-700"}>₹{guest.balance.toLocaleString()}</span>
              </div>
            </div>
          </Panel>

          {/* Incidentals posting */}
          <Panel title="Post Incidentals" description="Record restaurant POS dining charges.">
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Description</label>
                <select 
                  value={chargeDescription} 
                  onChange={(e) => setChargeDescription(e.target.value)}
                  className="w-full h-9 px-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer"
                >
                  <option value="Restaurant POS">Restaurant Room Service Dining</option>
                  <option value="Spa Services">Luxury Wellness Spa Services</option>
                  <option value="Laundry POS">Laundry service POS</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Amount to charge (₹)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="e.g. 500"
                    value={chargeAmount}
                    onChange={(e) => setChargeAmount(e.target.value)}
                    className="w-full h-9 px-2.5 border border-[#E7E9EE] bg-white rounded-xl text-xs font-bold text-navy focus:outline-none"
                  />
                  <Button 
                    onClick={handlePostCharge}
                    className="bg-navy hover:bg-navy-deep text-white h-9 rounded-xl text-xs font-bold cursor-pointer px-4"
                  >
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

          {/* Extensions stay */}
          <Panel title="Stay Extensions" description="Allot extra stay nights.">
            <div className="p-4 space-y-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-1">Stay Duration Extension (Nights)</label>
                <div className="flex gap-2">
                  <select 
                    value={extendDays} 
                    onChange={(e) => setExtendDays(e.target.value)}
                    className="px-2.5 h-9 border border-[#E7E9EE] bg-white rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-2/3"
                  >
                    <option value="1">1 Night stay extension</option>
                    <option value="2">2 Nights stays extension</option>
                    <option value="3">3 Nights stays extension</option>
                  </select>
                  <Button 
                    onClick={handleExtendStay}
                    className="bg-purple hover:bg-purple/90 text-white h-9 rounded-xl text-xs font-bold cursor-pointer w-1/3"
                  >
                    Extend
                  </Button>
                </div>
              </div>
            </div>
          </Panel>

        </div>

      </div>

    </div>
  );
}
