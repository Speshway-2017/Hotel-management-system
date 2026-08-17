import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import {
  UserCog,
  Activity,
  Gift,
  Bell,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  XCircle,
  TrendingUp,
  Percent,
  Check,
  Ban
} from "lucide-react";

const managementTabs = [
  { label: "Staff Management", to: "/admin/staff", icon: UserCog },
  { label: "OTA / Channels", to: "/admin/channels", icon: Activity },
  { label: "CRM / Loyalty", to: "/admin/crm", icon: Gift },
  { label: "Notifications", to: "/admin/notifications", icon: Bell }
];

export const Route = createFileRoute("/admin/channels")({
  head: () => ({
    meta: [
      { title: "OTA Channels Manager — Speshway Luxury Hotel" },
      { name: "description", content: "Audit rates parity and room availability sync parities." }
    ]
  }),
  component: AdminChannelsPage
});

function AdminChannelsPage() {
  const [userProperty, setUserProperty] = useState({ id: "HS-JAI", name: "Speshway Luxury Hotel" });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [logChannelName, setLogChannelName] = useState("");

  const [channels, setChannels] = useState([
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
        { time: "17:05:12", event: "Availability push: 42 rooms sync successful" },
        { time: "16:48:00", event: "Rate update: Standard Deluxe ₹6,500 pushed" },
        { time: "15:30:24", event: "Reservation download: MMT-89021 guest check-in captured" }
      ]
    },
    {
      name: "Goibibo",
      status: "Failed",
      lastSync: "15 min ago",
      inventorySync: "Synced",
      rateSync: "Rate Mismatch",
      reservationSync: "Active",
      commission: 18,
      stopSell: false,
      closeOut: false,
      logs: [
        { time: "16:50:00", event: "Rate validation failed: Goibibo listing ₹6,100 vs PMS ₹6,500 (Mismatch flag)" },
        { time: "16:00:15", event: "Availability push: 42 rooms sync successful" }
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
        { time: "17:00:00", event: "Inventory push: 42 rooms sync successful" },
        { time: "16:12:44", event: "Reservation download: BKG-11928 check-in captured" }
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
        { time: "August 16, 11:30", event: "Channel deactivated by user override. STOP SELL initialized." }
      ]
    }
  ]);

  useEffect(() => {
    superAdminService.getProperties()
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          setUserProperty({ id: res.data[0].id || res.data[0]._id, name: res.data[0].name });
        }
      })
      .catch(() => {});
  }, []);

  const handleSync = (name) => {
    setChannels((prev) =>
      prev.map((c) => (c.name === name ? { ...c, status: "Syncing", lastSync: "Syncing..." } : c))
    );

    setTimeout(() => {
      setChannels((prev) =>
        prev.map((c) =>
          c.name === name
            ? {
                ...c,
                status: "Connected",
                lastSync: "Just now",
                inventorySync: "Synced",
                rateSync: "In Parity"
              }
            : c
        )
      );
      setNotification({ tone: "success", title: "Channel Synced", body: `${name} has been synchronized successfully.` });
      setTimeout(() => setNotification(null), 3000);
    }, 1000);
  };

  const handleSyncAll = () => {
    setLoading(true);
    setChannels((prev) =>
      prev.map((c) =>
        c.status !== "Disconnected" ? { ...c, status: "Syncing", lastSync: "Syncing..." } : c
      )
    );

    setTimeout(() => {
      setChannels((prev) =>
        prev.map((c) =>
          c.status !== "Disconnected"
            ? {
                ...c,
                status: "Connected",
                lastSync: "Just now",
                inventorySync: "Synced",
                rateSync: "In Parity"
              }
            : c
        )
      );
      setLoading(false);
      setNotification({ tone: "success", title: "Global Sync Completed", body: "All active channels updated successfully." });
      setTimeout(() => setNotification(null), 3000);
    }, 1200);
  };

  const handleToggleConnect = (name) => {
    setChannels((prev) =>
      prev.map((c) => {
        if (c.name !== name) return c;
        const isConnecting = c.status === "Disconnected";
        return {
          ...c,
          status: isConnecting ? "Connected" : "Disconnected",
          lastSync: isConnecting ? "Just now" : "—",
          inventorySync: isConnecting ? "Synced" : "—",
          rateSync: isConnecting ? "In Parity" : "—",
          reservationSync: isConnecting ? "Active" : "Inactive"
        };
      })
    );
  };

  const handleToggleField = (name, field) => {
    setChannels((prev) =>
      prev.map((c) => (c.name === name ? { ...c, [field]: !c[field] } : c))
    );
  };

  const handleCommissionChange = (name, val) => {
    setChannels((prev) =>
      prev.map((c) => (c.name === name ? { ...c, commission: Number(val) } : c))
    );
  };

  const openLogs = (channel) => {
    setLogChannelName(channel.name);
    setSelectedLogs(channel.logs);
    setLogModalOpen(true);
  };

  const activeCount = channels.filter(c => c.status !== "Disconnected").length;
  const parityIssues = channels.filter(c => c.rateSync === "Rate Mismatch").length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={managementTabs} />

      {notification && (
        <Notice tone={notification.tone} title={notification.title}>
          {notification.body}
        </Notice>
      )}

      {/* Sync Error Alert Banner */}
      {parityIssues > 0 && (
        <Notice tone="warning" title="Rate Parity Discrepancy Alert">
          A rate discrepancy of ₹400 was logged on Goibibo. The channel is configured to block overbookings, but manual parity adjustment is recommended.
        </Notice>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1]">Active Channels</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{activeCount} / 4</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">MMT, Booking, Goibibo connected</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Parity Conflicts</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{parityIssues} Flagged</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">OTA discrepancy count</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-success">Active Gateway</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">XML 2-Way</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Latency &lt; 2 seconds</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-warning">Stop-Sells Active</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">
            {channels.filter(c => c.stopSell).length} OTAs
          </h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Tariff locks configured</p>
        </div>
      </div>

      {/* Global Toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="text-xs">
          <p className="font-bold text-navy">Property Scope: {userProperty.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Property ID: {userProperty.id}</p>
        </div>

        <Button
          onClick={handleSyncAll}
          disabled={loading}
          className="bg-navy hover:bg-navy-deep text-white shadow-soft text-xs h-8.5 px-4 font-bold gap-2"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Sync All Portals
        </Button>
      </div>

      {/* Channel Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {channels.map((chan) => (
          <Panel
            key={chan.name}
            title={chan.name}
            description="2-Way XML Distribution Channel Config"
            headerAddon={
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-[9px] uppercase tracking-wider ${
                chan.status === "Connected"
                  ? "bg-success/10 text-success border border-success/20"
                  : chan.status === "Syncing"
                  ? "bg-brand/10 text-brand border border-brand/20 animate-pulse"
                  : chan.status === "Failed"
                  ? "bg-warning/10 text-warning border border-warning/20"
                  : "bg-muted text-muted-foreground border border-muted-foreground/25"
              }`}>
                {chan.status}
              </span>
            }
          >
            <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-muted">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Sync</span>
                  <p className="font-semibold text-navy mt-0.5">{chan.lastSync}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right block">Inventory Sync</span>
                  <p className="font-semibold text-navy text-right mt-0.5">{chan.inventorySync}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Rate Sync</span>
                  <p className={`font-semibold mt-0.5 ${chan.rateSync === "Rate Mismatch" ? "text-error font-black" : "text-navy"}`}>
                    {chan.rateSync}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider text-right block">Reservation Sync</span>
                  <p className="font-semibold text-navy text-right mt-0.5">{chan.reservationSync}</p>
                </div>
              </div>

              {/* Commission tracking, stop-sell, close-out switches */}
              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Commission %</label>
                  <input
                    type="number"
                    value={chan.commission}
                    onChange={(e) => handleCommissionChange(chan.name, e.target.value)}
                    className="w-16 px-2 py-1 border border-muted rounded text-center font-bold text-navy focus:outline-none"
                  />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Stop Sell</span>
                  <button
                    onClick={() => handleToggleField(chan.name, "stopSell")}
                    className={`size-6 rounded-full flex items-center justify-center border transition-colors ${
                      chan.stopSell ? "bg-error text-white border-error" : "bg-white border-muted text-muted-foreground"
                    }`}
                  >
                    <Ban className="size-3.5" />
                  </button>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1">Close Out</span>
                  <button
                    onClick={() => handleToggleField(chan.name, "closeOut")}
                    className={`size-6 rounded-full flex items-center justify-center border transition-colors ${
                      chan.closeOut ? "bg-navy text-white border-navy" : "bg-white border-muted text-muted-foreground"
                    }`}
                  >
                    <XCircle className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-muted flex justify-between gap-1.5 select-none">
                <Button
                  onClick={() => handleToggleConnect(chan.name)}
                  variant="ghost"
                  className="text-[10px] h-8 text-navy font-bold px-2 hover:bg-muted/30"
                >
                  {chan.status === "Disconnected" ? "Connect Link" : "Disconnect Link"}
                </Button>
                
                <div className="flex gap-1.5">
                  <Button
                    onClick={() => openLogs(chan)}
                    variant="outline"
                    className="text-[10px] h-8 border-muted text-navy font-semibold px-2.5"
                  >
                    Sync Logs
                  </Button>
                  {chan.status !== "Disconnected" && (
                    <Button
                      onClick={() => handleSync(chan.name)}
                      className="bg-navy hover:bg-navy-deep text-white text-[10px] h-8 px-3 font-bold"
                    >
                      {chan.status === "Failed" ? "Retry Sync" : "Sync Now"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>

      {/* Sync Logs Modal */}
      {logModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-md">{logChannelName} Sync Audit logs</h3>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setLogModalOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
              {selectedLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground">No sync history logged.</p>
              ) : (
                <div className="space-y-3.5">
                  {selectedLogs.map((log, idx) => (
                    <div key={idx} className="flex gap-3 text-xs border-b border-muted/50 pb-2.5 last:border-0 last:pb-0">
                      <span className="font-mono text-muted-foreground shrink-0 select-none">[{log.time}]</span>
                      <span className="text-navy font-semibold leading-tight">{log.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button onClick={() => setLogModalOpen(false)} className="bg-navy hover:bg-navy-deep text-white text-xs h-8 px-4 font-bold">
                Close Logs
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}