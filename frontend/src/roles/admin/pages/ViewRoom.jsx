import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { PageHeader, Panel, Crumbs, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Bed, ArrowLeft, Sliders, Edit2 } from "lucide-react";

export const Route = createFileRoute("/admin/rooms/view/$id")({
  head: () => ({
    meta: [
      { title: "View Room — Speshway Luxury Hotel" }
    ]
  }),
  component: ViewRoomPage
});

function ViewRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);

  useEffect(() => {
    let saved = localStorage.getItem("hms_rooms_list");
    if (!saved) {
      const initial = [
        { _id: "R-101", roomNumber: "101", category: "Villa Suite", floor: "Floor 1", status: "Available", ratePlan: "Standard BAR", currentRate: 38900, lastUpdated: "2 mins ago" },
        { _id: "R-102", roomNumber: "102", category: "Villa Suite", floor: "Floor 1", status: "Occupied", ratePlan: "Standard BAR", currentRate: 38900, lastUpdated: "10 mins ago" },
        { _id: "R-103", roomNumber: "103", category: "Heritage Luxury", floor: "Floor 1", status: "Available", ratePlan: "Standard BAR", currentRate: 11400, lastUpdated: "1 hr ago" },
        { _id: "R-104", roomNumber: "104", category: "Heritage Luxury", floor: "Floor 1", status: "Dirty", ratePlan: "Standard BAR", currentRate: 11400, lastUpdated: "Just now" },
        { _id: "R-105", roomNumber: "105", category: "Superior Deluxe", floor: "Floor 1", status: "Blocked", ratePlan: "Promo Non-Ref", currentRate: 8500, lastUpdated: "Yesterday" },
        { _id: "R-106", roomNumber: "106", category: "Superior Deluxe", floor: "Floor 1", status: "Out of Order", ratePlan: "Standard BAR", currentRate: 8500, lastUpdated: "3 days ago" },
        { _id: "R-201", roomNumber: "201", category: "Maharaja Suite", floor: "Floor 2", status: "Occupied", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "4 hrs ago" },
        { _id: "R-202", roomNumber: "202", category: "Maharaja Suite", floor: "Floor 2", status: "Available", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "5 mins ago" },
        { _id: "R-203", roomNumber: "203", category: "Villa Suite", floor: "Floor 2", status: "Available", ratePlan: "LOS Special Plan", currentRate: 38900, lastUpdated: "20 mins ago" },
        { _id: "R-205", roomNumber: "205", category: "Heritage Luxury", floor: "Floor 2", status: "Available", ratePlan: "Standard BAR", currentRate: 11400, lastUpdated: "12 hrs ago" },
        { _id: "R-301", roomNumber: "301", category: "Maharaja Suite", floor: "Floor 3", status: "Available", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "Just now" },
        { _id: "R-302", roomNumber: "302", category: "Maharaja Suite", floor: "Floor 3", status: "Occupied", ratePlan: "Standard BAR", currentRate: 24500, lastUpdated: "2 hrs ago" },
        { _id: "R-303", roomNumber: "303", category: "Villa Suite", floor: "Floor 3", status: "Out of Order", ratePlan: "Standard BAR", currentRate: 38900, lastUpdated: "1 week ago" }
      ];
      localStorage.setItem("hms_rooms_list", JSON.stringify(initial));
      saved = JSON.stringify(initial);
    }
    const list = JSON.parse(saved);
    const matched = list.find(r => r._id === id || r.roomNumber === id);
    if (matched) {
      setRoom(matched);
    }
  }, [id]);

  if (!room) {
    return (
      <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Rooms & Rates", to: "/admin/rooms" },
          { label: "View Room" }
        ]} />
        <PageHeader title="Room Not Found" subtitle="The requested room record does not exist or was removed." />
        <Button onClick={() => navigate({ to: "/admin/rooms" })} className="bg-navy text-white rounded-full">
          Back to Rooms
        </Button>
      </div>
    );
  }

  const statusMeta = {
    Available: { tone: "success", label: "Available" },
    Occupied: { tone: "brand", label: "Occupied" },
    Dirty: { tone: "warning", label: "Dirty" },
    Cleaning: { tone: "purple", label: "Cleaning" },
    "Out of Order": { tone: "error", label: "Maintenance" },
    Blocked: { tone: "neutral", label: "Blocked" }
  };
  const meta = statusMeta[room.status] || statusMeta.Available;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      <div>
        <Crumbs items={[
          { label: "Workspace", to: "/admin" },
          { label: "Rooms & Rates", to: "/admin/rooms" },
          { label: "View Room" }
        ]} />
        <PageHeader
          title={`Room ${room.roomNumber} Details`}
          subtitle="Detailed record of the room category properties, pricing rules, and current stay assignments."
        />
      </div>

      <div className="max-w-xl space-y-6">
        <Panel title="Room Specifications" description={`Asset Reference ID: ${room._id}`}>
          <div className="p-6 space-y-4 bg-white rounded-b-xl text-xs text-navy leading-relaxed">
            
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted/40">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Room Number</span>
                <strong className="block text-sm font-bold mt-1">Room {room.roomNumber}</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Room Category</span>
                <strong className="block text-sm font-bold mt-1 text-brand">{room.category}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted/40">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Floor Map</span>
                <strong className="block mt-1">{room.floor || "Floor 1"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Rate Plan</span>
                <strong className="block mt-1 font-mono">{room.ratePlan || "Standard BAR"}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted/40">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Daily Rate Tariff</span>
                <strong className="block mt-1 text-navy font-bold text-sm">₹{room.currentRate?.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Standard Capacity</span>
                <strong className="block mt-1">{room.capacity || "2 Adults"}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted/40">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bed Layout</span>
                <strong className="block mt-1">{room.bedType || "King Bed"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Operational Status</span>
                <div className="mt-1">
                  <Tag tone={meta.tone}>{meta.label}</Tag>
                </div>
              </div>
            </div>

            {room.amenities && room.amenities.length > 0 && (
              <div className="pb-4 border-b border-muted/40">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Room Amenities</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {room.amenities.map((a, idx) => (
                    <span key={idx} className="inline-flex items-center rounded bg-muted/40 border border-muted px-2 py-0.5 text-[10px] font-semibold text-navy">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {room.description && (
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Operational Remarks</span>
                <p className="mt-1 text-muted-foreground italic leading-relaxed">{room.description}</p>
              </div>
            )}

          </div>
        </Panel>

        <div className="flex gap-2.5">
          <Button
            onClick={() => navigate({ to: `/admin/rooms/edit/${room._id}` })}
            className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full flex items-center gap-1.5 shadow-soft"
          >
            <Edit2 className="size-3.5" /> Modify Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
