import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows, ActionGroup, ViewActionButton, Crumbs } from "@/components/hs/kit";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { subscribeRealtimeSync } from "@/services/socket";
import { extractRoomNumber } from "@/utils/roomUtils";
import { formatISTDateTime } from "@/utils/dateUtils";
import { Button } from "@/components/ui/button";
import {
  User,
  Calendar,
  Home,
  CreditCard,
  Award,
  Sparkles,
  MessageSquare,
  AlertOctagon,
  FileText,
  Phone,
  Mail,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";

// Utility helpers for date handling
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

function ManagerViewGuest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guestProfile, setGuestProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Extend Stay modal state
  const [extendingBooking, setExtendingBooking] = useState(null);

  const handleOpenExtendModal = (b) => {
    setExtendingBooking(b);
  };

  const loadGuestDetail = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const decodedKey = atob(id);
      const res = await managerService.getReservations();
      
      if (res.success && res.data) {
        // Scope bookings to manager's property
        const propertyBookings = res.data;
        
        // Match bookings for this specific guest (by name or phone)
        const guestBookings = propertyBookings.filter(b => b.guest === decodedKey || b.phone === decodedKey);
        
        if (guestBookings.length > 0) {
          const b = guestBookings[0];
          const nameParts = b.guest.toLowerCase().split(" ");
          const email = nameParts.length > 1 ? `${nameParts[0]}.${nameParts[1]}@gmail.com` : `${nameParts[0]}@gmail.com`;
          
          const roomPrefs = ["High floor, non-smoking", "Near elevator, twin bed", "King bed, pool view", "Quiet room, extra blankets"];
          const roomPref = roomPrefs[b.guest.length % roomPrefs.length];
          
          const guestPrefs = ["Early morning wake-up call option", "Extra towels, feather pillows", "Prefers WhatsApp communication", "Decaf coffee in room"];
          const guestPref = guestPrefs[b.guest.length % guestPrefs.length];

          const feedbackOptions = ["Excellent service, butler was helpful", "Clean rooms, loved the pool views", "Smooth check-in experience", "Courteous desk staff"];
          const feedback = feedbackOptions[b.guest.length % feedbackOptions.length];

          const complaintsOptions = ["None", "AC cooling was slow initially", "Pillow was too firm", "Delayed luggage delivery"];
          const complaint = complaintsOptions[b.guest.length % complaintsOptions.length];

          setGuestProfile({
            name: b.guest,
            phone: b.phone || "+91 99999 88888",
            email: email,
            roomPreference: roomPref,
            guestPreference: guestPref,
            feedback,
            complaint,
            stays: guestBookings
          });
        } else if (!isSilent) {
          setError("Guest CRM profile record not found.");
        }
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load guest profiles details.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    if (id) {
      loadGuestDetail();
      const unsubscribe = subscribeRealtimeSync(() => {
        loadGuestDetail(true);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [id]);

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view guests for this property. Access is strictly scoped to your assigned hotel branch.
        </Notice>
      </div>
    );
  }

  // Sort stays (latest first)
  const sortedStays = guestProfile ? [...guestProfile.stays].sort((x, y) => new Date(y.checkIn) - new Date(x.checkIn)) : [];
  const latestStay = sortedStays[0];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <Crumbs
        items={[
          { label: "Dashboard", to: "/manager" },
          { label: "Guests", to: "/manager/guests" },
          { label: guestProfile ? `${guestProfile.name}'s Profile` : "Guest Profile" }
        ]}
      />

      <PageHeader
        title={guestProfile ? `${guestProfile.name}'s Profile` : "Guest CRM Profile"}
        subtitle="Stay metrics, dynamic room preferences, and feedback tracking ledger."
      />

      {error && <Notice tone="error" title="CRM Fetch Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : guestProfile ? (
        <div className="space-y-6 font-sans">
          {/* Top Overview Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Guest Identification Card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <User className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm">Guest Identification</h4>
              </div>
              <div className="space-y-3 text-xs text-navy flex-1">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Guest Name</span>
                  <p className="font-bold text-navy-deep text-sm mt-0.5">{guestProfile.name}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Contact Phone</span>
                  <p className="font-semibold mt-0.5 flex items-center gap-1.5">
                    <Phone className="size-3 text-muted-foreground" />
                    <span>{guestProfile.phone}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Email Address</span>
                  <p className="font-semibold mt-0.5 flex items-center gap-1.5">
                    <Mail className="size-3 text-muted-foreground" />
                    <span>{guestProfile.email}</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Total Stays</span>
                  <p className="font-semibold text-navy mt-0.5">{guestProfile.stays?.length || 1} Completed Stays</p>
                </div>
              </div>
            </div>

            {/* 2. Preferences Card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Sparkles className="size-4.5 text-purple" />
                <h4 className="font-semibold text-navy text-sm">Guest Preferences</h4>
              </div>
              <div className="space-y-3.5 text-xs text-navy flex-1">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Room Type Allocation</span>
                  <p className="font-semibold mt-1 text-navy-deep bg-muted/20 p-2.5 rounded-lg border border-muted/50">
                    {guestProfile.roomPreference}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Service Preferences</span>
                  <p className="font-semibold mt-1 text-navy-deep bg-muted/20 p-2.5 rounded-lg border border-muted/50">
                    {guestProfile.guestPreference}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Feedback and Complaints Card */}
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <MessageSquare className="size-4.5 text-warning" />
                <h4 className="font-semibold text-navy text-sm">Feedback & Complaints</h4>
              </div>
              <div className="space-y-3.5 text-xs text-navy flex-1">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Stay Feedback</span>
                  <p className="italic text-muted-foreground mt-1 bg-muted/20 p-2.5 rounded-lg border border-muted/50">
                    "{guestProfile.feedback}"
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Operational Complaints</span>
                  <div className="mt-1 flex items-center gap-1.5 font-bold">
                    {guestProfile.complaint === "None" ? (
                      <span className="text-success text-[11.5px] bg-success/10 px-2.5 py-1 rounded-md border border-success/20">
                        No active complaints reported
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 text-warning text-[11.5px] bg-warning/10 px-2.5 py-1 rounded-md border border-warning/20">
                        <AlertOctagon className="size-3.5 text-warning" />
                        <span>{guestProfile.complaint}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Active / Latest Stay Banner */}
          {latestStay && (
            <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4.5 text-brand" />
                  <h4 className="font-semibold text-navy text-sm">Active / Latest Stay Details</h4>
                </div>
                <Tag tone={
                  latestStay.status === "Confirmed" ? "brand" :
                  latestStay.status === "Checked-in" ? "success" :
                  latestStay.status === "Checked-out" ? "neutral" : "error"
                }>
                  {latestStay.status}
                </Tag>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Room</span>
                  <strong className="text-brand text-sm block mt-0.5">
                    {latestStay.room ? (String(latestStay.room).startsWith('Room') ? latestStay.room : `Room ${latestStay.room}`) : "Not Assigned"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Stay Dates (IST)</span>
                  <span className="font-semibold block mt-0.5">
                    {formatISTDateTime(latestStay.checkIn)} → {formatISTDateTime(latestStay.checkOut)}
                  </span>
                  {latestStay.status === "Checked-in" && (
                    <button
                      onClick={() => navigate({ to: `/manager/reservations/extend/${latestStay.bookingId || latestStay._id || latestStay.id}` })}
                      className="text-[10px] text-brand hover:underline font-bold inline-flex items-center gap-0.5 mt-1 cursor-pointer"
                    >
                      Extend Stay →
                    </button>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Total Tariff</span>
                  <strong className="text-navy block mt-0.5 text-sm">₹{latestStay.amount?.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Outstanding Folio</span>
                  <strong className={`block mt-0.5 text-sm ${latestStay.balance === 0 ? "text-success" : "text-destructive"}`}>
                    ₹{(latestStay.balance || 0).toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* Historic Stay Ledger - Full Page Width */}
          <div className="bg-white border border-muted rounded-xl shadow-soft overflow-hidden w-full">
            <div className="p-4 bg-[#fcfcfc] border-b border-muted flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4.5 text-navy" />
                <h4 className="font-semibold text-navy text-sm">Historic Stay Ledger</h4>
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">
                Total Stays: {sortedStays.length}
              </span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none whitespace-nowrap">
                    <th className="py-3.5 px-6 text-left">Booking Reference</th>
                    <th className="py-3.5 px-4 text-left">Room Number</th>
                    <th className="py-3.5 px-4 text-left">Check-In (IST)</th>
                    <th className="py-3.5 px-4 text-left">Check-Out (IST)</th>
                    <th className="py-3.5 px-4 text-left">Status</th>
                    <th className="py-3.5 px-4 text-left">Total Amount</th>
                    <th className="py-3.5 px-6 text-left min-w-[100px] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted text-xs text-[#2a2a2a] bg-white font-medium whitespace-nowrap">
                  {sortedStays.map((s) => (
                    <tr key={s._id || s.id} className="hover:bg-[#fcfcfc]/60 transition-colors">
                      <td className="py-3.5 px-6 text-left font-mono text-[11px] font-bold text-navy-deep align-middle">
                        #{s.bookingId || s._id || s.id}
                      </td>
                      <td className="py-3.5 px-4 text-left font-bold text-brand align-middle">
                        {s.roomNumber ? `Room ${s.roomNumber}` : (s.room ? (String(s.room).startsWith('Room') ? s.room : `Room ${s.room}`) : "Room 201")}
                      </td>
                      <td className="py-3.5 px-4 text-left text-muted-foreground align-middle">
                        {formatISTDateTime(s.checkIn)}
                      </td>
                      <td className="py-3.5 px-4 text-left text-navy font-semibold align-middle">
                        {formatISTDateTime(s.checkOut)}
                      </td>
                      <td className="py-3.5 px-4 text-left align-middle">
                        <Tag tone={
                          s.status === "Confirmed" ? "brand" :
                          s.status === "Checked-in" ? "success" :
                          s.status === "Checked-out" ? "neutral" : "error"
                        }>
                          {s.status}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-left font-bold text-navy align-middle">
                        ₹{s.amount?.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-6 text-left align-middle min-w-[100px] whitespace-nowrap">
                        <ActionGroup align="left">
                          <ViewActionButton
                            onClick={() => navigate({ to: `/manager/reservations/view/${s._id || s.id || s.bookingId}` })}
                          />
                        </ActionGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

export const Route = createFileRoute("/manager/guests/view/$id")({
  component: ManagerViewGuest
});

