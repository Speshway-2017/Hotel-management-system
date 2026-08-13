import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, Tag, statusTone, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Activity, Check, AlertTriangle, AlertCircle } from "lucide-react";

function SuperAdminChannelManager() {
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState([
    { name: "MakeMyTrip", status: "Connected", rooms: 42, lastSync: "2 min ago", parity: "In parity", enabled: true },
    { name: "Booking.com", status: "Connected", rooms: 38, lastSync: "6 min ago", parity: "In parity", enabled: true },
    { name: "Goibibo", status: "Connected", rooms: 30, lastSync: "11 min ago", parity: "Rate mismatch", enabled: true },
    { name: "Agoda", status: "Syncing", rooms: 24, lastSync: "Syncing…", parity: "In parity", enabled: true },
    { name: "Airbnb", status: "Disconnected", rooms: 0, lastSync: "3 days ago", parity: "—", enabled: false }
  ]);

  const handleSyncAll = () => {
    setLoading(true);
    setTimeout(() => {
      setChannels(prev => prev.map(c => {
        if (!c.enabled) return c;
        return {
          ...c,
          status: "Connected",
          lastSync: "Just now",
          parity: c.name === "Goibibo" ? "Rate mismatch" : "In parity"
        };
      }));
      setLoading(false);
    }, 1500);
  };

  const handleToggleChannel = (index) => {
    setChannels(prev => prev.map((c, i) => {
      if (i !== index) return c;
      const willEnable = !c.enabled;
      return {
        ...c,
        enabled: willEnable,
        status: willEnable ? "Connected" : "Disconnected",
        lastSync: willEnable ? "Just now" : "—",
        parity: willEnable ? "In parity" : "—"
      };
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channel Manager"
        subtitle="Manage global OTA distribution channels, synchronize room rates and availability, and monitor rate parity across portals."
        actions={
          <Button onClick={handleSyncAll} disabled={loading} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 gap-2">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Sync All Channels
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Channel connections table */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="OTA Channels" description="Global OTA distributors mapping status.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Channel Portal</th>
                    <th className="p-4">Sync Status</th>
                    <th className="p-4">Rooms Mapped</th>
                    <th className="p-4">Last Synced</th>
                    <th className="p-4">Rate Parity</th>
                    <th className="p-4 text-right">Channel Connection</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {channels.map((c, idx) => (
                    <tr key={c.name} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4 font-semibold text-navy text-sm">{c.name}</td>
                      <td className="p-4">
                        <Tag tone={statusTone(c.status)}>{c.status}</Tag>
                      </td>
                      <td className="p-4 font-medium text-navy text-xs">{c.rooms} rooms</td>
                      <td className="p-4 text-xs text-muted-foreground">{c.lastSync}</td>
                      <td className="p-4">
                        <Tag tone={c.parity === "In parity" ? "success" : c.parity === "—" ? "neutral" : "warning"}>
                          {c.parity}
                        </Tag>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center">
                          <Switch
                            checked={c.enabled}
                            onCheckedChange={() => handleToggleChannel(idx)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Parity warning box */}
        <div className="space-y-4">
          <Panel title="Parity Discrepancy Warnings" description="Live rate mismatches detected.">
            <div className="p-4 space-y-4">
              <Notice tone="warning" title="Rate Parity Alert — Goibibo">
                <p className="mt-1 leading-relaxed text-xs">
                  Deluxe Courtyard is sold at ₹8,450 on Goibibo, which is <strong>₹450 below</strong> direct rate of ₹8,900 in Rambagh Residency.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="xs" variant="outline" className="text-[10px] h-7 bg-white text-navy font-semibold hover:bg-muted">Fix Rate</Button>
                  <Button size="xs" variant="ghost" className="text-[10px] h-7 text-muted-foreground">Dismiss</Button>
                </div>
              </Notice>

              <div className="rounded-xl border border-navy/5 bg-cream/30 p-5 space-y-2">
                <div className="flex gap-2.5 items-center text-navy font-semibold text-xs">
                  <Activity className="size-4 text-purple" />
                  <span>Real-Time 2-Way Sync</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Hour Stay uses XML 2-way sync to update rates and inventories instantly. In case of mismatch alerts, rates are auto-corrected within 15 minutes.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/channel-manager")({
  head: () => ({
    meta: [
      { title: "Channel Manager — Hour Stay" },
      { name: "description", content: "OTA connections and rate parity across the group." },
      { property: "og:title", content: "Channel Manager — Hour Stay" },
      { property: "og:description", content: "OTA connections and rate parity across the group." }
    ]
  }),
  component: SuperAdminChannelManager
});