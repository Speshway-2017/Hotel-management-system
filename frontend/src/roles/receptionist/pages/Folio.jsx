import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { receptionistService } from "@/services/receptionist";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, Search, ChevronRight, X, 
  ShieldAlert, Sparkles, FileText, CheckCircle2, AlertOctagon, HelpCircle,
  Receipt, CreditCard, Mail, Printer, RefreshCw, Undo2, Percent
} from "lucide-react";

export const Route = createFileRoute("/reception/folio")({
  head: () => ({
    meta: [
      { title: "Folio Management — Hour Stay" },
      { name: "description", content: "Guest folio billing registry, POS incidentals posting and invoice generation." }
    ]
  }),
  component: InvoicesAndFolioPage
});

function InvoicesAndFolioPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBillingStatus, setFilterBillingStatus] = useState("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [folios, setFolios] = useState([]);

  useEffect(() => {
    receptionistService.getFolios()
      .then(res => {
        if (res.success && res.data) {
          const list = res.data.map(f => ({
            ...f,
            guest: f.guestName,
            room: f.roomNo,
            dates: f.stayDates,
            balance: f.balanceDue,
            type: 'Guest Room Billing'
          }));
          setFolios(list);
        }
      })
      .catch(err => console.error("Failed to fetch folios:", err))
      .finally(() => setLoading(false));
  }, []);

  // Selected Folio Details Modal Overlay
  const [selectedFolio, setSelectedFolio] = useState(null);

  // Quick Action form inputs
  const [addCategory, setAddCategory] = useState("F&B POS");
  const [addDesc, setAddDesc] = useState("Dinner Room Service");
  const [addQty, setAddQty] = useState("1");
  const [addPrice, setAddPrice] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  const [discountAmount, setDiscountAmount] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  // Status Meta configs
  const paymentMeta = {
    Paid: { tone: "success", label: "Paid" },
    Partial: { tone: "warning", label: "Partial" },
    Pending: { tone: "error", label: "Pending" },
    Refunded: { tone: "neutral", label: "Refunded" }
  };

  const statusMeta = {
    Closed: { tone: "neutral", label: "Closed" },
    Active: { tone: "brand", label: "Active" }
  };

  // Filter calculations
  const filteredFolios = folios.filter(f => {
    const matchesSearch = 
      f.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.room.includes(searchQuery) ||
      f.bookingId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBillingStatus = filterBillingStatus === "all" || f.status === filterBillingStatus;
    const matchesPaymentStatus = filterPaymentStatus === "all" || f.paymentStatus === filterPaymentStatus;
    const matchesType = filterType === "all" || f.type === filterType;

    return matchesSearch && matchesBillingStatus && matchesPaymentStatus && matchesType;
  });

  // Action methods
  const calculateTotalCharges = (folio) => {
    return folio.items.reduce((sum, item) => sum + item.total, 0);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading billing folios...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">
      
      {/* Page Header (receptionist dates omitted) */}
      <PageHeader />

      {/* Controls: Search and Filters */}
      <div className="bg-white border border-muted rounded-2xl p-4 shadow-soft space-y-4">
        
        {/* Row 1: Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search guest name, room #, booking ID, folio reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-navy"
            />
          </div>
        </div>

        {/* Row 2: Select Filters */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-muted/50">
          
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Billing Status</span>
            <select
              value={filterBillingStatus}
              onChange={(e) => setFilterBillingStatus(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Folios</option>
              <option value="Active">Active Stays</option>
              <option value="Closed">Closed Invoices</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Payment Status</span>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Payments</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Dues</option>
              <option value="Pending">Unpaid</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider select-none">Invoice Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-muted bg-[#fcfcfc] rounded-xl text-xs font-semibold text-navy focus:outline-none cursor-pointer w-full"
            >
              <option value="all">All Types</option>
              <option value="Guest Room Billing">Guest Room Billing</option>
              <option value="Corporate Billing">Corporate Billing</option>
            </select>
          </div>

        </div>
      </div>

      {/* Table Ledger Panel */}
      <Panel title="Invoicing & Folios Registry" description="View guest occupancy incidentals charges, POS food and beverages postings, and payment settlement ledgers.">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[950px]">
            <thead>
              <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                <th className="py-3.5 px-4">Folio ID</th>
                <th className="py-3.5 px-4">Guest Details</th>
                <th className="py-3.5 px-4">Room No</th>
                <th className="py-3.5 px-4">Booking ID</th>
                <th className="py-3.5 px-4">Stay Dates</th>
                <th className="py-3.5 px-4">Total Charges</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">Balance Due</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/30 whitespace-nowrap">
              {filteredFolios.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-10 text-center font-bold text-muted-foreground select-none">
                    No matching billing folios found in registry database.
                  </td>
                </tr>
              ) : (
                filteredFolios.map((f) => {
                  const payM = paymentMeta[f.paymentStatus] || paymentMeta.Pending;
                  const statM = statusMeta[f.status] || statusMeta.Active;
                  const total = calculateTotalCharges(f);
                  return (
                    <tr key={f.id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-mono font-bold text-navy-deep">{f.id}</td>
                      <td className="py-3.5 px-4 font-bold text-navy">{f.guest}</td>
                      <td className="py-3.5 px-4 font-bold text-indigo">Room #{f.room}</td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{f.bookingId}</td>
                      <td className="py-3.5 px-4 text-navy">{f.dates}</td>
                      <td className="py-3.5 px-4 font-black">₹{total.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-bold">₹{f.amountPaid.toLocaleString()}</td>
                      <td className={`py-3.5 px-4 font-black ${f.balance > 0 ? "text-rose-600 animate-pulse" : "text-navy"}`}>
                        ₹{f.balance.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone={payM.tone}>{payM.label}</Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone={statM.tone}>{statM.label}</Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Button
                          asChild
                          className="bg-emerald-600 hover:bg-emerald-700 !text-white h-7 px-3.5 text-[10px] rounded-lg font-bold cursor-pointer transition-all shadow-sm"
                        >
                          <Link to={`/reception/folio/${f.id}`}>View Folio</Link>
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

    </div>
  );
}