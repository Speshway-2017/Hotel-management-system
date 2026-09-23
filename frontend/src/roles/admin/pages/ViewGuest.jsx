import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  User, Mail, Phone, MapPin, Sparkles, Heart,
  History, CreditCard, Award, FileText, ChevronRight, Sliders, Calendar
} from "lucide-react";
import { superAdminService } from "@/services/superAdmin";
import { managerService } from "@/services/manager";
import { subscribeRealtimeSync } from "@/services/socket";
import { extractRoomNumber } from "@/utils/roomUtils";

export const Route = createFileRoute("/admin/guests/view/$id")({
  head: () => ({
    meta: [
      { title: "Guest Details — Speshway Luxury Hotel" }
    ]
  }),
  component: ViewGuestPage
});

// Utility helpers for date and aadhaar handling
const formatAadhaar = (num) => {
  if (!num) return "—";
  const str = String(num).trim();
  const cleaned = str.replace(/\D/g, "");
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)}`;
  }
  return str || "—";
};

const formatDateToYYYYMMDD = (dateStr) => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateToString = (date) => {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getAdditionalNights = (currentOutStr, newOutStr) => {
  const currentOut = new Date(currentOutStr);
  const newOut = new Date(newOutStr);
  if (isNaN(currentOut.getTime()) || isNaN(newOut.getTime())) return 0;
  const diffTime = newOut - currentOut;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

function ViewGuestPage() {
  let routeId = null;
  try {
    const params = Route.useParams();
    routeId = params?.id;
  } catch (e) {}

  const navigate = useNavigate();

  // Extract ID from route params, query string (?id=... or ?guest=...), or path segment
  const getTargetId = () => {
    if (routeId && routeId !== 'undefined' && routeId !== '$id') return routeId;
    try {
      const sp = new URLSearchParams(window.location.search);
      const qId = sp.get('id') || sp.get('guest');
      if (qId) return qId;
      const parts = window.location.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last !== 'view' && last !== 'guests') return last;
    } catch (e) {}
    return null;
  };

  const activeId = getTargetId();
  const [guest, setGuest] = useState(null);
  const [allGuests, setAllGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleNavigateExtend = (b) => {
    const bookingId = b?.bookingId || b?._id || b?.id || guest?._id;
    navigate({ to: `/admin/reservations/extend/${bookingId}` });
  };

  const loadGuestDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [usersRes, resRes] = await Promise.all([
        superAdminService.getUsers().catch(() => ({ success: true, data: [] })),
        superAdminService.getReservations().catch(() => ({ success: true, data: [] }))
      ]);

      const users = usersRes?.success && Array.isArray(usersRes.data) ? usersRes.data : [];
      const bookings = resRes?.success && Array.isArray(resRes.data) ? resRes.data : [];

      const guestUsers = users.filter(u => u.role === 'guest' || (!u.role && u.name));
      setAllGuests(guestUsers.length > 0 ? guestUsers : users);

      let matched = null;
      if (activeId) {
        matched = users.find(g => 
          String(g._id) === String(activeId) || 
          String(g.id) === String(activeId) ||
          String(g.mobile) === String(activeId) ||
          String(g.phone) === String(activeId) ||
          String(g.email).toLowerCase() === String(activeId).toLowerCase() ||
          String(g.name).toLowerCase() === String(activeId).toLowerCase()
        );

        // If not in users list, find in bookings dataset
        if (!matched) {
          const matchedBooking = bookings.find(b => 
            String(b._id) === String(activeId) || 
            String(b.id) === String(activeId) || 
            String(b.bookingId) === String(activeId) ||
            String(b.guestId) === String(activeId) ||
            String(b.phone) === String(activeId) ||
            String(b.guest).toLowerCase() === String(activeId).toLowerCase()
          );

          if (matchedBooking) {
            matched = {
              _id: matchedBooking.guestId || matchedBooking._id || activeId,
              id: matchedBooking.guestId || matchedBooking.bookingId || activeId,
              name: matchedBooking.guest || matchedBooking.guestName || "Guest",
              phone: matchedBooking.phone || "—",
              mobile: matchedBooking.phone || "—",
              email: matchedBooking.email || `${String(matchedBooking.guest || 'guest').toLowerCase().replace(/\s+/g, '')}@gmail.com`,
              role: "guest",
              status: "Active",
              city: matchedBooking.city || "Hyderabad",
              state: "Telangana",
              vipTier: "Gold Elite",
              idDocType: matchedBooking.idDocType || matchedBooking.idProofType || "Aadhaar Card",
              idDocNumber: matchedBooking.idDocNumber || matchedBooking.idProofNumber || matchedBooking.idNumber || "",
              createdAt: matchedBooking.createdAt || new Date()
            };
          }
        }
      }

      // If no ID or no match, automatically load the first active checked-in guest or first registered guest
      if (!matched) {
        const activeBooking = bookings.find(b => b.status === 'Checked-in' || b.status === 'Staying');
        if (activeBooking) {
          matched = users.find(u => 
            (u.email && activeBooking.email && u.email.toLowerCase() === activeBooking.email.toLowerCase()) ||
            (u.name && activeBooking.guest && u.name.toLowerCase() === activeBooking.guest.toLowerCase()) ||
            (u._id && activeBooking.guestId && String(u._id) === String(activeBooking.guestId))
          );
          if (!matched) {
            matched = {
              _id: activeBooking.guestId || activeBooking._id,
              id: activeBooking.guestId || activeBooking.bookingId,
              name: activeBooking.guest || activeBooking.guestName || "Guest",
              phone: activeBooking.phone || "—",
              mobile: activeBooking.phone || "—",
              email: activeBooking.email || "guest@gmail.com",
              role: "guest",
              status: "Active",
              city: activeBooking.city || "Hyderabad",
              state: "Telangana",
              vipTier: "Gold Elite",
              idDocType: activeBooking.idDocType || activeBooking.idProofType || "Aadhaar Card",
              idDocNumber: activeBooking.idDocNumber || activeBooking.idProofNumber || "",
              createdAt: activeBooking.createdAt || new Date()
            };
          }
        } else if (guestUsers.length > 0) {
          matched = guestUsers[0];
        } else if (users.length > 0) {
          matched = users[0];
        }
      }

      if (matched) {
        const mName = String(matched.name || "").toLowerCase().trim();
        const mPhone = String(matched.mobile || matched.phone || "").replace(/\D/g, "");
        const mEmail = String(matched.email || "").toLowerCase().trim();

        const guestBookings = bookings.filter(b => {
          const bGuest = String(b.guest || b.customerName || b.guestName || "").toLowerCase().trim();
          const bPhone = String(b.phone || b.mobile || "").replace(/\D/g, "");
          const bEmail = String(b.email || "").toLowerCase().trim();
          const bId = String(b._id || b.id || b.bookingId || b.guestId || "");

          return (
            (mName && bGuest && (bGuest === mName || bGuest.includes(mName) || mName.includes(bGuest))) ||
            (mPhone && bPhone && (bPhone === mPhone || bPhone.includes(mPhone) || mPhone.includes(bPhone))) ||
            (mEmail && bEmail && bEmail === mEmail) ||
            (activeId && bId === String(activeId))
          );
        });

        const sorted = [...guestBookings].sort((x, y) => new Date(y.checkIn || y.createdAt || 0) - new Date(x.checkIn || x.createdAt || 0));
        let latest = sorted[0];

        // If no specific booking found for user, link active stay
        if (!latest && bookings.length > 0) {
          latest = bookings.find(b => String(b.guest || b.customerName || "").toLowerCase().includes(mName.toLowerCase())) || bookings[0];
        }

        const rNum = extractRoomNumber(latest) || (latest?.roomNumber) || "";
        const rType = latest?.roomType || (latest?.room && String(latest.room).includes("·") ? String(latest.room).split("·")[1]?.trim() : (rNum.startsWith('5') ? 'Penthouse Suite' : rNum.startsWith('3') ? 'Executive Suite' : rNum.startsWith('2') ? 'Deluxe Room' : 'Standard Room'));
        const roomDisplay = rNum ? `Room ${rNum}` : 'Unassigned';
        const roomFullDisplay = rNum ? `${roomDisplay} · ${rType}` : rType;

        const validHistory = guestBookings.length > 0 ? guestBookings : (latest ? [latest] : []);

        const realAadhaar = 
          matched.verifiedAadhaar || 
          matched.idDocNumber || 
          matched.idProofNumber || 
          latest?.idDocNumber || 
          latest?.idProofNumber || 
          "";

        const isAadhaarVerified = Boolean(
          matched.isAadhaarVerified || 
          matched.verifiedAadhaar || 
          (latest?.idVerification === 'Verified' && realAadhaar)
        );
        
        setGuest({
          ...matched,
          id: matched.id || matched._id,
          phone: matched.phone || matched.mobile || "—",
          stays: validHistory.length || 1,
          spend: validHistory.reduce((sum, b) => sum + Number(b.amount || b.totalAmount || 0), 0) || Number(latest?.amount || 4500),
          balance: validHistory.reduce((sum, b) => sum + Number(b.balance || 0), 0) || Number(latest?.balance || 0),
          currentStay: latest ? `${roomFullDisplay} (${latest.checkIn || 'Today'} → ${latest.checkOut || 'Tomorrow'})` : roomFullDisplay,
          room: roomDisplay,
          roomNumber: rNum,
          roomType: rType,
          status: latest ? (latest.status === 'Checked-in' || latest.status === 'Staying' ? 'Staying-In' : latest.status === 'Confirmed' ? 'Expected' : 'Checked-out') : 'Staying-In',
          idDocType: matched.idDocType || matched.idType || latest?.idDocType || latest?.idProofType || "Aadhaar Card",
          idDocNumber: realAadhaar,
          isAadhaarVerified,
          history: validHistory.map(b => ({
            id: b._id || b.id || b.bookingId,
            checkIn: b.checkIn || "Today",
            checkOut: b.checkOut || "Tomorrow",
            room: extractRoomNumber(b) ? `Room ${extractRoomNumber(b)}` : (b.room || roomDisplay),
            roomNumber: extractRoomNumber(b) || b.roomNumber,
            amount: Number(b.amount || b.totalAmount || 4500),
            status: b.status || 'Checked-in',
            balance: Number(b.balance || 0)
          })),
          billing: validHistory.map(b => ({
            invoiceId: `INV-${b.bookingId || b._id || b.id || '20101'}`,
            amount: Number(b.amount || b.totalAmount || 4500),
            date: b.checkOut || "Tomorrow",
            status: Number(b.balance || 0) === 0 ? 'Paid' : 'Unpaid'
          })),
          latestStay: latest
        });
      } else if (!isSilent) {
        setError("Guest record not found.");
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load guest data.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadGuestDetail();
    const unsubscribe = subscribeRealtimeSync(() => {
      loadGuestDetail(true);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeId]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-muted-foreground select-none">Loading guest details...</div>;
  }

  if (error || !guest) {
    return (
      <div className="p-6 text-left">
        <div className="mt-6">
          <Notice tone="error" title="Guest Sync Error">{error || "Failed to load guest data."}</Notice>
        </div>
      </div>
    );
  }

  const initials = guest.name ? guest.name.split(" ").map(n => n[0]).join("") : "G";

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      {/* Top Page Header with Guest Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Guest Details"
        />
        <div className="flex gap-2 select-none self-start sm:self-center">
          <Button
            variant="outline"
            className="h-9 px-4 text-xs font-bold border-muted text-navy rounded-full"
            onClick={() => navigate({ to: `/admin/guests/edit/${guest._id || guest.id}` })}
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

      {/* Top Profile and Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Summary Card and Contact Details (with visible Aadhaar Card) */}
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
              <span className="bg-purple/10 text-purple px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">{guest.type || "Regular"} Member</span>
            </div>
          </div>

          {/* Contact Details Panel with Aadhaar Card moved here, visible unmasked number, verified badge */}
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
              <div className="flex items-start gap-3 pt-2 border-t border-muted/50">
                <CreditCard className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      {guest.idDocType || "Aadhaar Card"}
                    </span>
                    {guest.isAadhaarVerified && (
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Verified ✓
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs font-bold text-navy mt-0.5 select-all tracking-wide">
                    {formatAadhaar(guest.idDocNumber)}
                  </p>
                </div>
              </div>
            </div>
          </Panel>

        </div>

        {/* Right Columns: Current Stay Allocation, Lifetime Visits, Balance, Preferences, Staff Remarks */}
        <div className="space-y-5 md:col-span-2">
          
          {/* Current Stay & Outstanding Folio */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft text-left space-y-2 animate-fade-in">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Current Allocation</span>
              <p className="font-black text-navy text-base">
                {guest.roomNumber ? `Room ${guest.roomNumber}` : (extractRoomNumber(guest.room) ? `Room ${extractRoomNumber(guest.room)}` : (guest.room || "Unassigned"))}
              </p>
              <p className="text-[10.5px] text-muted-foreground">
                {guest.currentStay || (guest.latestStay ? `${guest.room || 'Room'} (${guest.latestStay.checkIn} → ${guest.latestStay.checkOut})` : "No active stay")}
              </p>
              {guest.latestStay && (guest.latestStay.status === "Checked-in" || guest.latestStay.status === "Staying" || guest.status === "Staying-In") && (
                <button
                  onClick={() => handleNavigateExtend(guest.latestStay)}
                  className="inline-flex items-center gap-1 text-[11px] text-brand hover:underline font-bold mt-2 cursor-pointer"
                >
                  Extend Stay →
                </button>
              )}
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

      {/* Side-by-Side Tables: Payment History and Stay History with consistent column alignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Payment History Table */}
        <Panel title="Payment History">
          <div className="p-0.5">
            {guest.billing && guest.billing.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                      <th className="py-2.5 px-4 text-left">Invoice ID</th>
                      <th className="py-2.5 px-4 text-left">Billing Date</th>
                      <th className="py-2.5 px-4 text-left">Invoice Status</th>
                      <th className="py-2.5 px-4 text-left">Invoice Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30">
                    {guest.billing.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-muted/5">
                        <td className="py-3 px-4 font-mono font-bold text-navy text-left">{inv.invoiceId}</td>
                        <td className="py-3 px-4 text-muted-foreground text-left">{inv.date}</td>
                        <td className="py-3 px-4 text-left">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                            inv.status === "Paid" ? "bg-success/15 text-success" : inv.status === "Partial" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                          }`}>{inv.status}</span>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-navy">₹{Number(inv.amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5 text-center text-xs text-muted-foreground italic">No payment history recorded for this profile.</div>
            )}
          </div>
        </Panel>

        {/* Stay History Table */}
        <Panel title={`Stay History (${guest.history?.length || 0})`}>
          <div className="p-0.5">
            {guest.history && guest.history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase">
                      <th className="py-2.5 px-4 text-left">Stay Range</th>
                      <th className="py-2.5 px-4 text-left">Room No</th>
                      <th className="py-2.5 px-4 text-left">Stay Status</th>
                      <th className="py-2.5 px-4 text-left">Stay Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30">
                    {guest.history.map((hist, idx) => (
                      <tr key={idx} className="hover:bg-muted/5">
                        <td className="py-3 px-4 font-semibold text-navy text-left">{hist.checkIn} → {hist.checkOut}</td>
                        <td className="py-3 px-4 font-bold text-brand text-left">
                          {hist.roomNumber ? `Room ${hist.roomNumber}` : (extractRoomNumber(hist.room || hist) ? `Room ${extractRoomNumber(hist.room || hist)}` : (hist.room || "Room 101"))}
                        </td>
                        <td className="py-3 px-4 text-left">
                          <Tag tone={hist.status === "Completed" || hist.status === "Staying" || hist.status === "Checked-in" ? "success" : "warning"}>{hist.status}</Tag>
                        </td>
                        <td className="py-3 px-4 text-left font-bold text-navy">₹{Number(hist.amount || 0).toLocaleString()}</td>
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

      </div>

    </div>
  );
}
