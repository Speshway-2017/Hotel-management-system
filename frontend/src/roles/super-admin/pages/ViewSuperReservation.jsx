import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { User, Building, Calendar, Landmark, X } from "lucide-react";

function ViewSuperReservation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    const loadBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const [bookingsRes, propertiesRes] = await Promise.all([
          superAdminService.getReservations(),
          superAdminService.getProperties()
        ]);
        if (propertiesRes.success) {
          setProperties(propertiesRes.data);
        }
        if (bookingsRes.success) {
          const match = bookingsRes.data.find(b => b._id === id || b.id === id);
          if (match) {
            setSelectedBooking(match);
          } else {
            setError("Reservation not found.");
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

  const getPropertyName = (pId) => {
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Property";
  };

  const getPropertyLocation = (pId) => {
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.city : "—";
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title={selectedBooking ? `Reservation: ${selectedBooking.id || selectedBooking._id}` : "Reservation Details"}
        subtitle="Operational stay records, occupancy configurations, and tariff ledger audit."
        actions={
          <Button
            onClick={() => navigate({ to: "/super-admin/reservations" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer"
          >
            Back to Reservations
          </Button>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : selectedBooking ? (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Panel title="Reservation Ledger Details" description="Core reservation stay boundaries.">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex justify-between items-center bg-muted/20 p-4 rounded-xl border border-muted/30">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Booking ID</span>
                    <p className="text-sm font-bold text-navy mt-0.5">{selectedBooking.id || selectedBooking._id}</p>
                  </div>
                  <Tag tone={statusTone(selectedBooking.status)}>{selectedBooking.status}</Tag>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-4 border-r pr-4">
                    <div className="flex gap-2">
                      <User className="size-4 text-purple shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-navy font-semibold">Guest Contact Details:</strong>
                        <p className="text-muted-foreground text-sm font-semibold mt-0.5">{selectedBooking.guest}</p>
                        <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{selectedBooking.phone || "No phone contact"}</p>
                      </div>
                    </div>

                    <div className="border-t pt-3 flex gap-2">
                      <Building className="size-4 text-purple shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-navy font-semibold">Hotel Property & Room:</strong>
                        <p className="text-muted-foreground mt-0.5">{getPropertyName(selectedBooking.propertyId)}</p>
                        <p className="text-muted-foreground text-[11px] italic mt-0.5">{getPropertyLocation(selectedBooking.propertyId)}</p>
                        <p className="text-navy font-semibold mt-1">Room: {selectedBooking.room}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-navy font-semibold">Check-in:</strong>
                        <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{selectedBooking.checkIn}</p>
                      </div>
                      <div>
                        <strong className="text-navy font-semibold">Check-out:</strong>
                        <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{selectedBooking.checkOut}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                      <div>
                        <strong className="text-navy font-semibold">Stay Duration:</strong>
                        <p className="text-muted-foreground mt-0.5">{selectedBooking.nights} Nights ({selectedBooking.pax || "2 Adults"})</p>
                      </div>
                      <div>
                        <strong className="text-navy font-semibold">Booking Source:</strong>
                        <p className="mt-0.5"><Tag tone="brand">{selectedBooking.source}</Tag></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          <div className="md:col-span-1">
            <Panel title="Folio Billing" description="Tariff rates audit.">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex gap-2">
                  <Landmark className="size-4 text-purple shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <strong className="text-navy font-semibold">Billing Ledger Summary:</strong>
                    <div className="space-y-2.5 bg-muted/10 p-4 rounded-lg border border-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Tariff:</span>
                        <p className="text-navy font-bold text-xs">₹{(selectedBooking.amount || 0).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-muted-foreground">Balance Pending:</span>
                        <p className={`font-bold text-xs ${selectedBooking.balance > 0 ? "text-warning" : "text-success"}`}>
                          ₹{(selectedBooking.balance || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/reservations/view/$id")({
  component: ViewSuperReservation
});
