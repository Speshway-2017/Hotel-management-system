import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import { superAdminService } from "@/services/superAdmin";
import {
  Activity, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Sliders,
  Eye, Check, Ban, DollarSign, Server, KeyRound, AlertCircle, Clock
} from "lucide-react";

export const Route = createFileRoute("/admin/channels")({
  head: () => ({
    meta: [
      { title: "OTA Channels Synchronization — Speshway Luxury Hotel" },
      { name: "description", content: "Synchronize room tariffs and availability counts across GDS and OTA distribution systems." }
    ]
  }),
  component: AdminChannelsPage
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-sans tracking-tight tabular-nums text-base font-bold text-slate-800 leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

const initialChannels = [
  {
    name: "MakeMyTrip",
    status: "Connected",
    lastSync: "2 min ago",
    inventorySync: "Synced",
    rateSync: "In Parity",
    reservationSync: "Active",
    commission: 15,
    stopSell: false,
    closeOut: false,
    logs: [
      { time: "17:05:12", event: "Availability push: 42 rooms sync successful", type: "success" },
      { time: "16:48:00", event: "Rate update: Standard Deluxe ₹6,500 pushed", type: "success" },
      { time: "15:30:24", event: "Reservation download: MMT-89021 check-in captured", type: "success" }
    ]
  },
  {
    name: "Booking.com",
    status: "Connected",
    lastSync: "5 min ago",
    inventorySync: "Synced",
    rateSync: "In Parity",
    reservationSync: "Active",
    commission: 15,
    stopSell: false,
    closeOut: false,
    logs: [
      { time: "17:00:00", event: "Inventory push: 42 rooms sync successful", type: "success" },
      { time: "16:12:44", event: "Reservation download: BKG-11928 check-in captured", type: "success" }
    ]
  },
  {
    name: "Expedia",
    status: "Sync Warning",
    lastSync: "15 min ago",
    inventorySync: "Synced",
    rateSync: "Rate Mismatch",
    reservationSync: "Active",
    commission: 18,
    stopSell: false,
    closeOut: false,
    logs: [
      { time: "16:50:00", event: "Rate mismatch alert: Expedia listing ₹6,100 vs PMS ₹6,500", type: "warning" },
      { time: "16:00:15", event: "Availability push: 42 rooms sync successful", type: "success" }
    ]
  },
  {
    name: "Agoda",
    status: "Disconnected",
    lastSync: "1 day ago",
    inventorySync: "—",
    rateSync: "—",
    reservationSync: "Inactive",
    commission: 15,
    stopSell: true,
    closeOut: true,
    logs: [
      { time: "August 16, 11:30", event: "Channel deactivated by user override. STOP SELL initialized.", type: "error" }
    ]
  }
];

function AdminChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync Log Modal popup
  const [selectedLogs, setSelectedLogs] = useState(null);

  const [properties, setProperties] = useState([]);

  useEffect(() => {
    async function init() {
      try {
        const res = await superAdminService.getProperties();
        if (res.success && res.data && res.data.length > 0) {
          setProperties(res.data);
          const settings = res.data[0].settings || {};
          if (settings.otaChannels) {
            setChannels(settings.otaChannels);
          } else {
            setChannels(initialChannels);
          }
        }
      } catch (err) {}
      setLoading(false);
    }
    init();
  }, []);

  const syncChannels = async (list) => {
    try {
      if (properties.length > 0) {
        const prop = properties[0];
        const nextSettings = {
          ...(prop.settings || {}),
          otaChannels: list
        };
        await superAdminService.updateProperty(prop._id || prop.id, { settings: nextSettings });
      }
      setChannels(list);
    } catch (err) {
      toast.error(err.message || "Failed to update channel configs.");
    }
  };

  const handleSyncNow = (name) => {
    toast.info(`Triggering API Sync push for ${name}...`);
    setTimeout(() => {
      const updated = channels.map(c => {
        if (c.name === name) {
          toast.success(`${name} channels synchronization complete.`);
          return {
            ...c,
            lastSync: "Just now",
            logs: [{ time: new Date().toLocaleTimeString(), event: "Manual API Sync Trigger: pushed parity successfully", type: "success" }, ...c.logs]
          };
        }
        return c;
      });
      syncChannels(updated);
    }, 1000);
  };

  const handleToggleStopSell = (name) => {
    const updated = channels.map(c => {
      if (c.name === name) {
        const nextStopSell = !c.stopSell;
        toast.warning(`${name} Stop Sell override ${nextStopSell ? "Enabled" : "Disabled"}`);
        return {
          ...c,
          stopSell: nextStopSell,
          status: nextStopSell ? "Disconnected" : "Connected",
          logs: [{ time: new Date().toLocaleTimeString(), event: `Stop Sell status toggled: ${nextStopSell ? "Active" : "Inactive"}`, type: "warning" }, ...c.logs]
        };
      }
      return c;
    });
    syncChannels(updated);
  };

  // KPIs
  const totalChannels = channels.length;
  const connectedChannels = channels.filter(c => c.status === "Connected").length;
  const activeMappings = 6; // Mock mappings count

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Active Connected channels"
          value={`${connectedChannels} / ${totalChannels}`}
          hint="Connected OTA partner channels"
          icon={Server}
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="OTA Room Mappings"
          value={activeMappings.toString()}
          hint="Total room category mappings synced"
          icon={KeyRound}
          accentColor="#3b82f6"
        />
        <PremiumStatCard
          label="Sync Parity Rate"
          value="98.4%"
          hint="API sync error rate"
          icon={Activity}
          accentColor="#6366f1"
        />
        <PremiumStatCard
          label="Parity warnings"
          value="1"
          hint="Rate parity mapping warnings"
          icon={AlertCircle}
          accentColor="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mapped Channels Table */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="OTA Channels Connection Directory">
            {loading ? (
              <LoadingRows rows={4} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead>
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                      <th className="py-3 px-4 text-left">Distribution Channel</th>
                      <th className="py-3 px-4 text-center">Room Mappings</th>
                      <th className="py-3 px-4 text-left">Inventory Sync</th>
                      <th className="py-3 px-4 text-left">Rates Parity</th>
                      <th className="py-3 px-4 text-right">Commission fee</th>
                      <th className="py-3 px-4 text-left">Sync status</th>
                      <th className="py-3 px-4 text-center font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                    {channels.map((c) => (
                      <tr key={c.name} className="hover:bg-muted/5">
                        <td className="py-3.5 px-4">
                          <div>
                            <p className="font-bold text-navy">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold">Last Synced: {c.lastSync}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-navy">6 Mapped</td>
                        <td className="py-3.5 px-4 font-semibold text-navy">{c.inventorySync}</td>
                        <td className="py-3.5 px-4">
                          <Tag tone={c.rateSync === "In Parity" ? "success" : c.rateSync === "Rate Mismatch" ? "warning" : "neutral"}>
                            {c.rateSync}
                          </Tag>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-navy">{c.commission}%</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold inline-flex items-center gap-1 ${
                            c.status === "Connected" ? "bg-success/15 text-success" : c.status === "Sync Warning" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                          <div className="flex justify-center gap-1.5 select-none">
                            <Button
                              onClick={() => setSelectedLogs(c)}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 rounded-full flex items-center justify-center"
                              title="Audit Sync logs"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              onClick={() => handleSyncNow(c.name)}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-success hover:bg-success/10 rounded-full flex items-center justify-center"
                              title="Sync Now"
                              disabled={c.stopSell}
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                            <Button
                              onClick={() => handleToggleStopSell(c.name)}
                              variant="ghost"
                              className={`h-7 w-7 p-0 rounded-full flex items-center justify-center ${
                                c.stopSell ? "text-success hover:bg-success/10" : "text-destructive hover:bg-destructive/10"
                              }`}
                              title={c.stopSell ? "Deactivate Stop Sell" : "Initialize Stop Sell"}
                            >
                              <Ban className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        {/* Sync Status Info */}
        <div className="lg:col-span-1">
          <Panel title="Synchronization Configuration Guidelines" description="API Channel limits.">
            <div className="p-4 space-y-4 text-xs font-semibold text-navy leading-relaxed text-left">
              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-xl space-y-2">
                <div className="flex gap-2">
                  <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-navy">Auto-Rate Sync (2-way)</p>
                    <p className="text-[11px] text-muted-foreground font-normal mt-0.5">PMS changes instantly adjust active inventory levels across MMT, Agoda, and Booking.com APIs.</p>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-xl space-y-2">
                <div className="flex gap-2">
                  <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-navy">Inventory Parity Shield</p>
                    <p className="text-[11px] text-muted-foreground font-normal mt-0.5">Locks distribution rates parity when check-ins lower remaining counts to prevent double over-bookings.</p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        </div>

      </div>

      {/* Sync Log detail overlay Modal */}
      {selectedLogs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{selectedLogs.name} API Sync Audit logs</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">Channel Commission: {selectedLogs.commission}%</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy"
                onClick={() => setSelectedLogs(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Logs list body */}
            <div className="p-5 max-h-[300px] overflow-y-auto space-y-3">
              {selectedLogs.logs.map((l, i) => (
                <div key={i} className="p-3 border border-muted bg-muted/10 rounded-lg space-y-1 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                    <span className="font-mono flex items-center gap-1">
                      <Clock className="size-3" /> {l.time}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] ${
                      l.type === "error" ? "bg-destructive/15 text-destructive" : l.type === "warning" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                    }`}>{l.type || "success"}</span>
                  </div>
                  <p className="font-semibold text-navy leading-relaxed">{l.event}</p>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedLogs(null)}
                className="h-8 px-4 text-xs rounded-full"
              >
                Close Logs
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}