import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Checkbox } from "@/components/hs/FormFields";
import { toast } from "sonner";

function AddReservation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
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
        isGroupBooking
      };
      const res = await superAdminService.createReservation(payload);
      if (res.success) {
        toast.success("Reservation logged successfully.");
        navigate({ to: "/admin/reservations" });
      } else {
        toast.error(res.message || "Failed to create reservation.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to log booking.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title="Create New Reservation"
        subtitle="Book guest rooms, assign stay duration parameters, and log billing rates."
        actions={
          <Button
            onClick={() => navigate({ to: "/admin/reservations" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer"
          >
            Back to Console
          </Button>
        }
      />

      <div className="max-w-xl">
        <Panel title="Booking Parameters Form" description="Assign reservation particulars.">
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
                  <option value="101">Room 101 (Villa Suite)</option>
                  <option value="104">Room 104 (Heritage Luxury)</option>
                  <option value="205">Room 205 (Heritage Luxury)</option>
                  <option value="302">Room 302 (Maharaja Suite)</option>
                </Select>
              </FormField>

              <FormField label="Check-In Date" required id="checkIn">
                <Input
                  id="checkIn"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </FormField>

              <FormField label="Check-Out Date" required id="checkOut">
                <Input
                  id="checkOut"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
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
                onClick={() => navigate({ to: "/admin/reservations" })}
                className="h-10 px-4"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-navy hover:bg-navy/90 text-white h-10 px-6 font-bold rounded-full">
                {loading ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin/reservations/add")({
  component: AddReservation
});
