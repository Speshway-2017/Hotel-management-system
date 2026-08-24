import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Crumbs, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  User, Mail, Phone, MapPin, Sparkles, Heart, Lock, Eye, EyeOff, 
  History, CreditCard, Award, FileText, ChevronRight, XCircle, Sliders
} from "lucide-react";

export const Route = createFileRoute("/admin/guests/view/$id")({
  head: () => ({
    meta: [
      { title: "Guest Details — Speshway Luxury Hotel" }
    ]
  }),
  component: ViewGuestPage
});

import { superAdminService } from "@/services/superAdmin";

function ViewGuestPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Secure ID passcode check
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState(false);
  const [isDocRevealed, setIsDocRevealed] = useState(false);

  useEffect(() => {
    const loadGuestDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getUsers();
        if (res.success && res.data) {
          const matched = res.data.find(g => g._id === id || g.id === id);
          if (matched) {
            // Map MERN keys to component expectations
            setGuest({
              ...matched,
              id: matched.id || matched._id,
              phone: matched.phone || matched.mobile || '—',
              stays: matched.stays || 0,
              spend: matched.spend || 0,
              currentStay: matched.currentStay || '—',
              status: matched.status || 'Active'
            });
          } else {
            setError("Guest record not found.");
          }
        } else {
          setError("Failed to retrieve guests.");
        }
      } catch (err) {
        setError(err.message || "Failed to load guest data.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadGuestDetail();
  }, [id]);

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

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground select-none">Loading guest details...</div>;
  }

  if (error || !guest) {
    return (
      <div className="p-6 text-left">
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Guests", to: "/admin/guests" },
          { label: "Not Found" }
        ]} />
        <div className="mt-6">
          <Notice tone="error" title="Dossier Sync Error">{error || "Failed to load guest data."}</Notice>
        </div>
      </div>
    );
  }

  const initials = guest.name.split(" ").map(n => n[0]).join("");

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="space-y-3.5">
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Guests", to: "/admin/guests" },
          { label: guest.name }
        ]} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title={`Guest Profile: ${guest.id}`}
            subtitle="Secure guest ledger profiles, regulatory documents, and stay summaries."
          />
          <div className="flex gap-2 select-none self-start sm:self-center">
            <Button
              variant="outline"
              className="h-9 px-4 text-xs font-bold border-muted text-navy rounded-full"
              onClick={() => navigate({ to: `/admin/guests/edit/${guest._id}` })}
            >
              Edit Profile
            </Button>
            <Button
              className="bg-navy hover:bg-navy-deep text-white h-9 px-4 text-xs font-bold rounded-full shadow-soft"
              onClick={() => navigate({ to: `/admin/reservations/add` })}
            >
              Create Reservation
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Summary Card, Contact Details, Preferences, Loyalty */}
        <div className="space-y-5 md:col-span-1">
          
          {/* Header Card */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full bg-navy/5 text-navy font-bold text-2xl select-none">
              {initials}
            </div>
            <div>
              <h3 className="font-display font-black text-navy text-lg">{guest.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{guest.city && `${guest.city}, `}{guest.state}</p>
            </div>
            <div className="pt-2 border-t border-muted/50 flex justify-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                guest.status === "Staying-In" ? "bg-success/15 text-success" : guest.status === "Expected" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
              }`}>{guest.status}</span>
              <span className="bg-purple/10 text-purple px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{guest.type} Member</span>
            </div>
          </div>

          {/* Contact Information */}
          <Panel title="Contact Details">
            <div className="p-4.5 space-y-3.5 text-xs text-navy">
              <div className="flex items-start gap-3">
                <Mail className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Email Address</span>
                  <p className="font-semibold mt-0.5 select-all">{guest.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Phone Connection</span>
                  <p className="font-semibold mt-0.5 select-all">{guest.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Postal Address</span>
                  <p className="font-semibold mt-0.5">{guest.address || "—"}, {guest.city}, {guest.state}, {guest.country}</p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Loyalty & Rewards */}
          <Panel title="Loyalty & Points">
            <div className="p-4.5 space-y-3 text-xs text-navy">
              <div className="flex items-center gap-2.5">
                <Award className="size-4.5 text-brand" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Loyalty Points</p>
                  <p className="font-black text-navy-deep text-sm">{guest.loyaltyPoints?.toLocaleString()} Points</p>
                </div>
              </div>
            </div>
          </Panel>

          {/* Secure ID Document */}
          <Panel title="Secure Identification">
            <div className="p-4.5 space-y-3">
              <div className="p-3 bg-muted/20 border border-muted rounded-lg flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="text-[9px] font-bold text-muted-foreground uppercase">{guest.idDocType}</div>
                  <div className="font-mono text-xs font-semibold tracking-wider text-navy mt-0.5">
                    {isDocRevealed ? guest.idDocNumber : "••••-••••-••••"}
                  </div>
                </div>
                {isDocRevealed ? (
                  <Button
                    onClick={() => setIsDocRevealed(false)}
                    size="icon"
                    variant="ghost"
                    className="size-8 text-muted-foreground hover:text-navy rounded-full"
                    aria-label="Hide ID"
                  >
                    <EyeOff className="size-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsPasscodeOpen(true)}
                    size="sm"
                    className="bg-navy hover:bg-navy-deep text-white shadow-soft shrink-0 text-[10px] px-2.5 h-8 font-bold rounded-full"
                  >
                    <Eye className="size-3.5 mr-1" /> Reveal
                  </Button>
                )}
              </div>
            </div>
          </Panel>

        </div>

        {/* Right Columns: Current Stay, Stay History, Preferences, Notes */}
        <div className="space-y-5 md:col-span-2">
          
          {/* Current Stay & Outstanding Folio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Current Allocation</span>
              <p className="font-black text-navy text-base">{guest.room !== "—" ? `Room #${guest.room}` : "No Active Room"}</p>
              <p className="text-[10.5px] text-muted-foreground">{guest.currentStay || "No active check-in staying"}</p>
            </div>
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Lifetime Visits</span>
              <p className="font-black text-navy text-base">{guest.stays || 0} Stays</p>
              <p className="text-[10.5px] text-muted-foreground">Lifetime Revenue: ₹{(guest.spend || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Outstanding Balance</span>
              <p className={`font-black text-base ${guest.balance > 0 ? "text-destructive" : "text-success"}`}>₹{(guest.balance || 0).toLocaleString()}</p>
              <p className="text-[10.5px] text-muted-foreground">Unsettled stays ledger</p>
            </div>
          </div>

          {/* Preferences Tags */}
          <Panel title="Guest Preferences">
            <div className="p-4.5 space-y-2">
              {guest.preferences && guest.preferences.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 select-none">
                  {guest.preferences.map((p, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 bg-muted/65 border border-muted/80 px-2.5 py-1 rounded-full text-xs font-semibold text-navy">
                      <Sparkles className="size-3 text-gold" /> {p}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No special preferences logged for this profile.</p>
              )}
            </div>
          </Panel>

          {/* Billing & Invoice History */}
          <Panel title="Billing & Payments Ledger">
            <div className="p-0.5">
              {guest.billing && guest.billing.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="py-2.5 px-4">Invoice ID</th>
                        <th className="py-2.5 px-4">Billing Date</th>
                        <th className="py-2.5 px-4">Invoice Status</th>
                        <th className="py-2.5 px-4 text-right">Invoice Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {guest.billing.map((inv, idx) => (
                        <tr key={idx} className="hover:bg-muted/5">
                          <td className="py-2.5 px-4 font-mono font-bold text-navy">{inv.invoiceId}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{inv.date}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                              inv.status === "Paid" ? "bg-success/15 text-success" : inv.status === "Partial" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                            }`}>{inv.status}</span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-navy">₹{inv.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-muted-foreground italic">No billing history recorded for this profile.</div>
              )}
            </div>
          </Panel>

          {/* Stay & Booking History */}
          <Panel title={`Historical Stays History (${guest.history?.length || 0})`}>
            <div className="p-0.5">
              {guest.history && guest.history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                        <th className="py-2.5 px-4">Stay Range</th>
                        <th className="py-2.5 px-4">Room No</th>
                        <th className="py-2.5 px-4">Stay Status</th>
                        <th className="py-2.5 px-4 text-right">Stay Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30">
                      {guest.history.map((hist, idx) => (
                        <tr key={idx} className="hover:bg-muted/5">
                          <td className="py-2.5 px-4 font-semibold text-navy">{hist.checkIn} → {hist.checkOut}</td>
                          <td className="py-2.5 px-4 font-bold">Room #{hist.room}</td>
                          <td className="py-2.5 px-4"><Tag tone={hist.status === "Completed" ? "success" : "warning"}>{hist.status}</Tag></td>
                          <td className="py-2.5 px-4 text-right font-bold text-navy">₹{hist.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-5 text-center text-xs text-muted-foreground italic">No stay records logged for this profile.</div>
              )}
            </div>
          </Panel>

          {/* Notes & Special Remarks */}
          <Panel title="Staff Notes & Remarks">
            <div className="p-4.5 space-y-3">
              {guest.notes ? (
                <p className="text-xs text-[#2a2a2a] leading-relaxed bg-[#fafafa]/50 border border-muted/50 p-3 rounded-lg">{guest.notes}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">No administrative remarks logged for this guest.</p>
              )}
            </div>
          </Panel>

        </div>

      </div>

      {/* Passcode Verification Security Modal */}
      {isPasscodeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-xs w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-semibold text-navy text-sm">Security Verification</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
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
                  className="h-8 px-3 text-xs rounded-full"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-xs font-bold rounded-full">
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
