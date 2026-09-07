import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, Upload, FileText, CheckCircle2, AlertOctagon, HelpCircle, Wrench, Shield
} from "lucide-react";

export const Route = createFileRoute("/reception/room-assignment/$id")({
  head: () => ({
    meta: [
      { title: "Room Status Details — Hour Stay" },
      { name: "description", content: "Details and housekeeping operations for this room." }
    ]
  }),
  component: ReceptionRoomDetailsPage
});

import { toast } from "sonner";
import { receptionistService } from "@/services/receptionist";
import { subscribeRealtimeSync } from "@/services/socket";

function ReceptionRoomDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [roomObj, setRoomObj] = useState(null);

  const loadRoomDetails = (isSilent = false) => {
    if (!isSilent) setLoading(true);
    receptionistService.getRooms()
      .then(res => {
        if (res.success && res.data) {
          const found = res.data.find(r => 
            String(r.room) === String(id) || 
            String(r.roomNumber) === String(id) ||
            String(r._id) === String(id) ||
            String(r.id) === String(id)
          );
          if (found) {
            setRoomObj(found);
          } else if (!isSilent) {
            toast.error("Room details not found in property inventory.");
          }
        }
      })
      .catch(err => console.error("Failed to query room status:", err))
      .finally(() => {
        if (!isSilent) setLoading(false);
      });
  };

  useEffect(() => {
    loadRoomDetails();
    const unsubscribe = subscribeRealtimeSync(() => {
      loadRoomDetails(true);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id]);

  const handleUpdateHousekeeping = (status) => {
    const roomNum = roomObj.roomNumber || roomObj.room;
    receptionistService.updateRoomStatus(roomNum, undefined, status)
      .then(res => {
        if (res.success) {
          toast.success(`Housekeeping status for Room #${roomNum} updated to ${status}!`);
          loadRoomDetails();
        } else {
          toast.error(res.message || "Failed to update housekeeping status.");
        }
      })
      .catch(err => {
        console.error("Failed to update housekeeping:", err);
        toast.error(err.message || "Failed to update housekeeping status.");
      });
  };

  const handleUpdateStatus = (status) => {
    const roomNum = roomObj.roomNumber || roomObj.room;
    receptionistService.updateRoomStatus(roomNum, status, undefined)
      .then(res => {
        if (res.success) {
          toast.success(`Operational status for Room #${roomNum} updated to ${status}!`);
          loadRoomDetails();
        } else {
          toast.error(res.message || "Failed to update room status.");
        }
      })
      .catch(err => {
        console.error("Failed to update status:", err);
        toast.error(err.message || "Failed to update room operational status.");
      });
  };

  if (loading || !roomObj) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading room parameters...
      </div>
    );
  }

  const housekeepingMeta = {
    Dirty: { tone: "error", label: "Dirty" },
    Clean: { tone: "warning", label: "Clean" },
    Inspected: { tone: "success", label: "Inspected" }
  };

  const statusMeta = {
    Available: { tone: "success", label: "Available" },
    Occupied: { tone: "brand", label: "Occupied" },
    Reserved: { tone: "warning", label: "Reserved" },
    "Out of Order": { tone: "error", label: "Out of Order" },
    "Out of Service": { tone: "neutral", label: "Out of Service" }
  };

  const hM = housekeepingMeta[roomObj.housekeeping] || housekeepingMeta.Dirty;
  const sM = statusMeta[roomObj.status] || statusMeta.Available;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      <Crumbs
        items={[
          { label: "Room Status", to: "/reception/room-assignment" },
          { label: `Room #${roomObj.room}` }
        ]}
      />
      
      {/* Dynamic navbar header override */}
      <PageHeader />

      <div className="grid gap-6 md:grid-cols-3">
        
        {/* Left column details */}
        <div className="md:col-span-2 space-y-6">
          
          <Panel title="Room Configuration & Allotment" description="Review floor mappings, assigned guests, checkouts, and clean status.">
            <div className="p-6 space-y-5 text-xs font-semibold text-navy">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Room Reference ID</p>
                  <p className="font-semibold text-sm text-navy">Room #{roomObj.room}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Room Category</p>
                  <p className="font-semibold text-sm text-navy">{roomObj.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Floor Level</p>
                  <p className="font-semibold text-sm text-navy">{roomObj.floor}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold">Active Guest Occupancy</p>
                  <p className="font-semibold text-sm text-navy">{roomObj.guest || <em className="text-muted-foreground font-normal">None (Vacant Room)</em>}</p>
                </div>
                {roomObj.checkout && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground uppercase text-[9px] font-bold">Expected Checkout Date</p>
                    <p className="font-semibold text-sm text-navy">{roomObj.checkout}</p>
                  </div>
                )}
              </div>

              {/* Action mappings */}
              <div className="border-t border-muted/50 pt-5 space-y-4">
                
                {/* Housekeeping Controls */}
                <div className="space-y-2">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold flex items-center gap-1"><Wrench className="size-3.5" /> Housekeeping updates</p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleUpdateHousekeeping("Dirty")}
                      variant="outline"
                      className="border-red-200 bg-red-50 hover:bg-red-100 text-red-700 h-8 px-4 text-[10px] rounded-lg font-bold cursor-pointer"
                    >
                      Mark Dirty
                    </Button>
                    <Button 
                      onClick={() => handleUpdateHousekeeping("Clean")}
                      variant="outline"
                      className="border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 h-8 px-4 text-[10px] rounded-lg font-bold cursor-pointer"
                    >
                      Mark Clean
                    </Button>
                    <Button 
                      onClick={() => handleUpdateHousekeeping("Inspected")}
                      variant="outline"
                      className="border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 h-8 px-4 text-[10px] rounded-lg font-bold cursor-pointer"
                    >
                      Mark Inspected
                    </Button>
                  </div>
                </div>

                {/* Operational Status Controls */}
                <div className="space-y-2 pt-2 border-t border-muted/20">
                  <p className="text-muted-foreground uppercase text-[9px] font-bold flex items-center gap-1"><Shield className="size-3.5" /> Operational status overrides</p>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={() => handleUpdateStatus("Available")}
                      className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-[10px] rounded-lg font-bold cursor-pointer"
                    >
                      Release to Available
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus("Out of Order")}
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 h-8 px-4 text-[10px] rounded-lg font-bold cursor-pointer"
                    >
                      Out of Order
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus("Out of Service")}
                      variant="outline"
                      className="border-muted text-muted-foreground hover:bg-muted/10 h-8 px-4 text-[10px] rounded-lg font-bold cursor-pointer"
                    >
                      Out of Service
                    </Button>
                  </div>
                </div>

              </div>

            </div>
          </Panel>

        </div>

        {/* Right column status values */}
        <div className="space-y-6">
          <Panel title="Status Summary" description="Active attributes.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Operational Status:</span>
                  <Tag tone={sM.tone}>{sM.label}</Tag>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Housekeeping Clean:</span>
                  <Tag tone={hM.tone}>{hM.label}</Tag>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>

    </div>
  );
}
