import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Eye, Sliders, CheckCircle2, AlertTriangle, AlertCircle, X, ShieldAlert, Key } from "lucide-react";

function SuperAdminChannelManager() {
  const [loading, setLoading] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState("view"); // "view" | "manage"

  const [channels, setChannels] = useState([
    {
      name: "MakeMyTrip",
      properties: 6,
      status: "Connected",
      lastSync: "2 min ago",
      inventoryStatus: "Synced",
      rateStatus: "In Parity",
      reservations: 284,
      details: "MMT Indian market lead connectivity. High availability channel mapping dynamic pricing schema."
    },
    {
      name: "Goibibo",
      properties: 6,
      status: "Sync Issue",
      lastSync: "11 min ago",
      inventoryStatus: "Synced",
      rateStatus: "Rate Mismatch",
      reservations: 142,
      details: "Goibibo distribution node. Rate discrepancy detected on Deluxe Courtyard room category."
    },
    {
      name: "Booking.com",
      properties: 5,
      status: "Syncing",
      lastSync: "Syncing...",
      inventoryStatus: "Mismatch",
      rateStatus: "In Parity",
      reservations: 395,
      details: "Global OTA mapping connector. Active inventory mismatch logged for Lake Palace View property."
    },
    {
      name: "Agoda",
      properties: 4,
      status: "Disconnected",
      lastSync: "1 day ago",
      inventoryStatus: "—",
      rateStatus: "—",
      reservations: 89,
      details: "Pan-Asian market distribution node. Connection offline since August 16th due to auth token expiry."
    }
  ]);

  const handleSyncChannel = (index) => {
    setLoading(true);
    setTimeout(() => {
      setChannels(prev => prev.map((c, i) => {
        if (i !== index) return c;
        return {
          ...c,
          status: "Connected",
          lastSync: "Just now",
          inventoryStatus: "Synced",
          rateStatus: "In Parity"
        };
      }));
      setLoading(false);
    }, 1200);
  };

  const handleSyncAll = () => {
    setLoading(true);
    setTimeout(() => {
      setChannels(prev => prev.map(c => ({
        ...c,
        status: "Connected",
        lastSync: "Just now",
        inventoryStatus: "Synced",
        rateStatus: "In Parity"
      })));
      setLoading(false);
    }, 1800);
  };

  const handleOpenModal = (channel, type) => {
    setSelectedChannel(channel);
    setModalType(type);
    setModalOpen(true);
  };

  // Helper for sync status Tag tone
  const getSyncStatusTone = (status) => {
    if (status === "Connected") return "success";
    if (status === "Syncing") return "brand";
    if (status === "Sync Issue") return "warning";
    return "neutral"; // Disconnected
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channel Manager"
        subtitle="Manage global OTA distribution channels, monitor rate parity across portals, and audit 2-way XML synchronization."
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Connected Channels */}
        <div className="bg-card border rounded-2xl p-5 shadow-soft PremiumStatCard flex flex-col justify-between" style={{ "--accent-color": "#5B21B6" }}>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Connected Channels</span>
          <h4 className="font-display font-black text-2xl text-navy mt-2">3 / 4</h4>
          <p className="text-[10px] text-muted-foreground mt-1">MakeMyTrip, Goibibo, Booking</p>
        </div>

        {/* Active Properties */}
        <div className="bg-card border rounded-2xl p-5 shadow-soft PremiumStatCard flex flex-col justify-between" style={{ "--accent-color": "#4E7C59" }}>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Properties</span>
          <h4 className="font-display font-black text-2xl text-navy mt-2">6 Properties</h4>
          <p className="text-[10px] text-muted-foreground mt-1">Global group integration</p>
        </div>

        {/* Last Successful Sync */}
        <div className="bg-card border rounded-2xl p-5 shadow-soft PremiumStatCard flex flex-col justify-between" style={{ "--accent-color": "#F5C06A" }}>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Successful Sync</span>
          <h4 className="font-display font-black text-2xl text-navy mt-2">2 min ago</h4>
          <p className="text-[10px] text-muted-foreground mt-1">Via central XML gateway</p>
        </div>

        {/* Sync Issues */}
        <div className="bg-card border rounded-2xl p-5 shadow-soft PremiumStatCard flex flex-col justify-between" style={{ "--accent-color": "#FF6B8B" }}>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Sync Issues Flagged</span>
          <h4 className="font-display font-black text-2xl text-error mt-2">2 Mismatches</h4>
          <p className="text-[10px] text-muted-foreground mt-1">Requires immediate manual audit</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Channels Table */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="Connected Distribution Channels" description="XML mapping state and synced transactions across Indian & global OTAs.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Channel Name</th>
                    <th className="p-4">Connected Properties</th>
                    <th className="p-4">Sync Status</th>
                    <th className="p-4">Last Sync</th>
                    <th className="p-4">Inventory Status</th>
                    <th className="p-4">Rate Status</th>
                    <th className="p-4">Reservations Synced</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {channels.map((c, idx) => (
                    <tr key={c.name} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4 font-semibold text-navy text-sm">{c.name}</td>
                      <td className="p-4 font-medium text-navy-deep text-xs">{c.properties} Properties</td>
                      <td className="p-4">
                        <Tag tone={getSyncStatusTone(c.status)}>{c.status}</Tag>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground font-mono whitespace-nowrap">{c.lastSync}</td>
                      <td className="p-4">
                        <Tag tone={c.inventoryStatus === "Synced" ? "success" : c.inventoryStatus === "—" ? "neutral" : "error"}>
                          {c.inventoryStatus}
                        </Tag>
                      </td>
                      <td className="p-4">
                        <Tag tone={c.rateStatus === "In Parity" ? "success" : c.rateStatus === "—" ? "neutral" : "warning"}>
                          {c.rateStatus}
                        </Tag>
                      </td>
                      <td className="p-4 font-semibold text-navy font-mono text-xs">{c.reservations}</td>
                      <td className="p-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenModal(c, "view")}
                            className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenModal(c, "manage")}
                            className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer"
                            title="Manage Connection"
                          >
                            <Sliders className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Right: Parity Warning Alerts */}
        <div className="space-y-4">
          <Panel title="Distribution & Parity Alerts" description="Live synchronization mismatches.">
            <div className="p-4 space-y-4">
              {/* Rate Mismatch */}
              <Notice tone="warning" title="Rate Mismatch — Goibibo">
                <p className="mt-1 leading-relaxed text-[11px]">
                  Deluxe Room sold at ₹8,450 on Goibibo. This is <strong>₹450 below</strong> direct rate of ₹8,900 in Rambagh Residency.
                </p>
                <div className="mt-3 flex justify-start">
                  <button
                    onClick={() => handleSyncChannel(1)}
                    className="h-7 px-3.5 rounded-full bg-navy hover:bg-navy/90 text-white font-semibold text-[10px] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Fix Rate
                  </button>
                </div>
              </Notice>

              {/* Inventory Mismatch */}
              <Notice tone="error" title="Inventory Mismatch — Booking.com">
                <p className="mt-1 leading-relaxed text-[11px]">
                  Booking.com shows 5 available keys for Lake Palace View (Room Type: Premium Suite), while PMS reports 3 keys.
                </p>
                <div className="mt-3 flex justify-start">
                  <button
                    onClick={() => handleSyncChannel(2)}
                    className="h-7 px-3.5 rounded-full bg-navy hover:bg-navy/90 text-white font-semibold text-[10px] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Force Sync
                  </button>
                </div>
              </Notice>

              {/* Failed Sync Alert */}
              <Notice tone="error" title="Sync Timeout — Agoda">
                <p className="mt-1 leading-relaxed text-[11px]">
                  Vite gateway XML request returned timeout on transaction id 88204. Target node auth token is expired.
                </p>
                <div className="mt-3 flex justify-start">
                  <button
                    onClick={() => handleOpenModal(channels[3], "manage")}
                    className="h-7 px-3.5 rounded-full bg-navy hover:bg-navy/90 text-white font-semibold text-[10px] shadow-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    Re-authenticate
                  </button>
                </div>
              </Notice>
            </div>
          </Panel>
        </div>
      </div>

      {/* View/Manage Channel Modal */}
      {modalOpen && selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] relative border border-navy/5">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <div className="flex items-center gap-2">
                <Activity className="size-4.5 text-purple" />
                <h3 className="font-display font-bold text-lg text-navy">
                  {modalType === "view" ? `${selectedChannel.name} Connectivity Report` : `Configure ${selectedChannel.name} Connection`}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalType === "view" ? (
              <div className="py-4 space-y-4 text-left text-xs">
                <div className="space-y-3">
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Channel Provider</span>
                    <p className="text-sm text-navy font-semibold mt-0.5">{selectedChannel.name}</p>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Integration Details</span>
                    <p className="text-xs text-muted-foreground mt-1 bg-muted/40 p-2.5 rounded border leading-relaxed">{selectedChannel.details}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Properties Mapped</span>
                      <p className="text-xs text-navy font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedChannel.properties} Properties</p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Reservations Synced</span>
                      <p className="text-xs text-navy font-semibold mt-1 bg-muted/40 p-2 rounded border">{selectedChannel.reservations} bookings</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Last Sync</span>
                      <p className="text-xs text-navy font-semibold mt-1 bg-muted/40 p-2 rounded border font-mono">{selectedChannel.lastSync}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Connection Status</span>
                      <div className="mt-1">
                        <Tag tone={getSyncStatusTone(selectedChannel.status)}>{selectedChannel.status}</Tag>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full w-24">
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-4 text-left text-xs">
                <div className="space-y-4">
                  <Notice tone="info" title="Central XML Endpoint Configuration">
                    Use these settings to establish and map credentials for direct 2-way room rate sync.
                  </Notice>
                  <div className="space-y-1.5">
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Hotel Operator Code</span>
                    <input
                      type="text"
                      className="w-full bg-white border border-muted px-3 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple"
                      placeholder="e.g. HS-10492"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <span className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Integration Key / Token</span>
                    <input
                      type="password"
                      className="w-full bg-white border border-muted px-3 h-10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-purple"
                      placeholder="••••••••••••••••"
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-muted mt-5">
                  <Button variant="ghost" onClick={() => setModalOpen(false)} className="rounded-full">
                    Cancel
                  </Button>
                  <Button onClick={() => { setModalOpen(false); alert("Connection keys saved and verified."); }} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5">
                    Verify & Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/channel-manager")({
  head: () => ({
    meta: [
      { title: "Channel Manager — Hour Stay" },
      { name: "description", content: "Centralized OTA mapping connections and rate parity across properties." },
      { property: "og:title", content: "Channel Manager — Hour Stay" },
      { property: "og:description", content: "Centralized OTA mapping connections and rate parity across properties." }
    ]
  }),
  component: SuperAdminChannelManager
});