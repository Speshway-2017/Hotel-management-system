import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, HorizontalRouteTabs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bell, ShieldAlert, Sparkles, Megaphone, ScrollText } from "lucide-react";

const systemTabs = [
  { label: "Alerts & Notifications", to: "/super-admin/notifications", icon: Bell },
  { label: "Audit Trails", to: "/super-admin/audit-logs", icon: ScrollText },
  { label: "CMS & Landing Branding", to: "/super-admin/branding", icon: Sparkles }
];

function SuperAdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form Fields for new announcement
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    tone: "info"
  });

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await superAdminService.getAnnouncements();
      if (res.success) {
        setNotifications(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await superAdminService.publishAnnouncement(formData);
      if (res.success) {
        setSuccessMsg("Announcement published successfully!");
        setFormData({ title: "", body: "", tone: "info" });
        loadNotifications();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      setError(err.message || "Failed to publish announcement");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Announcements"
        subtitle="Broadcast announcements to property managers or review system alerts and parity notifications."
      />

      <HorizontalRouteTabs tabs={systemTabs} />

      {error && <Notice tone="error" title="Notification Error" className="text-left">{error}</Notice>}
      {successMsg && <Notice tone="success" title="Success" className="text-left">{successMsg}</Notice>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left main column: list current notifications */}
        <div className="lg:col-span-2 space-y-4">
          <Panel title="Announcement History & Active Alerts" description={`Showing ${notifications.length} alerts`}>
            {loading ? (
              <LoadingRows rows={4} />
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No announcements or system notifications recorded.</div>
            ) : (
              <div className="p-4 space-y-4">
                {notifications.map((n) => (
                  <Notice key={n.id || n._id} tone={n.tone} title={n.title}>
                    <div className="flex justify-between items-start gap-4">
                      <p className="mt-1 leading-relaxed text-xs">{n.body}</p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{n.time || "Just now"}</span>
                    </div>
                  </Notice>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right column: publish new announcement */}
        <div className="space-y-4">
          <Panel title="Publish Global Broadcast" description="Send a notification to all active properties.">
            <form onSubmit={handleFormSubmit} className="p-4 space-y-4 text-left">
              <div>
                <Label htmlFor="ann-title" className="text-xs text-navy font-semibold">Announcement Title</Label>
                <Input
                  id="ann-title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Parity Discrepancy Action Required"
                  className="mt-1 h-10 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="ann-body" className="text-xs text-navy font-semibold">Message Body</Label>
                <Textarea
                  id="ann-body"
                  required
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Provide detailed description of the notice or operational warning..."
                  className="mt-1 min-h-[100px] text-xs resize-none"
                />
              </div>

              <div>
                <Label htmlFor="ann-tone" className="text-xs text-navy font-semibold">Alert Severity Level</Label>
                <select
                  id="ann-tone"
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full bg-white border border-muted px-3 h-10 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-purple mt-1"
                >
                  <option value="info">Info (Blue Notice)</option>
                  <option value="success">Success (Green Notice)</option>
                  <option value="warning">Warning (Gold Notice)</option>
                  <option value="error">Critical Error (Blush Pink Notice)</option>
                </select>
              </div>

              <Button type="submit" className="w-full bg-navy hover:bg-navy/90 text-white rounded-full h-11 text-xs gap-2">
                <Megaphone className="size-4" /> Publish Broadcast
              </Button>
            </form>
          </Panel>

          <div className="rounded-xl border border-navy/5 bg-cream/30 p-5 space-y-2">
            <div className="flex gap-2.5 items-center text-navy font-semibold text-xs">
              <Sparkles className="size-4 text-purple" />
              <span>Multi-Property Broadcasting</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Broadcasts are instantly delivered to all front desk workspaces, general managers, and property admin dashboards in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/super-admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Hour Stay" },
      { name: "description", content: "Group-level alerts and announcements." },
      { property: "og:title", content: "Notifications — Hour Stay" },
      { property: "og:description", content: "Group-level alerts and announcements." }
    ]
  }),
  component: SuperAdminNotifications
});