import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Building,
  CheckCircle,
  Download,
  Receipt
} from "lucide-react";

export function SuperAdminViewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadReportDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [reportsRes, resRes] = await Promise.all([
          superAdminService.getCommissionReports().catch(() => ({})),
          superAdminService.getReservations().catch(() => ({}))
        ]);

        if (reportsRes && reportsRes.success && reportsRes.data) {
          const list = reportsRes.data.propertyReports || [];
          const found = list.find(r => r.id === id || r.propertyId === id);
          if (found) {
            setRecord(found);
          } else {
            setError("Commission statement record not found.");
          }
        } else {
          setError("Failed to fetch commission statements ledger.");
        }

        if (resRes && resRes.success && Array.isArray(resRes.data)) {
          setReservations(resRes.data);
        }
      } catch (err) {
        setError(err.message || "Failed to load commission report details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadReportDetails();
    }
  }, [id]);

  const handleExportPDF = () => {
    setExporting(true);
    setTimeout(() => {
      window.print();
      setExporting(false);
    }, 500);
  };

  const handleMarkSettled = () => {
    if (!record) return;
    setRecord(prev => ({
      ...prev,
      settlementStatus: "Settled",
      settledAmount: prev.commissionAmount,
      pendingAmount: 0,
      settlementDate: new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })
    }));
    toast.success(`Statement ${record.id} successfully marked as Settled.`);
  };

  // Filter reservations related to this property
  const propertyReservations = record
    ? reservations.filter(r => r.propertyId === record.propertyId || r.propertyId === record.id)
    : [];

  return (
    <div className="space-y-6 text-left font-ui">
      <PageHeader
        title={record ? `Commission Statement: ${record.propertyName}` : "Commission Statement Details"}
        subtitle="Comprehensive property commission audit, payout settlements ledger, and transaction logs."
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleExportPDF}
              className="rounded-full bg-navy hover:bg-navy/90 text-white text-xs font-semibold gap-1.5 cursor-pointer shadow-soft"
            >
              <Download className="size-3.5" /> Download Statement
            </Button>
          </div>
        }
      />

      {error && <Notice tone="error" title="Report Notice">{error}</Notice>}

      {loading ? (
        <LoadingRows count={4} />
      ) : record ? (
        <div className="space-y-6">
          {/* Top 2-Column Split: Property Profile & Financial Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Property & Contract Profile */}
            <Panel title="Property & Contract Profile" description="Authorized property partnership details.">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 p-4 border border-navy/10 rounded-xl bg-cream/30">
                  <div className="size-12 rounded-full bg-purple/10 text-purple flex items-center justify-center font-extrabold text-lg shrink-0">
                    <Building className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-navy text-sm">{record.propertyName}</h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">{record.city}</span>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Statement Ref ID</span>
                    <span className="font-mono font-bold text-navy">{record.id}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Property Key</span>
                    <span className="font-mono font-bold text-purple">{record.propertyId}</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Total Stays Billed</span>
                    <span className="font-bold text-navy">{record.bookingCount} Bookings</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Commission Slab</span>
                    <span className="font-bold text-navy font-mono">{record.commissionRate}% Flat</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Settlement Status</span>
                    <Tag
                      tone={record.settlementStatus === "Settled" ? "success" : record.settlementStatus === "Pending" ? "warning" : "neutral"}
                      className="text-xs font-bold px-2.5 py-0.5"
                    >
                      {record.settlementStatus}
                    </Tag>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Last Settlement Date</span>
                    <span className="font-semibold text-navy font-mono">{record.settlementDate}</span>
                  </div>
                </div>

                {record.settlementStatus === "Pending" && (
                  <div className="pt-2">
                    <Button
                      onClick={handleMarkSettled}
                      className="w-full rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer gap-1.5 shadow-soft"
                    >
                      <CheckCircle className="size-3.5" /> Mark Balance as Settled
                    </Button>
                  </div>
                )}
              </div>
            </Panel>

            {/* 2. Financial Ledger Breakdown */}
            <Panel title="Settlement Breakdown Ledger" description="Itemized calculation of commissions and billing fees.">
              <div className="p-5 bg-white rounded-b-xl space-y-3.5 text-xs font-sans">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-muted/50">
                    <span className="text-muted-foreground font-medium">Total Gross Bookings Value (Est.):</span>
                    <span className="font-mono font-bold text-navy text-sm">
                      ₹{Math.round(record.commissionAmount / (record.commissionRate / 100)).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-muted/50">
                    <span className="text-muted-foreground font-medium">Applied Commission Rate:</span>
                    <span className="font-mono font-bold text-purple">{record.commissionRate}%</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-muted/50">
                    <span className="text-muted-foreground font-medium">Total Platform Commission Receivable:</span>
                    <span className="font-mono font-bold text-navy text-sm">₹{record.commissionAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-muted/50 text-emerald-700 font-medium">
                    <span>Less: Already Disbursed / Settled:</span>
                    <span className="font-mono font-bold text-sm">- ₹{record.settledAmount.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 bg-muted/20 px-4 rounded-xl border border-muted/40 font-bold text-sm mt-2">
                    <span className="text-navy">Net Outstanding Balance:</span>
                    <span className={record.pendingAmount > 0 ? "text-rose-600 font-mono text-base" : "text-emerald-600 font-mono text-base"}>
                      ₹{record.pendingAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* 3. Associated Property Transactions - Full Page Width */}
          <Panel title="Associated Property Transactions" description="Recent reservations contributing to this settlement ledger across this property node.">
            <div className="bg-white rounded-b-xl overflow-x-auto">
              {propertyReservations.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground font-medium">
                  No individual reservation logs linked to this property node.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-3.5 pl-6 text-left w-[20%]">Booking ID</th>
                      <th className="p-3.5 text-left w-[22%]">Guest Name</th>
                      <th className="p-3.5 text-left w-[14%]">Room</th>
                      <th className="p-3.5 text-left w-[18%]">Stay Dates</th>
                      <th className="p-3.5 text-left w-[13%]">Tariff</th>
                      <th className="p-3.5 text-left pr-6 w-[13%]">Est. Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {propertyReservations.map((res) => {
                      const estComm = Math.round((res.amount || 0) * (record.commissionRate / 100));
                      return (
                        <tr key={res.id || res._id} className="hover:bg-muted/15 transition-colors">
                          <td className="p-3.5 pl-6 font-mono font-bold text-navy text-left">{res.id || res._id}</td>
                          <td className="p-3.5 font-semibold text-navy text-left">{res.guest}</td>
                          <td className="p-3.5 text-muted-foreground text-left">Room {res.room}</td>
                          <td className="p-3.5 text-muted-foreground font-mono text-[11px] text-left">{res.checkIn} — {res.checkOut}</td>
                          <td className="p-3.5 text-left font-bold text-navy font-mono">₹{(res.amount || 0).toLocaleString("en-IN")}</td>
                          <td className="p-3.5 text-left pr-6 font-bold text-purple font-mono">₹{estComm.toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/reports/view/$id")({
  head: () => ({
    meta: [
      { title: "Commission Statement Details — Super Admin | Hour Stay" },
      { name: "description", content: "Detailed platform commission and settlement statement view." }
    ]
  }),
  component: SuperAdminViewReport
});

export default SuperAdminViewReport;
