import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/hs/FormFields";
import { toast } from "sonner";
import {
  CheckCircle, XCircle, Search, Eye, Clock, ShieldAlert,
  ArrowUpRight, AlertCircle, ShieldCheck, UserCheck, CalendarDays
} from "lucide-react";

export const Route = createFileRoute("/admin/approvals")({
  head: () => ({
    meta: [
      { title: "Management Approvals Console — Speshway Luxury Hotel" },
      { name: "description", content: "Authorize pending hotel staff override requests, discounts, refunds, and room category changes." }
    ]
  }),
  component: AdminApprovalsPage
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
          <h3 className="mt-2.5 font-display text-base font-black text-navy leading-none">{value}</h3>
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

const initialRequests = [
  {
    id: "APR-8401",
    bookingId: "BKG-9081",
    guest: "Karan Malhotra",
    room: "101",
    type: "Refund Request",
    description: "AC malfunction waiver override credit",
    value: "₹3,500 Refund",
    requestedBy: "Receptionist Shrey",
    approvedBy: "Admin Madhu",
    date: "2026-08-16",
    status: "Approved"
  },
  {
    id: "APR-8402",
    bookingId: "BKG-9082",
    guest: "Aisha Sharma",
    room: "104",
    type: "Discounts Waiver",
    description: "Corporate rate waiver contract adjustment",
    value: "₹1,200 discount",
    requestedBy: "Agent Riya",
    approvedBy: "Admin Madhu",
    date: "2026-08-15",
    status: "Approved"
  },
  {
    id: "APR-8403",
    bookingId: "BKG-9083",
    guest: "Rohan Varma",
    room: "205",
    type: "Room Change",
    description: "Upgrade from Deluxe to Premium Suite",
    value: "Suite Upgrade (Room 302)",
    requestedBy: "Receptionist Shrey",
    approvedBy: "—",
    date: "2026-08-17",
    status: "Pending"
  },
  {
    id: "APR-8404",
    bookingId: "BKG-9084",
    guest: "Meera Nair",
    room: "101",
    type: "Booking Cancellation",
    description: "Waiver of 1-night cancellation penalty",
    value: "Penalty Waiver (₹4,500)",
    requestedBy: "Agent Riya",
    approvedBy: "—",
    date: "2026-08-17",
    status: "Pending"
  }
];

function AdminApprovalsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected details modal
  const [selectedReq, setSelectedReq] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("hms_admin_approvals");
    if (saved) {
      setRequests(JSON.parse(saved));
    } else {
      localStorage.setItem("hms_admin_approvals", JSON.stringify(initialRequests));
      setRequests(initialRequests);
    }
    setLoading(false);
  }, []);

  const syncRequests = (list) => {
    localStorage.setItem("hms_admin_approvals", JSON.stringify(list));
    setRequests(list);
  };

  const handleApprove = (id) => {
    const updated = requests.map(r => {
      if (r.id === id) {
        toast.success(`Request ${id} approved successfully!`);
        return { ...r, status: "Approved", approvedBy: "Admin Madhu" };
      }
      return r;
    });
    syncRequests(updated);
    if (selectedReq && selectedReq.id === id) {
      setSelectedReq({ ...selectedReq, status: "Approved", approvedBy: "Admin Madhu" });
    }
  };

  const handleReject = (id) => {
    const updated = requests.map(r => {
      if (r.id === id) {
        toast.error(`Request ${id} has been rejected.`);
        return { ...r, status: "Rejected", approvedBy: "Admin Madhu" };
      }
      return r;
    });
    syncRequests(updated);
    if (selectedReq && selectedReq.id === id) {
      setSelectedReq({ ...selectedReq, status: "Rejected", approvedBy: "Admin Madhu" });
    }
  };

  // Filter application
  const filteredRequests = requests.filter(r => {
    const s = searchQuery.toLowerCase();
    const matchesSearch =
      r.guest.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s) ||
      r.bookingId.toLowerCase().includes(s);

    const matchesType = typeFilter === "all" || r.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  // KPIs
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === "Pending").length;
  const approvedCount = requests.filter(r => r.status === "Approved").length;

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <PremiumStatCard
          label="Total Override Requests"
          value={totalCount.toString()}
          hint="All logs logged"
          icon={AlertCircle}
          accentColor="#6366f1"
        />
        <PremiumStatCard
          label="Awaiting Approval"
          value={pendingCount.toString()}
          hint="Action required immediately"
          icon={Clock}
          accentColor="#f59e0b"
        />
        <PremiumStatCard
          label="Approved Actions"
          value={approvedCount.toString()}
          hint="Override waivers cleared"
          icon={ShieldCheck}
          accentColor="#10b981"
        />
        <PremiumStatCard
          label="Rejected Actions"
          value={(totalCount - pendingCount - approvedCount).toString()}
          hint="Disapproved staff actions"
          icon={ShieldAlert}
          accentColor="#ef4444"
        />
      </div>

      {/* Filters search bar */}
      <Panel title="Override Directory Search">
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <FormField label="Search Guest or Ref Code" id="search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                className="pl-9 h-10 text-xs font-bold"
                placeholder="Guest, Request ID, Booking..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="Override Type" id="type">
            <Select
              id="type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All Override Categories</option>
              <option value="refund">Refund Requests</option>
              <option value="discount">Discounts / Waivers</option>
              <option value="change">Room / Booking Shifts</option>
              <option value="cancellation">Cancellations</option>
            </Select>
          </FormField>

          <FormField label="Authorization Status" id="status">
            <Select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 text-xs font-bold"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved Override</option>
              <option value="Rejected">Rejected</option>
            </Select>
          </FormField>
        </div>
      </Panel>

      {/* Main Table */}
      <Panel title="Override Approvals Ledger">
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground select-none">No pending authorization items matched query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[900px]">
              <thead>
                <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                  <th className="py-3 px-4 text-left">Request ID</th>
                  <th className="py-3 px-4 text-left">Guest Name</th>
                  <th className="py-3 px-4 text-left">Booking Reference</th>
                  <th className="py-3 px-4 text-left">Override Action</th>
                  <th className="py-3 px-4 text-left font-bold text-navy">Value Index</th>
                  <th className="py-3 px-4 text-left">Requested By</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-center font-bold" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>Authorize</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/5">
                    <td className="py-3 px-4 font-mono font-bold text-navy">{r.id}</td>
                    <td className="py-3 px-4 font-bold text-navy">{r.guest}</td>
                    <td className="py-3 px-4 font-mono font-bold">Room #{r.room} • {r.bookingId}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider ${
                        r.type.includes("Refund") ? "bg-amber-100 text-amber-800" : r.type.includes("Discount") ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                      }`}>{r.type}</span>
                    </td>
                    <td className="py-3 px-4 font-black text-navy">{r.value}</td>
                    <td className="py-3 px-4 text-muted-foreground font-semibold">{r.requestedBy}</td>
                    <td className="py-3 px-4">
                      <Tag tone={r.status === "Approved" ? "success" : r.status === "Pending" ? "warning" : "danger"}>
                        {r.status}
                      </Tag>
                    </td>
                    <td className="py-3 px-4 text-center" style={{ width: '120px', minWidth: '120px', maxWidth: '120px' }}>
                      <div className="flex justify-center gap-1 select-none">
                        <Button
                          onClick={() => setSelectedReq(r)}
                          variant="ghost"
                          className="h-7 w-7 p-0 hover:text-brand hover:bg-brand/10 rounded-full flex items-center justify-center"
                          title="View Request rationale"
                        >
                          <Eye className="size-4" />
                        </Button>
                        {r.status === "Pending" && (
                          <>
                            <Button
                              onClick={() => handleApprove(r.id)}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-success hover:bg-success/10 rounded-full flex items-center justify-center"
                              title="Approve override"
                            >
                              <CheckCircle className="size-4" />
                            </Button>
                            <Button
                              onClick={() => handleReject(r.id)}
                              variant="ghost"
                              className="h-7 w-7 p-0 hover:text-destructive hover:bg-destructive/10 rounded-full flex items-center justify-center"
                              title="Reject request"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Detail Slideover Modal popup */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in select-none">
          <div className="bg-white rounded-xl border border-muted max-w-sm w-full shadow-lift overflow-hidden text-left flex flex-col font-ui text-navy">
            
            <div className="p-4 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <div>
                <h3 className="font-bold text-navy text-sm">Request details: {selectedReq.id}</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">Booking Ref: {selectedReq.bookingId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full text-muted-foreground hover:text-navy"
                onClick={() => setSelectedReq(null)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>

            {/* Content body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-muted/20 border border-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Override Action:</span>
                  <span className="font-bold">{selectedReq.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Waiver Value:</span>
                  <span className="font-black text-navy">{selectedReq.value}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Guest:</span>
                  <span className="font-bold">{selectedReq.guest}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-semibold">Requested By:</span>
                  <span className="font-bold">{selectedReq.requestedBy}</span>
                </div>
              </div>

              <div className="p-3 bg-[#fafafa]/50 border border-muted rounded-lg space-y-1">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Justification Rationale</p>
                <p className="text-[11px] leading-relaxed text-navy font-medium mt-1">{selectedReq.description}</p>
              </div>

              {selectedReq.status === "Pending" ? (
                <div className="pt-2 border-t border-muted/50 flex gap-2">
                  <Button
                    onClick={() => handleApprove(selectedReq.id)}
                    className="flex-1 bg-success hover:bg-success/90 text-white font-bold h-9 text-xs rounded-full flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="size-3.5" /> Approve Request
                  </Button>
                  <Button
                    onClick={() => handleReject(selectedReq.id)}
                    className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold h-9 text-xs rounded-full flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="size-3.5" /> Reject Request
                  </Button>
                </div>
              ) : (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center font-bold text-success text-[10px] uppercase tracking-wider">
                  Authorized Override Approved by {selectedReq.approvedBy}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-muted bg-[#fcfcfc] flex justify-end">
              <Button
                variant="ghost"
                onClick={() => setSelectedReq(null)}
                className="h-8 px-4 text-xs rounded-full"
              >
                Close View
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}