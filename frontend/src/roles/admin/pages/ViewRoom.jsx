import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import { superAdminService } from "@/services/superAdmin";
import { Bed, ArrowLeft, Sliders, Edit2, CheckCircle, Clock, Image as ImageIcon } from "lucide-react";

export const Route = createFileRoute("/admin/rooms/view/$id")({
  head: () => ({
    meta: [
      { title: "View Room — Speshway Luxury Hotel" }
    ]
  }),
  component: ViewRoomPage
});

function ViewRoomPage() {
  const params = Route.useParams();
  const targetId = params?.id || (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : "");
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRoom() {
      try {
        setLoading(true);
        let data = null;
        try {
          data = await adminService.getRoom(targetId);
        } catch (e) {
          console.warn("adminService.getRoom failed, falling back to all rooms:", e);
        }

        if (!data) {
          const all = await adminService.getRooms();
          const list = Array.isArray(all) ? all : (all?.data || all?.rooms || []);
          data = list.find(r => (r._id || r.id) === targetId);
        }

        if (!data) {
          const saRooms = await superAdminService.getRooms();
          const list = Array.isArray(saRooms) ? saRooms : (saRooms?.data || saRooms?.rooms || []);
          data = list.find(r => (r._id || r.id) === targetId);
        }

        if (data) {
          setRoom(data);
        }
      } catch (err) {
        console.error("Failed to load room data:", err);
      } finally {
        setLoading(false);
      }
    }

    if (targetId) {
      fetchRoom();
    } else {
      setLoading(false);
    }
  }, [targetId]);

  if (loading) {
    return (
      <div className="space-y-6 text-left font-sans animate-fade-in font-ui p-6">
        <div className="py-12 text-center">
          <div className="mx-auto size-8 rounded-full border-4 border-navy border-t-transparent animate-spin mb-3" />
          <p className="text-xs font-bold text-navy/60">Loading room specifications from MongoDB...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="space-y-6 text-left font-sans animate-fade-in font-ui p-6">
        <div className="text-sm font-bold text-navy">Room Not Found</div>
        <p className="text-xs text-muted-foreground">The requested room record does not exist or was removed from MongoDB.</p>
      </div>
    );
  }

  const statusMeta = {
    Available: { tone: "success", label: "Available" },
    Occupied: { tone: "brand", label: "Occupied" },
    Blocked: { tone: "neutral", label: "Blocked" }
  };
  const meta = statusMeta[room.status] || statusMeta.Available;

  const roomAmenitiesList = Array.isArray(room.amenities)
    ? room.amenities
    : (typeof room.amenities === 'string' && room.amenities.trim() !== ''
        ? room.amenities.split(',').map(a => a.trim()).filter(Boolean)
        : ["Free Wi-Fi", "Air Conditioning", "Ensuite Bathroom"]);

  const roomImages = Array.isArray(room.images) ? room.images.filter(Boolean) : [];

  return (
    <div className="space-y-4 text-left font-sans animate-fade-in font-ui">
      <div className="max-w-2xl space-y-6">

        {/* Dynamic Room Images Gallery */}
        <div className="bg-white rounded-2xl border border-navy/10 shadow-soft p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy">Room Photos</h3>
            {roomImages.length > 0 && (
              <span className="text-[10px] font-bold text-purple bg-purple/10 px-2.5 py-0.5 rounded-full border border-purple/20">
                {roomImages.length} Photo{roomImages.length > 1 ? 's' : ''} Stored in MongoDB
              </span>
            )}
          </div>

          {roomImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {roomImages.map((imgUrl, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-navy/10 h-36 bg-navy/5 shadow-soft">
                  <img src={imgUrl} alt={`Room ${room.roomNumber} photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-navy/15 bg-navy/[0.02] rounded-xl text-center">
              <Bed className="size-8 text-navy/30 mx-auto mb-2" />
              <p className="text-xs font-bold text-navy/60">No photos uploaded for Room {room.roomNumber}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Click Modify Configuration below to upload photos.</p>
            </div>
          )}
        </div>

        {/* Room Specifications Panel */}
        <div className="bg-white rounded-2xl border border-navy/10 shadow-soft overflow-hidden">
          <div className="p-6 space-y-4 text-xs text-navy leading-relaxed">
            
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
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Floor</span>
                <strong className="block mt-1">{room.floor || 'Floor 1'}</strong>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Active Rate Plan</span>
                <strong className="block mt-1 font-mono">{room.ratePlan || "Standard Plan"}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-muted/40">
              <div>
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Daily Rate Tariff</span>
                <strong className="block mt-1 text-navy font-bold text-sm">
                  ₹{Number(room.currentRate || room.baseRate || room.dailyRate || 3500).toLocaleString('en-IN')}
                </strong>
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

            {roomAmenitiesList.length > 0 && (
              <div className="pb-4 border-b border-muted/40">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Room Amenities</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {roomAmenitiesList.map((a, idx) => (
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
        </div>

        <div className="flex gap-2.5">
          <Button
            onClick={() => navigate({ to: `/admin/rooms/edit/${room._id || room.id || targetId}` })}
            className="bg-navy hover:bg-navy-deep text-white text-xs h-10 px-6 font-bold rounded-full flex items-center gap-1.5 shadow-soft cursor-pointer"
          >
            <Edit2 className="size-3.5" /> Modify Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ViewRoomPage;
