import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, statusTone } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/utils";
import { Download, Search, Percent, CreditCard, FileText } from "lucide-react";

const paymentsData = [
  { id: "TXN-9021", guest: "Karan Malhotra", property: "Rambagh Residency", mode: "Credit Card", time: "2 hours ago", amount: 15400, status: "Captured" },
  { id: "TXN-9022", guest: "Aisha Sharma", property: "Lake Palace View", mode: "UPI (GPay)", time: "4 hours ago", amount: 8900, status: "Captured" },
  { id: "TXN-9023", guest: "Rohan Varma", property: "Candolim Beach Resort", mode: "Net Banking", time: "6 hours ago", amount: 12500, status: "Captured" },
  { id: "TXN-9024", guest: "Meera Nair", property: "Backwater Retreat", mode: "Cash", time: "1 day ago", amount: 4500, status: "Captured" }
];

const invoicesData = [
  { id: "INV-2026-081", guest: "Karan Malhotra", property: "Rambagh Residency", folio: "FOL-8802", date: "13 Aug 2026", subtotal: 13050, gst: 2350, total: 15400, status: "Paid" },
  { id: "INV-2026-082", guest: "Aisha Sharma", property: "Lake Palace View", folio: "FOL-8803", date: "13 Aug 2026", subtotal: 7542, gst: 1358, total: 8900, status: "Paid" },
  { id: "INV-2026-083", guest: "Rohan Varma", property: "Candolim Beach Resort", folio: "FOL-8804", date: "12 Aug 2026", subtotal: 10593, gst: 1907, total: 12500, status: "Paid" },
  { id: "INV-2026-084", guest: "Meera Nair", property: "Backwater Retreat", folio: "FOL-8805", date: "12 Aug 2026", subtotal: 4018, gst: 482, total: 4500, status: "Paid" }
];

function SuperAdminReports() {
  const [activeTab, setActiveTab] = useState("payments"); // 'payments' | 'invoices' | 'gst'
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const res = await superAdminService.getProperties();
      if (res.success) {
        setProperties(res.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleExportCSV = () => {
    setExporting(true);
    setTimeout(() => {
      alert("Report compiled! Downloading CSV spreadsheet file...");
      setExporting(false);
    }, 1500);
  };

  const filteredProperties = properties.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredPayments = paymentsData.filter((p) => {
    return (
      p.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredInvoices = invoicesData.filter((inv) => {
    return (
      inv.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.property.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance Console"
        subtitle="Manage billing transactions, itemized room folios, invoices, and slabs-based GST tax reports."
        actions={
          <Button onClick={handleExportCSV} disabled={exporting} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 gap-2">
            <Download className="size-4" /> {exporting ? "Compiling..." : "Export CSV Ledger"}
          </Button>
        }
      />

      {error && <Notice tone="error" title="Finance Sync Error" className="text-left">{error}</Notice>}

      {/* Compact pill-shaped segmented tab bar */}
      <div className="flex justify-start mb-6">
        <div className="bg-white p-1 rounded-full border border-muted shadow-soft inline-flex items-center gap-1 overflow-x-auto max-w-full scrollbar-none">
          {[
            { label: "Payments Logs", key: "payments", icon: CreditCard },
            { label: "Room Invoices", key: "invoices", icon: FileText },
            { label: "GST & Taxes", key: "gst", icon: Percent }
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap",
                  active
                    ? "bg-purple/10 text-purple border border-purple/15 shadow-sm font-bold"
                    : "text-muted-foreground hover:text-navy hover:bg-muted/40 border border-transparent"
                )}
              >
                {tab.icon && <tab.icon className={cn("size-3.5", active ? "text-purple" : "text-muted-foreground")} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-4 bg-card border rounded-xl p-4 shadow-soft">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search transactions, guests, or hotels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11 rounded-full border-muted text-xs"
          />
        </div>
      </div>

      {activeTab === "payments" && (
        <Panel title="Payments Capture Logs" description="Recent card, UPI, and cash transactions.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Guest Name</th>
                  <th className="p-4">Hotel Property</th>
                  <th className="p-4">Payment Mode</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-semibold text-navy">{p.id}</td>
                    <td className="p-4 font-medium text-navy">{p.guest}</td>
                    <td className="p-4 text-muted-foreground">{p.property}</td>
                    <td className="p-4 text-muted-foreground font-semibold text-purple">{p.mode}</td>
                    <td className="p-4 text-muted-foreground">{p.time}</td>
                    <td className="p-4 text-right font-bold text-navy font-mono">₹{p.amount.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-right">
                      <Tag tone={statusTone(p.status)}>{p.status}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === "invoices" && (
        <Panel title="Room Billing Invoices" description="Completed guest stay folios.">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4">Invoice ID</th>
                  <th className="p-4">Guest Name</th>
                  <th className="p-4">Property</th>
                  <th className="p-4">Folio Reference</th>
                  <th className="p-4">Billing Date</th>
                  <th className="p-4 text-right">Subtotal</th>
                  <th className="p-4 text-right">GST Collection</th>
                  <th className="p-4 text-right">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-semibold text-navy">{inv.id}</td>
                    <td className="p-4 font-medium text-navy">{inv.guest}</td>
                    <td className="p-4 text-muted-foreground">{inv.property}</td>
                    <td className="p-4 text-muted-foreground font-mono">{inv.folio}</td>
                    <td className="p-4 text-muted-foreground">{inv.date}</td>
                    <td className="p-4 text-right text-muted-foreground font-mono">₹{inv.subtotal.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-right text-purple font-mono">₹{inv.gst.toLocaleString("en-IN")}</td>
                    <td className="p-4 text-right font-bold text-navy font-mono">₹{inv.total.toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {activeTab === "gst" && (
        <Panel title="GST Tax Billing Ledger" description="Monthly GST breakdown (Slab based: 12% under ₹7500, 18% at or above ₹7500 tariff).">
          {loading ? (
            <LoadingRows rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                    <th className="p-4">Hotel Property</th>
                    <th className="p-4">GST Slab Rate</th>
                    <th className="p-4">Total Rooms Sold</th>
                    <th className="p-4">Taxable Room Revenues</th>
                    <th className="p-4">SGST collected</th>
                    <th className="p-4">CGST collected</th>
                    <th className="p-4 text-right">Consolidated GST Liability</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-sans">
                  {filteredProperties.map((p) => {
                    const monthlyRev = Math.round((p.rooms * (p.occupancy / 100) * p.adr * 30));
                    const slabRate = p.adr >= 7500 ? 0.18 : 0.12;
                    const taxable = Math.round(monthlyRev / (1 + slabRate));
                    const gst = monthlyRev - taxable;
                    const halfGst = Math.round(gst / 2);

                    return (
                      <tr key={p.id || p._id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-semibold text-navy text-sm">{p.name}</p>
                            <p className="text-muted-foreground text-xs">{p.city}</p>
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-purple">
                          {slabRate * 100}% GST (ADR: ₹{p.adr})
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {Math.round(p.rooms * (p.occupancy / 100) * 30)} keys/nights
                        </td>
                        <td className="p-4 font-mono font-medium text-navy">
                          ₹{taxable.toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 font-mono text-muted-foreground">
                          ₹{halfGst.toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 font-mono text-muted-foreground">
                          ₹{halfGst.toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right font-bold text-navy font-mono text-sm">
                          ₹{gst.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — Hour Stay" },
      { name: "description", content: "Portfolio MIS, source mix and revenue trends." },
      { property: "og:title", content: "Reports & Analytics — Hour Stay" },
      { property: "og:description", content: "Portfolio MIS, source mix and revenue trends." }
    ]
  }),
  component: SuperAdminReports
});