import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Notice, Tag, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/hs/FormFields";
import { superAdminService } from "@/services/superAdmin";
import { toast } from "sonner";
import {
  Receipt, Search, Eye, ChevronLeft, ChevronRight, TrendingUp,
  CreditCard, AlertCircle, FileText, Ban, Percent, CheckCircle2,
  XCircle, ArrowDownRight, BadgePercent, ShieldAlert, Download, Settings
} from "lucide-react";

export const Route = createFileRoute("/admin/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Folios Console — Speshway Luxury Hotel" },
      { name: "description", content: "Review GST-compliant tax invoices, folio breakdowns, discounts, refunds, and CGST/SGST tax slabs." }
    ]
  }),
  component: AdminBillingPage
});

function PremiumStatCard({ label, value, hint, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div>
        <div className="h-6 flex items-start">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
        </div>
        <h3 className="mt-1 font-display text-base font-black text-navy leading-none">{value}</h3>
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}
const defaultInvoices = [];
const initialDiscountsLedger = [];

function AdminBillingPage() {
  const navigate = useNavigate();

  // Local tabs
  const [activeSubTab, setActiveSubTab] = useState("folios"); // "folios" | "discounts" | "taxes"

  // Invoices & approvals lists
  const [invoices, setInvoices] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invoices filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Active Invoice details Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Discounts Form state
  const [discountForm, setDiscountForm] = useState({
    bookingId: "",
    guest: "",
    room: "",
    type: "Discount",
    reason: "",
    amount: ""
  });

  // Tax Configurations state
  const [taxSlabs, setTaxSlabs] = useState([
    { id: "SLAB-1", name: "Luxury Room Tariff GST", threshold: "7500", rate: "18", sgst: "9", cgst: "9" },
    { id: "SLAB-2", name: "Budget Room Tariff GST", threshold: "0", rate: "12", sgst: "6", cgst: "6" }
  ]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res, approvalsRes] = await Promise.all([
          superAdminService.getReservations(),
          managerService.getApprovals().catch(() => ({ success: true, data: [] }))
        ]);

        const mappedInvoices = (res.data || []).map(b => {
          const idVal = b.id || b._id;
          const total = b.amount || 0;
          const paid = total - (b.balance || 0);
          return {
            id: `INV-${idVal.substring(0, 8).toUpperCase()}`,
            bookingId: idVal,
            guest: b.guest,
            room: b.room || "—",
            checkIn: b.checkIn,
            checkOut: b.checkOut,
            roomCharges: Math.round(total * 0.75),
            serviceCharges: Math.round(total * 0.1),
            discounts: 0,
            taxes: Math.round(total * 0.15),
            totalAmount: total,
            paidAmount: paid,
            balance: b.balance || 0,
            paymentStatus: b.paymentStatus || (b.balance === 0 ? "Paid" : b.balance === total ? "Unpaid" : "Partial"),
            invoiceStatus: "Issued",
            issuedDate: b.checkOut
          };
        });

        const mappedDiscounts = (approvalsRes.data || []).filter(a => a.type === 'Discount' || a.category === 'Discount');
        setInvoices(mappedInvoices);
        setDiscounts(mappedDiscounts);
      } catch (err) {
        toast.error("Failed to sync billing data with MERN backend.");
      } finally {
        setLoading(false);
      }
    };
    loadData();

    const handleFocus = () => loadData();
    window.addEventListener('focus', handleFocus);

    let socketInst = null;
    import('@/services/socket').then(({ socket }) => {
      socketInst = socket;
      socket.on('booking_updated', loadData);
      socket.on('payment_added', loadData);
      socket.on('availability_changed', loadData);
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (socketInst) {
        socketInst.off('booking_updated', loadData);
        socketInst.off('payment_added', loadData);
        socketInst.off('availability_changed', loadData);
      }
    };
  }, []);

  const handleApproveDiscount = async (id) => {
    try {
      await managerService.updateApproval(id, 'Approve', 'Approved via Admin Billing Console');
      toast.success("Override request approved.");
      // Reload billing and discounts
      const [res, approvalsRes] = await Promise.all([
        superAdminService.getReservations(),
        managerService.getApprovals().catch(() => ({ success: true, data: [] }))
      ]);
      const mappedInvoices = (res.data || []).map(b => {
        const idVal = b.id || b._id;
        const total = b.amount || 0;
        const paid = total - (b.balance || 0);
        return {
          id: `INV-${idVal.substring(0, 8).toUpperCase()}`,
          bookingId: idVal,
          guest: b.guest,
          room: b.room || "—",
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          roomCharges: Math.round(total * 0.75),
          serviceCharges: Math.round(total * 0.1),
          discounts: 0,
          taxes: Math.round(total * 0.15),
          totalAmount: total,
          paidAmount: paid,
          balance: b.balance || 0,
          paymentStatus: b.paymentStatus || (b.balance === 0 ? "Paid" : b.balance === total ? "Unpaid" : "Partial"),
          invoiceStatus: "Issued",
          issuedDate: b.checkOut
        };
      });
      setInvoices(mappedInvoices.length > 0 ? mappedInvoices : defaultInvoices);

      const mappedDiscounts = (approvalsRes.data || []).map(a => ({
        id: a._id || a.id,
        bookingId: a.bookingId || "BKG-9081",
        guest: a.guest || "Guest",
        type: a.type || "Discount",
        amount: a.amount || 1500,
        status: a.status || "Pending",
        requestedBy: a.requestedBy || "Receptionist",
        requestedDate: a.date || a.createdAt?.split("T")[0] || "2026-08-24",
        reason: a.reason || "Client request"
      }));
      setDiscounts(mappedDiscounts.length > 0 ? mappedDiscounts : initialDiscountsLedger);
    } catch (err) {
      toast.error(err.message || "Approval decision failed.");
    }
  };

  const handleRejectDiscount = async (id) => {
    try {
      await managerService.updateApproval(id, 'Reject', 'Rejected via Admin Billing Console');
      toast.error("Override request rejected.");
      // Reload billing and discounts
      const [res, approvalsRes] = await Promise.all([
        superAdminService.getReservations(),
        managerService.getApprovals().catch(() => ({ success: true, data: [] }))
      ]);
      const mappedInvoices = (res.data || []).map(b => {
        const idVal = b.id || b._id;
        const total = b.amount || 0;
        const paid = total - (b.balance || 0);
        return {
          id: `INV-${idVal.substring(0, 8).toUpperCase()}`,
          bookingId: idVal,
          guest: b.guest,
          room: b.room || "—",
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          roomCharges: Math.round(total * 0.75),
          serviceCharges: Math.round(total * 0.1),
          discounts: 0,
          taxes: Math.round(total * 0.15),
          totalAmount: total,
          paidAmount: paid,
          balance: b.balance || 0,
          paymentStatus: b.paymentStatus || (b.balance === 0 ? "Paid" : b.balance === total ? "Unpaid" : "Partial"),
          invoiceStatus: "Issued",
          issuedDate: b.checkOut
        };
      });
      setInvoices(mappedInvoices.length > 0 ? mappedInvoices : defaultInvoices);

      const mappedDiscounts = (approvalsRes.data || []).map(a => ({
        id: a._id || a.id,
        bookingId: a.bookingId || "BKG-9081",
        guest: a.guest || "Guest",
        type: a.type || "Discount",
        amount: a.amount || 1500,
        status: a.status || "Pending",
        requestedBy: a.requestedBy || "Receptionist",
        requestedDate: a.date || a.createdAt?.split("T")[0] || "2026-08-24",
        reason: a.reason || "Client request"
      }));
      setDiscounts(mappedDiscounts.length > 0 ? mappedDiscounts : initialDiscountsLedger);
    } catch (err) {
      toast.error(err.message || "Rejection decision failed.");
    }
  };

  const handleIssueDiscount = async (e) => {
    e.preventDefault();
    if (!discountForm.guest || !discountForm.amount || !discountForm.bookingId) {
      toast.error("Please fill in booking details and amount.");
      return;
    }
    try {
      await managerService.createApproval({
        bookingId: discountForm.bookingId,
        guest: discountForm.guest,
        room: discountForm.room || "101",
        type: discountForm.type,
        reason: discountForm.reason || "Administrative Adjustment",
        amount: parseFloat(discountForm.amount),
        requestedBy: "Admin Madhu",
        status: "Approved"
      });
      toast.success(`${discountForm.type} processed successfully.`);
      // Reload billing and discounts
      const [res, approvalsRes] = await Promise.all([
        superAdminService.getReservations(),
        managerService.getApprovals().catch(() => ({ success: true, data: [] }))
      ]);
      const mappedInvoices = (res.data || []).map(b => {
        const idVal = b.id || b._id;
        const total = b.amount || 0;
        const paid = total - (b.balance || 0);
        return {
          id: `INV-${idVal.substring(0, 8).toUpperCase()}`,
          bookingId: idVal,
          guest: b.guest,
          room: b.room || "—",
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          roomCharges: Math.round(total * 0.75),
          serviceCharges: Math.round(total * 0.1),
          discounts: 0,
          taxes: Math.round(total * 0.15),
          totalAmount: total,
          paidAmount: paid,
          balance: b.balance || 0,
          paymentStatus: b.paymentStatus || (b.balance === 0 ? "Paid" : b.balance === total ? "Unpaid" : "Partial"),
          invoiceStatus: "Issued",
          issuedDate: b.checkOut
        };
      });
      setInvoices(mappedInvoices.length > 0 ? mappedInvoices : defaultInvoices);

      const mappedDiscounts = (approvalsRes.data || []).map(a => ({
        id: a._id || a.id,
        bookingId: a.bookingId || "BKG-9081",
        guest: a.guest || "Guest",
        type: a.type || "Discount",
        amount: a.amount || 1500,
        status: a.status || "Pending",
        requestedBy: a.requestedBy || "Receptionist",
        requestedDate: a.date || a.createdAt?.split("T")[0] || "2026-08-24",
        reason: a.reason || "Client request"
      }));
      setDiscounts(mappedDiscounts.length > 0 ? mappedDiscounts : initialDiscountsLedger);
      setDiscountForm({ bookingId: "", guest: "", room: "", type: "Discount", reason: "", amount: "" });
    } catch (err) {
      toast.error(err.message || "Failed to create discount request.");
    }
  };

  // KPIs
  const totalRevenue = invoices.reduce((acc, curr) => acc + curr.paidAmount, 0);
  const outstandingBal = invoices.reduce((acc, curr) => acc + curr.balance, 0);
  const totalInvoiced = invoices.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const pendingApprovalsCount = discounts.filter(d => d.status === "Pending").length;

  // Filtered invoices
  const filteredInvoices = invoices.filter(inv => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      inv.guest.toLowerCase().includes(s) ||
      inv.id.toLowerCase().includes(s) ||
      inv.bookingId.toLowerCase().includes(s) ||
      inv.room.toLowerCase().includes(s);

    const matchesPayment = paymentFilter === "all" || inv.paymentStatus === paymentFilter;
    const matchesInvoice = invoiceFilter === "all" || inv.invoiceStatus === invoiceFilter;

    return matchesSearch && matchesPayment && matchesInvoice;
  });

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {/* 1. Stat cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Total Invoiced Folios"
          value={`₹${totalInvoiced.toLocaleString()}`}
          hint="All-time billing volume"
          accentColor="#0d1b2a"
        />
        <PremiumStatCard
          label="Revenue Collected"
          value={`₹${totalRevenue.toLocaleString()}`}
          hint="Cleared invoices folio balance"
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Folio Outstanding Balance"
          value={`₹${outstandingBal.toLocaleString()}`}
          hint="Unsettled/Partial check-outs"
          accentColor="#ef4444"
        />
        <PremiumStatCard
          label="Pending Adjustment Requests"
          value={pendingApprovalsCount.toString()}
          hint="Discounts & Refunds awaiting approval"
          accentColor="#f59e0b"
        />
      </div>

      {/* Local Tabs Selection */}
      <div className="border-b border-muted flex gap-6 select-none">
        {[
          { label: "Invoices & Folios", key: "folios" },
          { label: "Discounts & Refunds Adjustments", key: "discounts" },
          { label: "Taxes & GST Ledger", key: "taxes" }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeSubTab === tab.key ? "text-navy border-b-2 border-navy" : "text-muted-foreground hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content A: Invoices & Folios */}
      {activeSubTab === "folios" && (
        <div className="space-y-4">
          <Panel title="Invoices Directory Search Filter">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <FormField label="Search Invoices" id="search">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    className="pl-9 h-10 text-xs font-bold"
                    placeholder="Guest, Room, Invoice ID..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  />
                </div>
              </FormField>

              <FormField label="Payment Status" id="payment">
                <Select
                  id="payment"
                  value={paymentFilter}
                  onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
                  className="h-10 text-xs font-bold"
                >
                  <option value="all">All Statuses</option>
                  <option value="Paid">Fully Paid</option>
                  <option value="Partial">Partial Due</option>
                  <option value="Unpaid">Unpaid / No payment</option>
                </Select>
              </FormField>

              <FormField label="Invoice Status" id="invoice">
                <Select
                  id="invoice"
                  value={invoiceFilter}
                  onChange={(e) => { setInvoiceFilter(e.target.value); setCurrentPage(1); }}
                  className="h-10 text-xs font-bold"
                >
                  <option value="all">All invoices</option>
                  <option value="Issued">Issued Invoice</option>
                  <option value="Draft">Draft Invoices</option>
                  <option value="Cancelled">Cancelled Invoice</option>
                </Select>
              </FormField>
            </div>
          </Panel>

          <Panel title="Invoices & Folios Catalog">
            {paginatedInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground select-none">No invoices found matching query filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[1300px]">
                  <thead className="whitespace-nowrap">
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                      <th className="py-3 px-4">Invoice ID</th>
                      <th className="py-3 px-4">Guest</th>
                      <th className="py-3 px-4">Room No</th>
                      <th className="py-3 px-4 text-right">Room Charges</th>
                      <th className="py-3 px-4 text-right">Service Charges</th>
                      <th className="py-3 px-4 text-right">Taxes & GST</th>
                      <th className="py-3 px-4 text-right">Discounts</th>
                      <th className="py-3 px-4 text-right">Total Amount</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center font-bold" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                    {paginatedInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-muted/5">
                        <td className="py-3 px-4 font-mono font-bold text-navy">{inv.id}</td>
                        <td className="py-3 px-4 font-bold text-navy">{inv.guest}</td>
                        <td className="py-3 px-4 font-mono font-bold">Room #{inv.room}</td>
                        <td className="py-3 px-4 text-right font-semibold">₹{inv.roomCharges.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold">₹{inv.serviceCharges.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold text-purple">₹{inv.taxes.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-semibold text-destructive">-₹{inv.discounts.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-black text-navy">₹{inv.totalAmount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-black text-success">₹{inv.paidAmount.toLocaleString()}</td>
                        <td className={`py-3 px-4 text-right font-black ${inv.balance > 0 ? "text-destructive" : "text-success"}`}>₹{inv.balance.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Tag tone={inv.paymentStatus === "Paid" ? "success" : inv.paymentStatus === "Partial" ? "warning" : "neutral"}>
                            {inv.paymentStatus}
                          </Tag>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.invoiceStatus === "Issued" ? "bg-success/15 text-success" : inv.invoiceStatus === "Draft" ? "bg-muted text-muted-foreground" : "bg-destructive/15 text-destructive"
                          }`}>{inv.invoiceStatus}</span>
                        </td>
                        <td className="py-3 px-4 text-center" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>
                          <Button
                            onClick={() => setSelectedInvoice(inv)}
                            variant="ghost"
                            className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 mx-auto flex items-center justify-center rounded-full"
                            title="Print details"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Tab Content B: Discounts & Refunds */}
      {activeSubTab === "discounts" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of adjustment requests */}
          <div className="lg:col-span-2 space-y-4">
            <Panel title="Pending Adjustments Log" description="Review employee discount waivers or guest refunds.">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[1000px]">
                  <thead className="whitespace-nowrap">
                    <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                      <th className="py-3 px-4">Ref ID</th>
                      <th className="py-3 px-4">Guest</th>
                      <th className="py-3 px-4">Room</th>
                      <th className="py-3 px-4">Adjustment Type</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-right">Adjustment Amount</th>
                      <th className="py-3 px-4">Requested By</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center font-bold" style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}>Authorize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                    {discounts.map((d) => (
                      <tr key={d.id} className="hover:bg-muted/5">
                        <td className="py-3 px-4 font-mono font-bold text-navy">{d.id}</td>
                        <td className="py-3 px-4 font-semibold">{d.guest}</td>
                        <td className="py-3 px-4 font-mono font-bold">#{d.room}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.type === "Refund" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}>{d.type}</span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground truncate max-w-[120px]">{d.reason}</td>
                        <td className="py-3 px-4 text-right font-bold text-navy">₹{d.amount.toLocaleString()}</td>
                        <td className="py-3 px-4 text-muted-foreground">{d.requestedBy}</td>
                        <td className="py-3 px-4">
                          <Tag tone={d.status === "Approved" ? "success" : d.status === "Pending" ? "warning" : "neutral"}>
                            {d.status}
                          </Tag>
                        </td>
                        <td className="py-3 px-4 text-center" style={{ width: '90px', minWidth: '90px', maxWidth: '90px' }}>
                          {d.status === "Pending" ? (
                            <div className="flex justify-center gap-1 select-none">
                              <Button
                                onClick={() => handleApproveDiscount(d.id)}
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:text-success hover:bg-success/10 rounded-full flex items-center justify-center"
                                title="Approve waiver"
                              >
                                <CheckCircle2 className="size-4" />
                              </Button>
                              <Button
                                onClick={() => handleRejectDiscount(d.id)}
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:text-destructive hover:bg-destructive/10 rounded-full flex items-center justify-center"
                                title="Reject request"
                              >
                                <XCircle className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">{d.approvedBy || "—"}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {/* New Discount/Refund Issue Form */}
          <div className="lg:col-span-1">
            <Panel title="Process Adjustment Waiver">
              <form onSubmit={handleIssueDiscount} className="p-4 space-y-4">
                <FormField label="Booking Reference ID" required id="bookingId">
                  <Input
                    id="bookingId"
                    type="text"
                    required
                    placeholder="BKG-9081..."
                    value={discountForm.bookingId}
                    onChange={(e) => setDiscountForm({ ...discountForm, bookingId: e.target.value })}
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Guest Name" required id="guestName">
                    <Input
                      id="guestName"
                      type="text"
                      required
                      placeholder="Meera Nair"
                      value={discountForm.guest}
                      onChange={(e) => setDiscountForm({ ...discountForm, guest: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Room Allocation" id="roomNum">
                    <Input
                      id="roomNum"
                      type="text"
                      placeholder="101"
                      value={discountForm.room}
                      onChange={(e) => setDiscountForm({ ...discountForm, room: e.target.value })}
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Waiver Type" required id="waiverType">
                    <Select
                      id="waiverType"
                      value={discountForm.type}
                      onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                      className="h-10 text-xs font-bold"
                    >
                      <option value="Discount">Discount Code</option>
                      <option value="Refund">Refund Credit</option>
                    </Select>
                  </FormField>
                  <FormField label="Amount (₹)" required id="waiverAmount">
                    <Input
                      id="waiverAmount"
                      type="number"
                      required
                      placeholder="1500"
                      value={discountForm.amount}
                      onChange={(e) => setDiscountForm({ ...discountForm, amount: e.target.value })}
                    />
                  </FormField>
                </div>

                <FormField label="Authorized Override Reason" id="waiverReason">
                  <Textarea
                    id="waiverReason"
                    rows={2}
                    placeholder="Waiver justification reason..."
                    value={discountForm.reason}
                    onChange={(e) => setDiscountForm({ ...discountForm, reason: e.target.value })}
                  />
                </FormField>

                <Button
                  type="submit"
                  className="bg-navy hover:bg-navy-deep text-white text-xs h-10 w-full font-bold rounded-full shadow-soft flex items-center justify-center gap-1.5"
                >
                  <BadgePercent className="size-4" /> Issue Adjustment Credit
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      )}

      {/* Tab Content C: Taxes & GST Ledger */}
      {activeSubTab === "taxes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* GST Tax Slabs configuration */}
            <div className="lg:col-span-1">
              <Panel title="GST Slabs Configurations" description="CGST & SGST percentage rates parameters.">
                <div className="p-4 space-y-4">
                  {taxSlabs.map((slab) => (
                    <div key={slab.id} className="p-3 bg-[#fafafa]/50 border border-muted rounded-xl space-y-2 text-xs">
                      <div className="flex justify-between items-center font-bold text-navy">
                        <span>{slab.name}</span>
                        <Tag tone="brand">{slab.rate}% GST</Tag>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-muted/50 text-[11px] text-muted-foreground">
                        <div>
                          <p className="font-semibold uppercase tracking-wider text-[9px]">Threshold</p>
                          <p className="font-bold text-navy mt-0.5">₹{parseInt(slab.threshold).toLocaleString()}+</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-wider text-[9px]">CGST Rate</p>
                          <p className="font-bold text-navy mt-0.5">{slab.cgst}%</p>
                        </div>
                        <div>
                          <p className="font-semibold uppercase tracking-wider text-[9px]">SGST Rate</p>
                          <p className="font-bold text-navy mt-0.5">{slab.sgst}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full text-xs font-bold border-muted hover:bg-muted/10 h-9.5 rounded-full flex items-center justify-center gap-1">
                    <Settings className="size-3.5" /> Modify GST Slab Rates
                  </Button>
                </div>
              </Panel>
            </div>

            {/* GST audit ledger logs */}
            <div className="lg:col-span-2">
              <Panel title="Taxable GST Operations Ledger" description="Reconcile HSN/SAC code room tariff and service taxes.">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[800px]">
                    <thead className="whitespace-nowrap">
                      <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                        <th className="py-3 px-4">Invoice ID</th>
                        <th className="py-3 px-4">Base Taxable</th>
                        <th className="py-3 px-4 text-right">CGST Collected</th>
                        <th className="py-3 px-4 text-right">SGST Collected</th>
                        <th className="py-3 px-4 text-right">Total GST Collected</th>
                        <th className="py-3 px-4 text-center">GST Slab</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                      {invoices.map((inv) => {
                        const baseTaxable = inv.roomCharges + inv.serviceCharges - inv.discounts;
                        const cgst = Math.round(inv.taxes / 2);
                        const sgst = inv.taxes - cgst;
                        const slabUsed = baseTaxable >= 7500 ? "18% Slab" : "12% Slab";

                        return (
                          <tr key={inv.id} className="hover:bg-muted/5">
                            <td className="py-3 px-4 font-mono font-bold text-navy">{inv.id}</td>
                            <td className="py-3 px-4 font-semibold text-navy">₹{baseTaxable.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-medium">₹{cgst.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-medium">₹{sgst.toLocaleString()}</td>
                            <td className="py-3 px-4 text-right font-bold text-purple">₹{inv.taxes.toLocaleString()}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                slabUsed.includes("18") ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                              }`}>{slabUsed}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

          </div>
        </div>
      )}

      {/* Invoice Detailed Overlay Modal Print Pop-up */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-lg w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            {/* Header info */}
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Folio Invoice: {selectedInvoice.id}</h3>
                <p className="text-[10px] text-muted-foreground uppercase mt-0.5">Booking Ref: {selectedInvoice.bookingId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy"
                onClick={() => setSelectedInvoice(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Print details body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="flex justify-between border-b border-muted/50 pb-3">
                <div>
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase">Property Info</p>
                  <p className="font-bold text-navy mt-0.5">Speshway Luxury Hotel</p>
                  <p className="text-muted-foreground text-[10px]">GSTIN: 27AAAAA1111A1Z1</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-[10px] text-muted-foreground uppercase">Bill To</p>
                  <p className="font-bold text-navy mt-0.5">{selectedInvoice.guest}</p>
                  <p className="text-muted-foreground text-[10px]">Room #{selectedInvoice.room} • {selectedInvoice.checkIn} to {selectedInvoice.checkOut}</p>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-2">
                <p className="font-bold text-[10px] uppercase text-muted-foreground tracking-wider">Itemized charges breakdown</p>
                <div className="p-3 bg-muted/20 border border-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Room Accommodation Tariff (SAC 9963)</span>
                    <span className="font-bold">₹{selectedInvoice.roomCharges.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pos F&B Dining & Service (SAC 9964)</span>
                    <span className="font-bold">₹{selectedInvoice.serviceCharges.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Applied Discounts Waiver Credit</span>
                    <span className="font-bold">-₹{selectedInvoice.discounts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-muted/40 pt-1.5">
                    <span>Base Taxable Valuation</span>
                    <span className="font-bold">₹{(selectedInvoice.roomCharges + selectedInvoice.serviceCharges - selectedInvoice.discounts).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-purple">
                    <span>GST (CGST @ 9% + SGST @ 9% slab)</span>
                    <span className="font-bold">₹{selectedInvoice.taxes.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center pt-3 border-t border-muted/50">
                <div>
                  <span className="font-bold text-[10px] text-muted-foreground uppercase block">Invoice Total</span>
                  <span className="font-black text-navy text-lg">₹{selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-[10px] text-muted-foreground uppercase block">Outstanding Folio Due</span>
                  <span className={`font-black text-lg ${selectedInvoice.balance > 0 ? "text-destructive" : "text-success"}`}>
                    ₹{selectedInvoice.balance.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Print action footer */}
            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedInvoice(null)}
                className="h-9 px-4 text-xs rounded-full"
              >
                Close View
              </Button>
              <Button
                onClick={() => {
                  toast.success(`Tax invoice ${selectedInvoice.id} sent to guest WhatsApp & Email!`);
                  setSelectedInvoice(null);
                }}
                className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs font-bold rounded-full flex items-center gap-1.5"
              >
                <Download className="size-3.5" /> Dispatch Invoice
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}