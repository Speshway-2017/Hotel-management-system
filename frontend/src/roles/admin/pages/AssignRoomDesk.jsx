import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { Save } from "lucide-react";

export const Route = createFileRoute("/admin/front-desk/assign/$id")({
  head: () => ({
    meta: [
      { title: "Assign Room — Speshway Luxury Hotel" }
    ]
  }),
  component: AssignRoomDeskPage
});

// Default hotel rooms metadata fallback
const defaultRooms = [];

import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";

function AssignRoomDeskPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [bookingId, setBookingId] = useState(id || "");
  const [roomNum, setRoomNum] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [res, roomsRes] = await Promise.all([
          superAdminService.getReservations(),
          adminService.getRooms().catch(() => ({ success: true, data: [] }))
        ]);
        setReservations(res.data || []);
        
        const mappedRooms = (roomsRes.data || []).map(r => ({
          num: r.roomNumber,
          type: r.category,
          floor: `Floor ${r.roomNumber.charAt(0)}`
        }));
        setRooms(mappedRooms);
      } catch (err) {
        toast.error("Failed to load reservations and rooms.");
      }
    }
    init();
  }, []);

  // Filter list of vacant rooms
  const occupiedRoomNums = reservations
    .filter(r => r.room && r.status !== "Checked-out" && r.status !== "Cancelled")
    .map(r => r.room);

  const vacantRooms = rooms.filter(r => !occupiedRoomNums.includes(r.num));

  // If ID changes, update state
  useEffect(() => {
    if (id) {
      setBookingId(id);
    }
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error("Please select a guest reservation.");
      return;
    }
    if (!roomNum) {
      toast.error("Please select a physical room to assign.");
      return;
    }

    setLoading(true);
    try {
      await superAdminService.updateReservation(bookingId, { room: roomNum });
      toast.success(`Room #${roomNum} mapped successfully!`);
      navigate({ to: "/admin/front-desk" });
    } catch (err) {
      toast.error(err.message || "Failed to map room key.");
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
          { label: "Assign Room" }
        ]} />
        <PageHeader
          title="Assign Room Allocation"
          subtitle="Bind a physical room key and floor layout to a guest reservation."
        />
      </div>

      <div className="max-w-xl">
        <Panel title="Allocation Details">
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            {!id ? (
              <FormField label="Select Target Reservation" required id="bookingId">
                <Select
                  id="bookingId"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="font-bold text-xs h-10"
                >
                  <option value="">-- Choose Reservation --</option>
                  {reservations
                    .filter(r => !r.room && r.status !== "Checked-out")
                    .map(r => (
                      <option key={r._id} value={r._id}>{r.guest} ({r.category})</option>
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
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Requested Category</span>
                    <p className="font-semibold">{selectedBooking.category}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Booking Reference</span>
                    <p className="font-mono text-muted-foreground">{selectedBooking._id}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <FormField label="Select Vacant Room" required id="roomNum">
              <Select
                id="roomNum"
                value={roomNum}
                onChange={(e) => setRoomNum(e.target.value)}
                className="font-bold text-xs h-10"
              >
                <option value="">-- Choose Vacant Room --</option>
                {vacantRooms.map(r => (
                  <option key={r.num} value={r.num}>Room #{r.num} ({r.type})</option>
                ))}
              </Select>
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
                <Save className="size-3.5" /> Confirm Assignment
              </Button>
            </div>

          </form>
        </Panel>
      </div>
    </div>
  );
}
