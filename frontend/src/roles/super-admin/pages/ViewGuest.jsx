import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, Phone, MapPin, 
  Calendar, ShieldCheck, Sparkles, Building2,
  FileText, History, CreditCard, ChevronRight
} from "lucide-react";
import { extractRoomNumber } from "@/utils/roomUtils";

export const Route = createFileRoute("/super-admin/users/view/$id")({
  head: () => ({
    meta: [
      { title: "Guest Details — Super Admin | Hour Stay" },
      { name: "description", content: "View verified guest profile credentials, contact information, and aggregated multi-property stay statistics." }
    ]
  }),
  component: ViewGuest
});

const formatAadhaar = (num) => {
  if (!num) return "—";
  const str = String(num).trim();
  const cleaned = str.replace(/\D/g, "");
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)}`;
  }
  return str || "—";
};

export function ViewGuest() {
  const params = useParams() || {};
  const id = params.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guest, setGuest] = useState(null);

  const loadGuestDetails = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [usersRes, bookingsRes, propertiesRes] = await Promise.all([
        superAdminService.getUsers().catch(() => ({})),
        superAdminService.getReservations().catch(() => ({})),
        superAdminService.getProperties().catch(() => ({}))
      ]);

      const usersList = usersRes.data || [];
      const bookingsList = bookingsRes.data || [];
      const propertiesList = propertiesRes.data || [];

      const getPropertyName = (propertyId) => {
        if (!propertyId || propertyId === "all") return "Multi-Property Guest";
        const prop = propertiesList.find((p) => p.id === propertyId || p._id === propertyId);
        return prop ? prop.name : "Assigned Hotel";
      };

      // Match user by ID or email
      const matchedUser = usersList.find((u) => u._id === id || u.id === id || u.email?.toLowerCase() === id?.toLowerCase());

      if (matchedUser) {
        const mName = String(matchedUser.name || "").toLowerCase().trim();
        const mPhone = String(matchedUser.mobile || matchedUser.phone || "").replace(/\D/g, "");
        const mEmail = String(matchedUser.email || "").toLowerCase().trim();

        const userBookings = bookingsList.filter(b => {
          const bGuest = String(b.guest || b.customerName || b.guestName || "").toLowerCase().trim();
          const bPhone = String(b.phone || b.mobile || "").replace(/\D/g, "");
          const bEmail = String(b.email || "").toLowerCase().trim();
          const bId = String(b._id || b.id || b.bookingId || "");

          return (
            (mName && bGuest && (bGuest === mName || bGuest.includes(mName) || mName.includes(bGuest))) ||
            (mPhone && bPhone && (bPhone === mPhone || bPhone.includes(mPhone) || mPhone.includes(bPhone))) ||
            (mEmail && bEmail && bEmail === mEmail) ||
            (id && bId === String(id))
          );
        });

        const sorted = [...userBookings].sort((x, y) => new Date(y.checkIn || y.createdAt || 0) - new Date(x.checkIn || x.createdAt || 0));
        const latest = sorted[0] || null;

        const realAadhaar = 
          matchedUser.verifiedAadhaar || 
          matchedUser.idDocNumber || 
          matchedUser.idProofNumber || 
          latest?.idDocNumber || 
          latest?.idProofNumber || 
          "";

        const isAadhaarVerified = Boolean(
          matchedUser.isAadhaarVerified || 
          matchedUser.verifiedAadhaar || 
          (latest?.idVerification === 'Verified' && realAadhaar)
        );

        const totalStays = userBookings.length;
        const totalRevenue = userBookings.reduce((sum, b) => sum + Number(b.amount || 0), 0);
        const totalBalance = userBookings.reduce((sum, b) => sum + Number(b.balance || 0), 0);

        setGuest({
          ...matchedUser,
          id: matchedUser._id || matchedUser.id,
          name: matchedUser.name || "Guest",
          email: matchedUser.email || "—",
          phone: matchedUser.mobile || matchedUser.phone || "—",
          status: matchedUser.status || "Active",
          role: matchedUser.role || "guest",
          type: matchedUser.type || "Regular",
          city: matchedUser.city || (latest?.city) || "Hyderabad",
          state: matchedUser.state || "Telangana",
          country: matchedUser.country || "India",
          joinedAt: matchedUser.createdAt || matchedUser.joinedAt || null,
          propertyId: matchedUser.propertyId,
          propertyName: getPropertyName(matchedUser.propertyId || latest?.propertyId),
          stays: totalStays,
          spend: totalRevenue,
          balance: totalBalance,
          idDocType: matchedUser.idDocType || "Aadhaar Card",
          idDocNumber: realAadhaar,
          isAadhaarVerified,
          latestStay: latest,
          history: userBookings.map(b => ({
            id: b._id || b.id || b.bookingId,
            property: getPropertyName(b.propertyId),
            checkIn: b.checkIn || "—",
            checkOut: b.checkOut || "—",
            room: extractRoomNumber(b) ? `Room ${extractRoomNumber(b)}` : (b.room || "Room 101"),
            amount: Number(b.amount || 0),
            status: b.status || 'Confirmed'
          })),
          billing: userBookings.map(b => ({
            invoiceId: `INV-${b.bookingId || b._id || b.id || '20101'}`,
            property: getPropertyName(b.propertyId),
            date: b.checkOut || b.checkIn || "Recent",
            amount: Number(b.amount || 0),
            status: Number(b.balance || 0) === 0 ? 'Paid' : 'Unpaid'
          }))
        });
        return;
      }

      setError("Guest account not found in directory.");
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load guest profile.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadGuestDetails(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadGuestDetails(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground select-none">Loading guest details...</div>;
  }

  if (error || !guest) {
    return (
      <div className="p-6 text-left">
        <Notice tone="error" title="Guest Sync Error">{error || "Failed to load guest data."}</Notice>
      </div>
    );
  }

  const initials = guest.name ? guest.name.split(" ").map(n => n[0]).join("") : "G";

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      {/* 1. Unified Guest Dossier & Contact Profile Card */}
      <div className="bg-white border border-muted rounded-2xl p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-navy/5 text-navy font-black text-xl grid place-items-center border border-navy/10 shrink-0 select-none">
              {initials}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display font-black text-navy text-xl sm:text-2xl tracking-tight leading-none">
                  {guest.name}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  guest.status === "Active" || guest.status === "Staying-In"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}>
                  {guest.status}
                </span>
                <span className="bg-purple/10 text-purple border border-purple/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                  {guest.type || "Regular"} Guest
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-muted-foreground/70 shrink-0" />
                <span>
                  {[guest.city, guest.state, guest.country].filter(Boolean).join(", ") || "India"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-center shrink-0 select-none">
            <Button
              variant="outline"
              className="h-9 px-4 text-xs font-bold border-muted text-navy rounded-xl hover:bg-muted/10 cursor-pointer"
              onClick={() => navigate({ to: "/super-admin/users" })}
            >
              Back to Guests
            </Button>
          </div>
        </div>

        {/* Contact Coordinates & Aadhaar Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t border-muted">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-navy/5 grid place-items-center text-navy shrink-0">
              <Mail className="size-4 text-purple" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Email Address</span>
              <p className="text-xs font-semibold text-navy truncate" title={guest.email}>{guest.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-navy/5 grid place-items-center text-navy shrink-0">
              <Phone className="size-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Phone Contact</span>
              <p className="text-xs font-semibold text-navy truncate">{guest.phone}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-navy/5 grid place-items-center text-navy shrink-0">
              <ShieldCheck className="size-4 text-purple" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Government ID (Aadhaar)</span>
                {guest.isAadhaarVerified ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-xs font-mono font-bold text-navy truncate">
                {formatAadhaar(guest.idDocNumber)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Operational Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Hotel Assignment</span>
              <Building2 className="size-4 text-purple" />
            </div>
            <p className="font-sans font-bold text-navy text-base mt-2 tracking-tight truncate">
              {guest.propertyName}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {guest.latestStay ? `Latest Stay: ${guest.latestStay.room || 'Room'} (${guest.latestStay.checkIn} → ${guest.latestStay.checkOut})` : "Central Portfolio Registry"}
            </p>
          </div>
          <div className="pt-3 mt-2 border-t border-muted/50 text-[10.5px] text-muted-foreground">
            Platform multi-hotel identifier
          </div>
        </div>

        <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifetime Visits</span>
              <span className="size-2 rounded-full bg-emerald-500/60" />
            </div>
            <p className="font-sans font-bold text-navy text-lg mt-2 tracking-tight tabular-nums">
              {guest.stays || 0} {Number(guest.stays) === 1 ? 'Stay' : 'Stays'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 tabular-nums">
              Lifetime Revenue: <span className="font-semibold text-slate-800">₹{(guest.spend || 0).toLocaleString()}</span>
            </p>
          </div>
          <div className="pt-3 mt-2 border-t border-muted/50 text-[10.5px] text-muted-foreground">
            Historical portfolio stay record
          </div>
        </div>

        <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Folio Balance</span>
              <span className={`size-2 rounded-full ${guest.balance > 0 ? "bg-rose-500/80" : "bg-emerald-500/80"}`} />
            </div>
            <p className={`font-sans font-bold text-lg mt-2 tracking-tight tabular-nums ${guest.balance > 0 ? "text-destructive" : "text-emerald-600"}`}>
              ₹{(guest.balance || 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {guest.balance > 0 ? "Unsettled stay ledger" : "All folios settled"}
            </p>
          </div>
          <div className="pt-3 mt-2 border-t border-muted/50 text-[10.5px] text-muted-foreground">
            {guest.balance > 0 ? "Pending payment collection" : "Zero outstanding balances"}
          </div>
        </div>
      </div>

      {/* 3. History Ledgers (Side-by-Side) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Stay History Panel */}
        <Panel title={`Stay History (${guest.history?.length || 0})`} description="Chronological record of past and active reservations.">
          <div className="p-0.5">
            {guest.history && guest.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-4 text-left">Stay Range</th>
                      <th className="py-2.5 px-3 text-left">Property</th>
                      <th className="py-2.5 px-3 text-left">Room</th>
                      <th className="py-2.5 px-3 text-left">Status</th>
                      <th className="py-2.5 px-4 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30">
                    {guest.history.map((hist, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-semibold text-navy text-left whitespace-nowrap">{hist.checkIn} → {hist.checkOut}</td>
                        <td className="py-3 px-3 text-muted-foreground text-left whitespace-nowrap truncate max-w-[120px]">{hist.property}</td>
                        <td className="py-3 px-3 font-bold text-purple text-left whitespace-nowrap">{hist.room}</td>
                        <td className="py-3 px-3 text-left whitespace-nowrap">
                          <Tag tone={hist.status === "Completed" || hist.status === "Checked-in" || hist.status === "Paid" ? "success" : "warning"}>{hist.status}</Tag>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-navy tabular-nums whitespace-nowrap">₹{Number(hist.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground italic">No stay records logged for this profile.</div>
            )}
          </div>
        </Panel>

        {/* Payment History Panel */}
        <Panel title={`Payment & Billing History (${guest.billing?.length || 0})`} description="Invoices, folios, and settlement transaction receipts.">
          <div className="p-0.5">
            {guest.billing && guest.billing.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[#fafafa] border-b border-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-4 text-left">Invoice ID</th>
                      <th className="py-2.5 px-3 text-left">Billing Date</th>
                      <th className="py-2.5 px-3 text-left">Status</th>
                      <th className="py-2.5 px-4 text-left">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30">
                    {guest.billing.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-navy text-left whitespace-nowrap">{inv.invoiceId}</td>
                        <td className="py-3 px-3 text-muted-foreground text-left whitespace-nowrap">{inv.date}</td>
                        <td className="py-3 px-3 text-left whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                            inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>{inv.status}</span>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-navy tabular-nums whitespace-nowrap">₹{Number(inv.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground italic">No payment history recorded for this profile.</div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default ViewGuest;
