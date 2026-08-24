import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/front-desk/payment/$id")({
  head: () => ({
    meta: [
      { title: "Collect Payment — Speshway Luxury Hotel" }
    ]
  }),
  component: CollectPaymentDeskPage
});

import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";

function CollectPaymentDeskPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [bookingId, setBookingId] = useState(id || "");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const res = await superAdminService.getReservations();
        setReservations(res.data || []);
        if (id) {
          const matched = (res.data || []).find(r => r._id === id || r.id === id);
          if (matched) {
            setAmount(matched.balance.toString());
          }
        }
      } catch (err) {
        toast.error("Failed to load reservations.");
      }
    }
    init();
  }, [id]);

  // If ID changes, update state
  useEffect(() => {
    if (id) {
      setBookingId(id);
    }
  }, [id]);

  const handleBookingChange = (newId) => {
    setBookingId(newId);
    const matched = reservations.find(r => r._id === newId || r.id === newId);
    if (matched) {
      setAmount(matched.balance.toString());
    } else {
      setAmount("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error("Please select a guest reservation ledger.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    setLoading(true);
    try {
      const booking = reservations.find(r => r._id === bookingId || r.id === bookingId);
      if (!booking) throw new Error("Reservation not found.");

      const targetId = booking._id || booking.id;
      const remaining = Math.max(0, booking.balance - Number(amount));
      
      await superAdminService.updateReservation(targetId, {
        balance: remaining,
        paymentStatus: remaining === 0 ? "Paid" : "Partial"
      });

      // Log payment record in payments database collection
      await adminService.createPayment({
        bookingId: targetId,
        guestName: booking.guest,
        amount: Number(amount),
        paymentMethod: 'UPI',
        status: 'Settled'
      });

      toast.success(`Collected payment of ₹${Number(amount).toLocaleString()}. Folio updated.`);
      navigate({ to: "/admin/front-desk" });
    } catch (err) {
      toast.error(err.message || "Failed to process ledger payment.");
    } finally {
      setLoading(false);
    }
  };

  const selectedBooking = reservations.find(r => r._id === bookingId || r.id === bookingId);

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div className="space-y-3.5">
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Front Desk", to: "/admin/front-desk" },
          { label: "Collect Payment" }
        ]} />
        <PageHeader
          title="Collect Ledger Payment"
          subtitle="Record and settle outstanding guest balances and print folio updates."
        />
      </div>

      <div className="max-w-xl">
        <Panel title="Folio Ledger Details">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            {!id ? (
              <FormField label="Select Target Reservation" required id="bookingId">
                <Select
                  id="bookingId"
                  value={bookingId}
                  onChange={(e) => handleBookingChange(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Reservation --</option>
                  {reservations
                    .filter(r => r.balance > 0 && r.status !== "Checked-out")
                    .map(r => (
                      <option key={r._id} value={r._id}>{r.guest} (Outstanding: ₹{r.balance.toLocaleString()})</option>
                    ))}
                </Select>
              </FormField>
            ) : selectedBooking ? (
              <div className="p-3.5 bg-muted/20 border border-muted/50 rounded-lg text-xs space-y-2 text-navy">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold">Guest Profile</span>
                  <p className="font-bold text-sm">{selectedBooking.guest}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Current Outstanding Balance</span>
                    <p className="font-bold text-purple text-sm">₹{selectedBooking.balance?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Stay Tariff</span>
                    <p className="font-semibold text-muted-foreground">₹{selectedBooking.amount?.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <FormField label="Payment Amount to Settle (₹)" required id="amount">
              <Input
                id="amount"
                type="number"
                required
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FormField>

            <div className="pt-4 border-t border-muted/40 flex justify-end gap-2.5 select-none">
              <Button
                type="button"
                variant="ghost"
                className="h-10 text-xs px-5 rounded-full"
                onClick={() => navigate({ to: "/admin/front-desk" })}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full shadow-soft flex items-center gap-1.5"
              >
                <Save className="size-3.5" /> Record Payment
              </Button>
            </div>

          </form>
        </Panel>
      </div>
    </div>
  );
}
