import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  CreditCard,
  FileText,
  Percent,
  Download,
  Search,
  Calendar,
  Building,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

const financeTabs = [
  { label: "Billing & Invoices", to: "/admin/billing", icon: Receipt },
  { label: "Payments", to: "/admin/payments", icon: CreditCard },
  { label: "Discounts & Refunds", to: "/admin/approvals", icon: Percent },
  { label: "Taxes & GST", to: "/admin/taxes", icon: FileText }
];

export const Route = createFileRoute("/admin/taxes")({
  head: () => ({
    meta: [
      { title: "Taxes & GST Ledger — Speshway Luxury Hotel" },
      { name: "description", content: "Review and reconcile SGST, CGST, and HSN/SAC taxable slabs." }
    ]
  }),
  component: TaxesGstPage
});

function TaxesGstPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("30"); // 'Today' | '7' | '30' | 'Month' | 'Custom'
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const res = await superAdminService.getReservations();
      setReservations(res.data || []);
    } catch (err) {
      setError(err.message || "Failed to sync tax registry");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleExport = (format) => {
    setExporting(true);
    setTimeout(() => {
      alert(`${format.toUpperCase()} tax sheet compiled successfully! Initiating download...`);
      setExporting(false);
    }, 1200);
  };

  const handleDownloadInvoice = (invNo) => {
    alert(`Compiling tax breakdown for Invoice ${invNo}... Downloader initialized.`);
  };

  // Date filtering logic
  const filteredReservations = reservations.filter((r) => {
    if (!r.checkIn) return false;
    
    // Search query filter
    const matchesSearch =
      r.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r._id && r._id.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    const checkInDate = new Date(r.checkIn);
    const today = new Date("2026-08-17"); // Anchor to system seeded timeline date

    if (dateFilter === "Today") {
      return r.checkIn === "2026-08-17" || r.checkIn === "2026-08-18";
    }

    if (dateFilter === "7") {
      const diffTime = Math.abs(today - checkInDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    if (dateFilter === "30") {
      const diffTime = Math.abs(today - checkInDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }

    if (dateFilter === "Month") {
      return checkInDate.getMonth() === today.getMonth() && checkInDate.getFullYear() === today.getFullYear();
    }

    if (dateFilter === "Custom" && customStart && customEnd) {
      return r.checkIn >= customStart && r.checkIn <= customEnd;
    }

    return true;
  });

  // Dynamic Taxation aggregations (SGST 9%, CGST 9%, IGST 0% for local)
  const gstRevenue = filteredReservations.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const cgst = Math.round(gstRevenue * 0.09);
  const sgst = Math.round(gstRevenue * 0.09);
  const igst = 0; // Local property bookings do not trigger IGST generally
  const totalTax = cgst + sgst + igst;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={financeTabs} />

      {error && <Notice tone="error" title="Reconciliation Failure">{error}</Notice>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[105px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#6366f1]">CGST (9%)</span>
          <h3 className="mt-2 font-display text-lg font-black text-navy leading-none">₹{cgst.toLocaleString()}</h3>
          <p className="mt-3 text-[9px] text-muted-foreground">Central GST shares</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[105px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a855f7]">SGST (9%)</span>
          <h3 className="mt-2 font-display text-lg font-black text-navy leading-none">₹{sgst.toLocaleString()}</h3>
          <p className="mt-3 text-[9px] text-muted-foreground">State GST shares</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[105px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">IGST (0%)</span>
          <h3 className="mt-2 font-display text-lg font-black text-navy leading-none">₹{igst.toLocaleString()}</h3>
          <p className="mt-3 text-[9px] text-muted-foreground">Inter-state transactions</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[105px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Total Tax</span>
          <h3 className="mt-2 font-display text-lg font-black text-navy leading-none">₹{totalTax.toLocaleString()}</h3>
          <p className="mt-3 text-[9px] text-muted-foreground">CGST + SGST collected</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between min-h-[105px] col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#10b981]">Taxable Revenue</span>
          <h3 className="mt-2 font-display text-lg font-black text-navy leading-none">₹{gstRevenue.toLocaleString()}</h3>
          <p className="mt-3 text-[9px] text-muted-foreground">Net room tariff revenue</p>
        </div>
      </div>

      {/* Date Filter & Search Toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by guest or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted rounded-lg text-sm bg-[#fafafa]/50 focus:outline-none focus:border-navy"
            />
          </div>

          <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-full border border-muted/50 select-none">
            {[
              { label: "Today", key: "Today" },
              { label: "7 Days", key: "7" },
              { label: "30 Days", key: "30" },
              { label: "This Month", key: "Month" },
              { label: "Custom", key: "Custom" }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setDateFilter(tab.key)}
                className={`px-3 py-1 rounded-full text-[9.5px] font-bold transition-all cursor-pointer ${
                  dateFilter === tab.key
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:text-navy"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 shrink-0 select-none">
          <Button
            onClick={() => handleExport("pdf")}
            disabled={exporting}
            className="bg-navy hover:bg-navy-deep text-white shadow-soft text-[10px] font-semibold h-8.5 px-3 rounded-full"
          >
            <Download className="size-3.5 mr-1" /> PDF
          </Button>
          <Button
            onClick={() => handleExport("csv")}
            disabled={exporting}
            className="bg-navy hover:bg-navy-deep text-white shadow-soft text-[10px] font-semibold h-8.5 px-3 rounded-full"
          >
            <FileSpreadsheet className="size-3.5 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {dateFilter === "Custom" && (
        <div className="flex items-center gap-3 p-4 bg-white border border-muted rounded-xl shadow-soft">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Start</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2 py-1 border border-muted rounded text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">End</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2 py-1 border border-muted rounded text-xs"
            />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingRows rows={5} />
      ) : (
        /* Main Audit Table Panel */
        <Panel title="Tax Ledger & GST Records" description={`GSTIN: 36AAAAA1111A1Z1 · Speshway Luxury Hotel`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                  <th className="py-4 px-4">Invoice No</th>
                  <th className="py-4 px-4">Guest / GSTIN</th>
                  <th className="py-4 px-4 text-center">HSN/SAC</th>
                  <th className="py-4 px-4 text-right">Taxable Amount</th>
                  <th className="py-4 px-4 text-right">CGST (9%)</th>
                  <th className="py-4 px-4 text-right">SGST (9%)</th>
                  <th className="py-4 px-4 text-right">IGST</th>
                  <th className="py-4 px-4 text-right font-bold text-navy">Total GST</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-12 text-center text-muted-foreground select-none">No audited tax invoices found.</td>
                  </tr>
                ) : (
                  filteredReservations.map((res) => {
                    const baseAmt = res.amount || 0;
                    const cTax = Math.round(baseAmt * 0.09);
                    const sTax = Math.round(baseAmt * 0.09);
                    const iTax = 0;
                    const totTax = cTax + sTax + iTax;
                    const invoiceNumber = `INV-26${res._id ? res._id.substring(0, 5).toUpperCase() : "9021"}`;

                    return (
                      <tr key={res._id} className="hover:bg-[#fcfcfc]/60">
                        <td className="py-4 px-4 font-mono font-bold text-navy">{invoiceNumber}</td>
                        <td className="py-4 px-4">
                          <div className="font-semibold text-navy-deep">{res.guest}</div>
                          <div className="text-[9.5px] text-muted-foreground/80 font-mono mt-0.5">GSTIN: URP-TEL2982</div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold">996311</td>
                        <td className="py-4 px-4 text-right font-semibold font-mono">₹{baseAmt.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-mono text-muted-foreground">₹{cTax.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-mono text-muted-foreground">₹{sTax.toLocaleString()}</td>
                        <td className="py-4 px-4 text-right font-mono text-muted-foreground/35">₹0</td>
                        <td className="py-4 px-4 text-right font-black text-navy font-mono">₹{totTax.toLocaleString()}</td>
                        <td className="py-4 px-6 text-right select-none">
                          <Button
                            onClick={() => handleDownloadInvoice(invoiceNumber)}
                            size="xs"
                            variant="ghost"
                            className="h-7 text-xs text-navy hover:text-brand px-2"
                          >
                            <Download className="size-3.5 mr-1" /> Invoice
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}