import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Bookmark, Receipt, Building, Calendar } from "lucide-react";

function ViewGuest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guest, setGuest] = useState(null);

  useEffect(() => {
    const loadGuestDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingsRes, propertiesRes, usersRes] = await Promise.all([
          superAdminService.getReservations(),
          superAdminService.getProperties(),
          superAdminService.getUsers()
        ]);

        const bookings = bookingsRes.data || [];
        const properties = propertiesRes.data || [];
        const users = usersRes.data || [];
        const guestUsers = users.filter(u => u.role === "guest");

        const getPropertyName = (propertyId) => {
          const prop = properties.find(p => p.id === propertyId || p._id === propertyId);
          return prop ? prop.name : "Unknown Property";
        };

        // 1. Try to find matched booking
        const matchedBooking = bookings.find(b => b._id === id || b.id === id);
        if (matchedBooking) {
          const matchedUser = guestUsers.find(
            u => u.name.toLowerCase() === matchedBooking.guest.toLowerCase() || 
                 (u.mobile && u.mobile.replace(/\s+/g, '') === matchedBooking.phone.replace(/\s+/g, ''))
          );
          setGuest({
            name: matchedBooking.guest,
            email: matchedUser ? matchedUser.email : (matchedBooking.guest.toLowerCase().replace(/[^a-z0-9]/g, '') + "@example.com"),
            phone: matchedBooking.phone || (matchedUser ? matchedUser.mobile : "—"),
            bookingId: matchedBooking.id || matchedBooking._id,
            propertyName: getPropertyName(matchedBooking.propertyId),
            room: matchedBooking.room || "—",
            checkIn: matchedBooking.checkIn,
            checkOut: matchedBooking.checkOut,
            bookingStatus: matchedBooking.status,
            paymentStatus: matchedBooking.balance === 0 ? "Paid" : "Pending",
            booking: matchedBooking
          });
          return;
        }

        // 2. Try to find matched registered guest user
        const matchedUser = guestUsers.find(u => u._id === id || u.id === id);
        if (matchedUser) {
          setGuest({
            name: matchedUser.name,
            email: matchedUser.email,
            phone: matchedUser.mobile || "—",
            bookingId: "—",
            propertyName: matchedUser.propertyId ? getPropertyName(matchedUser.propertyId) : "—",
            room: "—",
            checkIn: "—",
            checkOut: "—",
            bookingStatus: "—",
            paymentStatus: "—",
            booking: null
          });
          return;
        }

        setError("Guest record not found in directory.");
      } catch (err) {
        setError(err.message || "Failed to load guest stay information.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadGuestDetails();
  }, [id]);

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title={guest ? `Guest stay folio: ${guest.name}` : "Guest stay folio"}
        subtitle="Detailed profile verification, stay log index and billing summaries."
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : guest ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Guest basic information profile card */}
          <div className="md:col-span-1 space-y-4">
            <Panel title="Guest Profile" description="Verified contact coordinates.">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 p-4 border rounded-xl bg-cream/5">
                  <User className="size-10 text-purple bg-purple/10 p-2 rounded-full shrink-0" />
                  <div>
                    <h4 className="font-bold text-navy text-sm">{guest.name}</h4>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Guest Profile</p>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground">
                  <div className="flex items-center gap-2.5 pb-2 border-b">
                    <Mail className="size-4 text-navy/40 shrink-0" />
                    <span className="truncate">{guest.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="size-4 text-navy/40 shrink-0" />
                    <span>{guest.phone}</span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Guest booking stay details card */}
          <div className="md:col-span-2">
            <Panel title="Stay & Reservation Folio" description="Summary of tariff invoices and dates.">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                {guest.booking ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-4">
                      <div className="border rounded-xl p-4 space-y-3 bg-cream/5">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-muted-foreground font-semibold">Booking ID</span>
                          <span className="font-mono font-bold text-purple">{guest.bookingId}</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-muted-foreground font-semibold">Property</span>
                          <span className="font-bold text-navy">{guest.propertyName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-semibold">Assigned Room</span>
                          <span className="font-bold text-navy">{guest.room}</span>
                        </div>
                      </div>

                      <div className="border rounded-xl p-4 space-y-3 bg-white shadow-soft">
                        <div className="flex justify-between items-center border-b pb-2">
                          <span className="text-muted-foreground font-semibold">Stay Status</span>
                          <Tag tone={
                            guest.bookingStatus === "Confirmed" || guest.bookingStatus === "Checked-in" ? "success" :
                            guest.bookingStatus === "Checked-out" ? "neutral" :
                            guest.bookingStatus === "Cancelled" ? "error" : "warning"
                          }>
                            {guest.bookingStatus}
                          </Tag>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground font-semibold">Payment Status</span>
                          <Tag tone={guest.paymentStatus === "Paid" ? "success" : "warning"}>
                            {guest.paymentStatus}
                          </Tag>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-xl p-4 space-y-3 bg-white shadow-soft">
                      <div className="grid grid-cols-2 gap-4 border-b pb-2">
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Check-in</span>
                          <span className="font-bold text-navy flex items-center gap-1">
                            <Calendar className="size-3.5 text-navy/40 shrink-0" />
                            {guest.checkIn}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Check-out</span>
                          <span className="font-bold text-navy flex items-center gap-1">
                            <Calendar className="size-3.5 text-navy/40 shrink-0" />
                            {guest.checkOut}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-b pb-2">
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Duration</span>
                          <span className="font-bold text-navy">{guest.booking.nights} Nights</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold block mb-0.5">Pax Details</span>
                          <span className="font-bold text-navy">{guest.booking.pax || "—"}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-muted-foreground font-semibold">Tariff Amount</span>
                        <span className="font-bold text-navy text-sm">₹{guest.booking.amount.toLocaleString("en-IN")}</span>
                      </div>

                      <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1">
                          <Bookmark className="size-3.5 text-navy/40 shrink-0" /> Channel Source
                        </span>
                        <span className="font-bold text-navy">{guest.booking.source}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-semibold flex items-center gap-1">
                          <Receipt className="size-3.5 text-navy/40 shrink-0" /> Outstanding Folio
                        </span>
                        <span className={`font-bold ${guest.booking.balance > 0 ? "text-warning" : "text-success"}`}>
                          ₹{guest.booking.balance.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground font-semibold py-12">
                    No active stay bookings found for this customer profile.
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/users/view/$id")({
  component: ViewGuest
});
