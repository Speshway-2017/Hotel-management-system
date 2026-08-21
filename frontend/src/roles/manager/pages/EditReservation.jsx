import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

function ManagerEditReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [guest, setGuest] = useState("");
  const [phone, setPhone] = useState("");
  const [room, setRoom] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [nights, setNights] = useState(1);
  const [pax, setPax] = useState("2 Adults");
  const [source, setSource] = useState("Direct");
  const [status, setStatus] = useState("Pending");
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("");
  const [isGroupBooking, setIsGroupBooking] = useState(false);
  const [propertyId, setPropertyId] = useState("");

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getReservations();
        if (res.success) {
          const match = res.data.find(r => r._id === id || r.id === id);
          if (match) {
            // Verify property scope
            if (match.propertyId !== user.propertyId && match.property !== user.propertyId) {
              setIsAuthorized(false);
            } else {
              setGuest(match.guest || "");
              setPhone(match.phone || "");
              setRoom(match.room || "");
              if (match.checkIn) setCheckIn(match.checkIn.substring(0, 10));
              if (match.checkOut) setCheckOut(match.checkOut.substring(0, 10));
              setNights(match.nights || 1);
              setPax(match.pax || "2 Adults");
              setSource(match.source || "Direct");
              setStatus(match.status || "Pending");
              setAmount(match.amount || "");
              setBalance(match.balance || "");
              setIsGroupBooking(!!match.isGroupBooking);
              setPropertyId(match.propertyId || user.propertyId);
            }
          } else {
            setError("Reservation details not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load reservation details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadBooking();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        guest,
        phone,
        room,
        checkIn,
        checkOut,
        nights: Number(nights),
        pax,
        source,
        status,
        amount: Number(amount),
        balance: Number(balance || 0),
        isGroupBooking,
        propertyId: propertyId || currentUser.propertyId
      };

      const res = await superAdminService.updateReservation(id, payload);
      if (res.success) {
        toast.success("Reservation details updated.");
        navigate({ to: "/manager/reservations" });
      } else {
        toast.error(res.message || "Failed to save adjustments.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save adjustments.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to edit reservations for this property. Access is strictly scoped to your assigned hotel branch.
        </Notice>
        <Link to="/manager/reservations" className="inline-flex items-center gap-1.5 text-xs text-navy font-bold hover:underline">
          <ChevronLeft className="size-3.5" /> Back to Reservations
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="flex items-center gap-3">
        <Link to="/manager/reservations" className="inline-flex items-center justify-center size-8 rounded-full border border-muted bg-white hover:bg-muted/15 text-navy transition-all cursor-pointer">
          <ChevronLeft className="size-4" />
        </Link>
        <PageHeader
          title="Edit Reservation"
          subtitle="Update guest stay parameters, room assignments, and ledger balances."
        />
      </div>

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      <div className="max-w-xl">
        <Panel title="Edit Stay Parameters" description="Update operational booking metadata.">
          {loading ? (
            <div className="p-6 bg-white rounded-b-xl">
              <LoadingRows rows={4} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white rounded-b-xl">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Guest Name" required className="col-span-2" id="guest">
                  <Input
                    id="guest"
                    type="text"
                    required
                    value={guest}
                    onChange={(e) => setGuest(e.target.value)}
                    placeholder="Enter guest's full name"
                  />
                </FormField>

                <FormField label="Phone Number" required id="phone">
                  <Input
                    id="phone"
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </FormField>

                <FormField label="Room Designation" id="room">
                  <Select
                    id="room"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  >
                    <option value="">Select Room</option>
                    <option value="101">Room 101</option>
                    <option value="102">Room 102</option>
                    <option value="103">Room 103</option>
                    <option value="104">Room 104</option>
                    <option value="201">Room 201</option>
                    <option value="202">Room 202</option>
                    <option value="203">Room 203</option>
                    <option value="204">Room 204</option>
                    <option value="301">Room 301</option>
                    <option value="302">Room 302</option>
                    <option value="303">Room 303</option>
                    <option value="312">Room 312</option>
                    <option value="501">Room 501</option>
                    <option value="602">Room 602</option>
                  </Select>
                </FormField>

                <FormField label="Check-In Date" required id="checkIn">
                  <Input
                    id="checkIn"
                    type="text"
                    required
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    placeholder="E.g. 12 Aug 2026 or YYYY-MM-DD"
                  />
                </FormField>

                <FormField label="Check-Out Date" required id="checkOut">
                  <Input
                    id="checkOut"
                    type="text"
                    required
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    placeholder="E.g. 15 Aug 2026 or YYYY-MM-DD"
                  />
                </FormField>

                <FormField label="Nights Count" required id="nights">
                  <Input
                    id="nights"
                    type="number"
                    required
                    value={nights}
                    onChange={(e) => setNights(e.target.value)}
                    min={1}
                  />
                </FormField>

                <FormField label="Pax Details" required id="pax">
                  <Input
                    id="pax"
                    type="text"
                    required
                    value={pax}
                    onChange={(e) => setPax(e.target.value)}
                  />
                </FormField>

                <FormField label="Booking Channel" id="source">
                  <Select
                    id="source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value="Direct">Direct Booking</option>
                    <option value="Corporate">Corporate / GDS Contract</option>
                    <option value="MakeMyTrip">MakeMyTrip OTA</option>
                    <option value="Booking.com">Booking.com OTA</option>
                    <option value="Agoda">Agoda OTA</option>
                    <option value="Walk-in">Walk-in Rate Plan</option>
                  </Select>
                </FormField>

                <FormField label="Workflow Status" id="status">
                  <Select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked-in">Checked-in</option>
                    <option value="Checked-out">Checked-out</option>
                    <option value="Cancelled">Cancelled</option>
                  </Select>
                </FormField>

                <FormField label="Total Amount" required id="amount">
                  <Input
                    id="amount"
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Total tariff cost"
                    suffix="₹"
                  />
                </FormField>

                <FormField label="Remaining Balance" id="balance">
                  <Input
                    id="balance"
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0 if fully prepaid"
                    suffix="₹"
                  />
                </FormField>

                <div className="col-span-2 flex items-center gap-2 pt-2.5">
                  <Checkbox
                    id="isGroup"
                    checked={isGroupBooking}
                    onChange={(e) => setIsGroupBooking(e.target.checked)}
                    label="Identify as Group Booking (Master Ledger Integration)"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate({ to: "/manager/reservations" })}
                  className="h-10 px-4 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold rounded-full cursor-pointer">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/manager/reservations/edit/$id")({
  component: ManagerEditReservation
});
