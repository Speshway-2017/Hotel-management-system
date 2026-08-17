import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HorizontalRouteTabs, Panel, Tag, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { superAdminService } from "@/services/superAdmin";
import {
  Receipt,
  CreditCard,
  FileText,
  Percent,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Info,
  DollarSign
} from "lucide-react";

const financeTabs = [
  { label: "Billing & Invoices", to: "/admin/billing", icon: Receipt },
  { label: "Payments", to: "/admin/payments", icon: CreditCard },
  { label: "Discounts & Refunds", to: "/admin/approvals", icon: Percent },
  { label: "Taxes & GST", to: "/admin/taxes", icon: FileText }
];

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Discounts & Refunds — Speshway Luxury Hotel" },
      { name: "description", content: "Review and approve pending staff discounts and booking refunds." }
    ]
  }),
  component: DiscountsRefundsPage
});

// Mock Initial data mapped to property HS-JAI
const initialLedger = [
  {
    id: "FOL-3021",
    guest: "Karan Malhotra",
    room: "302",
    type: "Refund",
    reason: "AC malfunctioning override",
    amount: 3500,
    requestedBy: "Receptionist Shrey",
    approvedBy: "Admin Madhu",
    date: "2026-08-16",
    status: "Approved"
  },
  {
    id: "FOL-1042",
    guest: "Aisha Sharma",
    room: "104",
    type: "Discount",
    reason: "Corporate GDS Contract slab",
    amount: 1200,
    requestedBy: "Agent Riya",
    approvedBy: "Admin Madhu",
    date: "2026-08-15",
    status: "Approved"
  },
  {
    id: "FOL-2051",
    guest: "Rohan Varma",
    room: "205",
    type: "Refund",
    reason: "Double billing error",
    amount: 4500,
    requestedBy: "Receptionist Shrey",
    approvedBy: "—",
    date: "2026-08-17",
    status: "Pending"
  },
  {
    id: "FOL-1011",
    guest: "Meera Nair",
    room: "101",
    type: "Discount",
    reason: "Loyalty Tier Waiver",
    amount: 2000,
    requestedBy: "Agent Riya",
    approvedBy: "—",
    date: "2026-08-17",
    status: "Pending"
  }
];

function DiscountsRefundsPage() {
  const [ledger, setLedger] = useState(initialLedger);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [isIssueOpen, setIsIssueOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form States
  const [activeBookings, setActiveBookings] = useState([]);
  const [formBookingId, setFormBookingId] = useState("");
  const [formType, setFormType] = useState("Refund");
  const [formReason, setFormReason] = useState("");
  const [formAmount, setFormAmount] = useState("");

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Fetch active checked-in/out bookings to populate choice dropdowns
    superAdminService.getReservations()
      .then((res) => {
        setActiveBookings(res.data || []);
      })
      .catch(() => {});
  }, []);

  const handleApprove = (id) => {
    setLedger((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Approved", approvedBy: "Admin Madhu" } : item
      )
    );
    setNotification({ tone: "success", title: "Request Approved", body: `Ledger entry ${id} approved successfully.` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReject = (id) => {
    setLedger((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "Rejected", approvedBy: "Admin Madhu" } : item))
    );
    setNotification({ tone: "warning", title: "Request Rejected", body: `Ledger entry ${id} rejected.` });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleIssueSubmit = (e) => {
    e.preventDefault();
    const booking = activeBookings.find((b) => b._id === formBookingId);
    if (!booking) {
      alert("Please select a valid booking guest.");
      return;
    }

    const match = booking.room && booking.room.match(/\d+/);
    const roomNum = match ? match[0] : booking.room;

    const newRequest = {
      id: `FOL-${Math.floor(1000 + Math.random() * 9000)}`,
      guest: booking.guest,
      room: roomNum || "—",
      type: formType,
      reason: formReason,
      amount: Number(formAmount),
      requestedBy: "Admin Madhu",
      approvedBy: "—",
      date: new Date().toISOString().split("T")[0],
      status: "Pending"
    };

    setLedger((prev) => [newRequest, ...prev]);
    setIsIssueOpen(false);
    resetForm();
    setNotification({ tone: "success", title: "Request Lodged", body: `Request successfully filed under pending approvals.` });
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => {
    setFormBookingId("");
    setFormType("Refund");
    setFormReason("");
    setFormAmount("");
  };

  // Filter calculations
  const filteredLedger = ledger.filter((item) => {
    const matchesSearch =
      item.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // KPI calculations
  const totalDiscounts = ledger
    .filter((item) => item.type === "Discount" && item.status === "Approved")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalRefunds = ledger
    .filter((item) => item.type === "Refund" && item.status === "Approved")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const pendingCount = ledger.filter((item) => item.status === "Pending").length;
  const approvedCount = ledger.filter((item) => item.status === "Approved").length;

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={financeTabs} />

      {notification && (
        <Notice tone={notification.tone} title={notification.title}>
          {notification.body}
        </Notice>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#9b59b6]">Total Discounts</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">₹{totalDiscounts.toLocaleString()}</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Approved fee waivers</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand">Total Refunds</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">₹{totalRefunds.toLocaleString()}</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Approved cash paybacks</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-warning">Pending Refunds</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{pendingCount} Requests</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Awaiting admin review</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4.5 shadow-soft flex flex-col justify-between min-h-[110px]">
          <span className="text-[10px] font-bold uppercase tracking-widest text-success">Approved Requests</span>
          <h3 className="mt-2.5 font-display text-xl font-black text-navy leading-none">{approvedCount} Settled</h3>
          <p className="mt-3.5 text-[10px] text-muted-foreground">Processed transaction counts</p>
        </div>
      </div>

      {/* Filter and Search Bar Toolbar */}
      <div className="bg-white border border-muted rounded-xl p-4 shadow-soft flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by guest or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted rounded-lg text-sm bg-[#fafafa]/50 focus:outline-none focus:border-navy"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-muted rounded-lg text-sm bg-white text-[#2a2a2a] focus:outline-none focus:border-navy"
            >
              <option value="all">All Types</option>
              <option value="Discount">Discount</option>
              <option value="Refund">Refund</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-muted rounded-lg text-sm bg-white text-[#2a2a2a] focus:outline-none focus:border-navy"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <Button
          onClick={() => {
            resetForm();
            setIsIssueOpen(true);
          }}
          className="bg-navy hover:bg-navy-deep text-white shadow-soft text-xs h-8.5 px-3.5 font-bold shrink-0"
        >
          <Plus className="size-3.5 mr-1" /> Issue Discount/Refund
        </Button>
      </div>

      {/* Main Ledger Table Panel */}
      <Panel title="Ledger & Review Logs" description={`Displaying ${filteredLedger.length} transaction adjustment requests.`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                <th className="py-4 px-4">Folio ID</th>
                <th className="py-4 px-4">Guest Info</th>
                <th className="py-4 px-4">Type</th>
                <th className="py-4 px-4">Reason / Notes</th>
                <th className="py-4 px-4 text-right">Adjustment</th>
                <th className="py-4 px-4">Requested By</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-right w-44">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted text-xs text-[#2a2a2a]">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-muted-foreground select-none">No adjustments matching active filters found.</td>
                </tr>
              ) : (
                filteredLedger.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fcfcfc]/60">
                    <td className="py-4 px-4 font-mono font-bold text-navy">{item.id}</td>
                    <td className="py-4 px-4 font-semibold text-navy-deep">
                      <div>{item.guest}</div>
                      <div className="text-[10px] text-muted-foreground font-normal">Room {item.room}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold ${
                        item.type === "Refund" ? "bg-brand/10 text-brand" : "bg-[#9b59b6]/10 text-[#9b59b6]"
                      }`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 italic max-w-xs truncate" title={item.reason}>"{item.reason}"</td>
                    <td className="py-4 px-4 text-right font-black text-navy font-mono">₹{item.amount.toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <div>{item.requestedBy}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{item.date}</div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold ${
                        item.status === "Approved"
                          ? "bg-success/10 text-success border border-success/20"
                          : item.status === "Pending"
                          ? "bg-warning/10 text-warning border border-warning/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right select-none w-44">
                      <div className="flex items-center justify-end gap-2 opacity-85 hover:opacity-100 transition-opacity">
                        <Button
                          onClick={() => {
                            setSelectedRecord(item);
                            setIsDetailOpen(true);
                          }}
                          size="icon"
                          variant="ghost"
                          className="size-7 flex items-center justify-center"
                          aria-label="View Details"
                        >
                          <Eye className="size-3.5 text-navy" />
                        </Button>
                        {item.status === "Pending" && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              onClick={() => handleApprove(item.id)}
                              size="xs"
                              className="bg-[#2ecc71] hover:bg-[#27ae60] text-white h-7 px-2.5 text-[10px] font-bold"
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(item.id)}
                              size="xs"
                              className="bg-destructive hover:bg-destructive/90 text-white h-7 px-2.5 text-[10px] font-bold"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* New Refund Request Overlay Form Modal */}
      {isIssueOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-md">Issue Discount or Refund</h3>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setIsIssueOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleIssueSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Select Guest / Folio</label>
                <select
                  required
                  value={formBookingId}
                  onChange={(e) => setFormBookingId(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                >
                  <option value="">Select Target Guest</option>
                  {activeBookings.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.guest} (Room: {b.room})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Adjustment Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="Refund">Refund Payback</option>
                    <option value="Discount">Tariff Discount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Adjustment Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Reason description</label>
                <textarea
                  rows={3}
                  required
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Describe the reason for adjustment (e.g. Guest complaint compensation)"
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy resize-none"
                />
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsIssueOpen(false)} className="h-10 px-4">
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-10 px-6 font-bold shadow-soft">
                  Lodge Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Details Dialog Modal */}
      {isDetailOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-4.5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-semibold text-navy text-sm">Ledger Request Audit</h3>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => setIsDetailOpen(false)}>
                <XCircle className="size-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4 text-xs text-navy">
              <div className="bg-muted/20 p-4 rounded-xl border border-muted space-y-2">
                <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Adjustment Record</span>
                  <span>{selectedRecord.id}</span>
                </div>
                <h4 className="text-sm font-bold text-navy-deep">{selectedRecord.guest}</h4>
                <p className="text-[10px] text-muted-foreground">Room: {selectedRecord.room} | Date: {selectedRecord.date}</p>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Type</span>
                  <p className="font-semibold text-sm mt-0.5">{selectedRecord.type}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase text-right block">Amount</span>
                  <p className="font-black text-sm text-right mt-0.5">₹{selectedRecord.amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Filer Operator</span>
                  <p className="font-semibold mt-0.5">{selectedRecord.requestedBy}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase text-right block">Approved By</span>
                  <p className="font-semibold text-right mt-0.5">{selectedRecord.approvedBy}</p>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Reason Description</span>
                <p className="p-3 bg-[#fafafa]/50 border border-muted rounded mt-1 italic">"{selectedRecord.reason}"</p>
              </div>

              <div className="pt-4 border-t border-muted flex justify-end">
                <Button onClick={() => setIsDetailOpen(false)} className="bg-navy hover:bg-navy-deep text-white h-8 px-4 text-xs">
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}