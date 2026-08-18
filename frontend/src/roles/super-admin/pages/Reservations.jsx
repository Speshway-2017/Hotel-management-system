import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/utils/utils";
import { Search, RefreshCw, Eye, X, Building, ChevronDown, Calendar, User, Landmark } from "lucide-react";

function SuperAdminReservations() {
  const [reservations, setReservations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  // Details Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, propertiesRes] = await Promise.all([
        superAdminService.getReservations(),
        superAdminService.getProperties()
      ]);

      if (bookingsRes.success && propertiesRes.success) {
        setReservations(bookingsRes.data);
        setProperties(propertiesRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to load bookings database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPropertyName = (pId) => {
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.name : "Unassigned Property";
  };

  const getPropertyLocation = (pId) => {
    const prop = properties.find(p => p.id === pId || p._id === pId);
    return prop ? prop.city : "—";
  };

  const handleCancelReservation = (booking) => {
    const bId = booking.id || booking._id;
    setReservations(prev =>
      prev.map(r => (r.id === bId || r._id === bId) ? { ...r, status: "Cancelled" } : r)
    );
  };

  const matchesDate = (checkInStr) => {
    if (dateFilter === "All") return true;
    const bookingDate = new Date(checkInStr);
    if (isNaN(bookingDate.getTime())) return true;

    const today = new Date("2026-08-14"); // Baseline mock current date
    const diffTime = today.getTime() - bookingDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dateFilter === "7days") {
      return diffDays >= 0 && diffDays <= 7;
    }
    if (dateFilter === "30days") {
      return diffDays >= 0 && diffDays <= 30;
    }
    if (dateFilter === "thismonth") {
      return bookingDate.getMonth() === today.getMonth() && bookingDate.getFullYear() === today.getFullYear();
    }
    if (dateFilter === "next30days") {
      const futureDiff = bookingDate.getTime() - today.getTime();
      const futureDays = Math.ceil(futureDiff / (1000 * 60 * 60 * 24));
      return futureDays >= 0 && futureDays <= 30;
    }
    return true;
  };

  const filteredReservations = reservations.filter((r) => {
    const bookingId = r.id || r._id || "";
    const matchesSearch =
      r.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bookingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.phone && r.phone.includes(searchQuery));
    
    const matchesProperty = propertyFilter === "All" || r.propertyId === propertyFilter;
    const matchesSource = sourceFilter === "All" || r.source === sourceFilter;
    const matchesStatus = statusFilter === "All" || r.status === statusFilter;
    const matchesDateRange = matchesDate(r.checkIn);

    return matchesSearch && matchesProperty && matchesSource && matchesStatus && matchesDateRange;
  });

  const getPaymentStatus = (amount, balance) => {
    const amt = amount || 0;
    const bal = balance || 0;
    if (bal === 0) return { label: "Paid", tone: "success" };
    if (bal >= amt) return { label: "Unpaid", tone: "error" };
    return { label: "Partial", tone: "warning" };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservations Control"
        subtitle="Manage daily bookings, room check-ins, sources, and payments across your hotel properties."
      />

      {error && <Notice tone="error" title="Data Load Failure" className="text-left">{error}</Notice>}

      {/* Advanced Filter Toolbar */}
      <div className="flex flex-col gap-3 bg-white border border-muted p-4 rounded-2xl shadow-soft">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search bookings by Guest Name, ID, or Phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-full border-muted text-xs bg-muted/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Property Filter */}
            <div className="relative">
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[150px] cursor-pointer appearance-none"
              >
                <option value="All">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Booking Source Filter */}
            <div className="relative">
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
              >
                <option value="All">All Sources</option>
                <option value="Direct">Direct</option>
                <option value="MakeMyTrip">MakeMyTrip</option>
                <option value="Goibibo">Goibibo</option>
                <option value="Booking.com">Booking.com</option>
                <option value="Agoda">Agoda</option>
                <option value="Walk-in">Walk-in</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Reservation Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
              >
                <option value="All">All Statuses</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Checked-in">Checked-in</option>
                <option value="Checked-out">Checked-out</option>
                <option value="Cancelled">Cancelled</option>
                <option value="No-show">No-show</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* Date Range Filter */}
            <div className="relative">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-white border border-muted pl-4 pr-9 h-10 rounded-full text-xs font-semibold text-navy focus:outline-none focus:ring-1 focus:ring-purple min-w-[140px] cursor-pointer appearance-none"
              >
                <option value="All">All Dates</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="thismonth">This Month</option>
                <option value="next30days">Next 30 Days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      </div>

      <Panel title="Reservations Ledger" description={`Showing ${filteredReservations.length} total records`}>
        {loading ? (
          <LoadingRows rows={5} />
        ) : filteredReservations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No bookings found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px] table-fixed">
              <thead>
                <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                  <th className="p-4 w-[8%] text-left">Booking ID</th>
                  <th className="p-4 w-[12%] text-left">Guest Name</th>
                  <th className="p-4 w-[14%] text-left">Property</th>
                  <th className="p-4 w-[12%] text-left">Room/Room Type</th>
                  <th className="p-4 w-[9%] text-left">Check-in</th>
                  <th className="p-4 w-[9%] text-left">Check-out</th>
                  <th className="p-4 w-[10%] text-left">Source</th>
                  <th className="p-4 w-[8%] text-left">Amount</th>
                  <th className="p-4 w-[8%] text-left">Payment</th>
                  <th className="p-4 w-[10%] text-left">Status</th>
                  <th className="p-4 w-[10%] text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y font-sans">
                {filteredReservations.map((r) => {
                  const pay = getPaymentStatus(r.amount, r.balance);
                  const isCancellable = r.status === "Confirmed" || r.status === "Pending";

                  return (
                    <tr key={r.id || r._id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4 w-[8%] text-left font-semibold text-navy truncate" title={r.id || r._id}>{r.id || r._id}</td>
                      <td className="p-4 w-[12%] text-left">
                        <div className="truncate">
                          <p className="font-semibold text-navy text-sm truncate" title={r.guest}>{r.guest}</p>
                          <p className="text-muted-foreground text-[10px] truncate" title={r.phone}>{r.phone || "—"}</p>
                        </div>
                      </td>
                      <td className="p-4 w-[14%] text-left">
                        <div className="flex items-center gap-1.5 text-navy font-semibold truncate" title={getPropertyName(r.propertyId)}>
                          <Building className="size-3.5 text-purple shrink-0" />
                          <span className="truncate">{getPropertyName(r.propertyId)}</span>
                        </div>
                      </td>
                      <td className="p-4 w-[12%] text-left text-muted-foreground truncate" title={r.room}>{r.room}</td>
                      <td className="p-4 w-[9%] text-left text-muted-foreground font-mono text-[10px] truncate" title={r.checkIn}>{r.checkIn}</td>
                      <td className="p-4 w-[9%] text-left text-muted-foreground font-mono text-[10px] truncate" title={r.checkOut}>{r.checkOut}</td>
                      <td className="p-4 w-[10%] text-left">
                        <Tag tone="brand">{r.source}</Tag>
                      </td>
                      <td className="p-4 w-[8%] text-left font-bold text-navy font-mono">
                        ₹{(r.amount || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 w-[8%] text-left">
                        <Tag tone={pay.tone}>{pay.label}</Tag>
                      </td>
                      <td className="p-4 w-[10%] text-left">
                        <Tag tone={statusTone(r.status)}>{r.status}</Tag>
                      </td>
                      <td className="p-4 w-[10%] text-left">
                        <div className="flex gap-1.5 justify-start items-center">
                          <button
                            onClick={() => { setSelectedBooking(r); setModalOpen(true); }}
                            className="p-1.5 rounded-full hover:bg-muted text-navy-deep cursor-pointer flex items-center justify-center h-7 w-7"
                            title="View Details"
                          >
                            <Eye className="size-3.5" />
                          </button>
                          {isCancellable && (
                            <button
                              onClick={() => handleCancelReservation(r)}
                              className="p-1.5 rounded-full hover:bg-muted text-warning cursor-pointer flex items-center justify-center h-7 w-7"
                              title="Cancel Booking"
                            >
                              <X className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Booking Details Modal */}
      {modalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/5 backdrop-blur-sm flex justify-center items-start py-8 sm:py-16 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-[0_20px_50px_rgba(13,27,42,0.15)] relative border border-muted my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-muted">
              <h3 className="font-display font-bold text-lg text-navy flex items-center gap-2">
                <Calendar className="size-5 text-purple" />
                <span>Reservation Details</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-navy cursor-pointer size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-left text-xs leading-relaxed">
              <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border border-muted/30">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Booking ID</span>
                  <p className="text-sm font-bold text-navy mt-0.5">{selectedBooking.id || selectedBooking._id}</p>
                </div>
                <Tag tone={statusTone(selectedBooking.status)}>{selectedBooking.status}</Tag>
              </div>

              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <User className="size-4 text-purple shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-navy font-semibold">Guest Contact Details:</strong>
                    <p className="text-muted-foreground text-sm font-semibold mt-0.5">{selectedBooking.guest}</p>
                    <p className="text-muted-foreground font-mono text-[11px]">{selectedBooking.phone || "No phone contact"}</p>
                  </div>
                </div>

                <div className="border-t border-muted my-3" />

                <div className="flex gap-2">
                  <Building className="size-4 text-purple shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-navy font-semibold">Hotel Property & Room:</strong>
                    <p className="text-muted-foreground mt-0.5">{getPropertyName(selectedBooking.propertyId)}</p>
                    <p className="text-muted-foreground text-[11px] italic mt-0.5">{getPropertyLocation(selectedBooking.propertyId)}</p>
                    <p className="text-navy font-semibold mt-1">Room: {selectedBooking.room}</p>
                  </div>
                </div>

                <div className="border-t border-muted my-3" />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-navy font-semibold">Check-in:</strong>
                    <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{selectedBooking.checkIn}</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Check-out:</strong>
                    <p className="text-muted-foreground font-mono text-[11px] mt-0.5">{selectedBooking.checkOut}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <strong className="text-navy font-semibold">Stay Duration:</strong>
                    <p className="text-muted-foreground mt-0.5">{selectedBooking.nights} Nights ({selectedBooking.pax || "2 Adults"})</p>
                  </div>
                  <div>
                    <strong className="text-navy font-semibold">Booking Source:</strong>
                    <p className="mt-0.5"><Tag tone="brand">{selectedBooking.source}</Tag></p>
                  </div>
                </div>

                <div className="border-t border-muted my-3" />

                <div className="flex gap-2">
                  <Landmark className="size-4 text-purple shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="text-navy font-semibold">Billing Ledger Summary:</strong>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] bg-muted/10 p-2.5 rounded-lg border border-muted/50">
                      <div>
                        <span className="text-muted-foreground">Total Tariff:</span>
                        <p className="text-navy font-bold text-xs mt-0.5">₹{(selectedBooking.amount || 0).toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance Pending:</span>
                        <p className={cn("font-bold text-xs mt-0.5", selectedBooking.balance > 0 ? "text-warning" : "text-success")}>
                          ₹{(selectedBooking.balance || 0).toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-muted mt-4">
              <Button onClick={() => setModalOpen(false)} className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 text-xs cursor-pointer">Close Panel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/reservations")({
  head: () => ({
    meta: [
      { title: "Reservations Ledger — Hour Stay" },
      { name: "description", content: "Consolidated booking database across all active and onboarding hotel properties." },
      { property: "og:title", content: "Reservations Ledger — Hour Stay" },
      { property: "og:description", content: "Consolidated booking database across all active and onboarding hotel properties." }
    ]
  }),
  component: SuperAdminReservations
});