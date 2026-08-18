import { FormField, Input, Select, Textarea, Checkbox, Switch } from "@/components/hs/FormFields";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";


import { toast } from "sonner";
import {
  Search,
  Calendar,
  Building,
  User,
  Eye,
  X,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Bookmark,
  Receipt,
  Trash2
} from "lucide-react";

function SuperAdminGuests() {
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    action: null
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bookingsRes, propertiesRes, usersRes] = await Promise.all([
        superAdminService.getReservations(),
        superAdminService.getProperties(),
        superAdminService.getUsers()
      ]);

      if (bookingsRes.success) setBookings(bookingsRes.data);
      if (propertiesRes.success) setProperties(propertiesRes.data);
      if (usersRes.success) setUsers(usersRes.data);
    } catch (err) {
      setError(err.message || "Failed to load guest directory data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to map property ID to Property Name
  const getPropertyName = (propertyId) => {
    const prop = properties.find(p => p.id === propertyId || p._id === propertyId);
    return prop ? prop.name : "Unknown Property";
  };

  // Consolidate Guests list (only those who registered OR made bookings)
  const getConsolidatedGuests = () => {
    const list = [];
    const processedBookingIds = new Set();
    const guestUsers = users.filter(u => u.role === "guest");

    // 1. Process all bookings
    bookings.forEach((b) => {
      processedBookingIds.add(b._id || b.id);
      
      // Find matching guest user
      const matchedUser = guestUsers.find(
        u => (u.name && b.guest && u.name.toLowerCase() === b.guest.toLowerCase()) || 
             (u.mobile && b.phone && u.mobile.replace(/\s+/g, '') === b.phone.replace(/\s+/g, ''))
      );

      list.push({
        id: b._id || b.id,
        name: b.guest || "Unknown Guest",
        email: matchedUser ? matchedUser.email : ((b.guest || "guest").toLowerCase().replace(/[^a-z0-9]/g, '') + "@example.com"),
        phone: b.phone || (matchedUser ? matchedUser.mobile : "—"),
        bookingId: b.id || b._id,
        propertyId: b.propertyId,
        propertyName: getPropertyName(b.propertyId),
        room: b.room || "—",
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        bookingStatus: b.status,
        paymentStatus: b.balance === 0 ? "Paid" : "Pending",
        booking: b
      });
    });

    // 2. Add registered guest users who have no bookings
    guestUsers.forEach((u) => {
      const hasBooking = list.some(
        item => (item.name && u.name && item.name.toLowerCase() === u.name.toLowerCase()) || 
                (item.phone && item.phone !== "—" && u.mobile && item.phone.replace(/\s+/g, '') === u.mobile.replace(/\s+/g, ''))
      );

      if (!hasBooking) {
        list.push({
          id: u._id || u.id,
          name: u.name || "Unknown Guest",
          email: u.email || "",
          phone: u.mobile || "—",
          bookingId: "—",
          propertyId: u.propertyId || "",
          propertyName: u.propertyId ? getPropertyName(u.propertyId) : "—",
          room: "—",
          checkIn: "—",
          checkOut: "—",
          bookingStatus: "—",
          paymentStatus: "—",
          booking: null
        });
      }
    });

    return list;
  };

  const consolidatedGuests = getConsolidatedGuests();

  // Filter Consolidated Guests
  const filteredGuests = consolidatedGuests.filter((item) => {
    // Search
    const matchesSearch =
      searchQuery === "" ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.email && item.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.phone && item.phone.includes(searchQuery)) ||
      (item.bookingId && item.bookingId.toLowerCase().includes(searchQuery.toLowerCase()));

    // Property
    const matchesProperty = propertyFilter === "All" || item.propertyId === propertyFilter;

    // Status
    const matchesStatus = statusFilter === "All" || item.bookingStatus === statusFilter;

    // Date Range
    let matchesDate = true;
    if (startDate || endDate) {
      if (item.checkIn && item.checkIn !== "—") {
        const itemDate = new Date(item.checkIn);
        if (startDate) {
          const start = new Date(startDate);
          if (itemDate < start) matchesDate = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          if (itemDate > end) matchesDate = false;
        }
      } else {
        matchesDate = false;
      }
    }

    return matchesSearch && matchesProperty && matchesStatus && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const paginatedGuests = filteredGuests.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleCancelBooking = (guestItem) => {
    setConfirmModal({
      open: true,
      title: "Cancel Guest Booking",
      message: `Are you sure you want to cancel booking "${guestItem.bookingId}" for guest "${guestItem.name}"?`,
      action: async () => {
        try {
          const res = await superAdminService.updateReservation(guestItem.id, {
            status: "Cancelled"
          });
          if (res.success) {
            toast.success("Booking cancelled successfully.");
            loadData();
          }
        } catch (err) {
          toast.error(err.message || "Failed to cancel booking.");
        } finally {
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      }
    });
  };

  const handleDeleteBooking = (guestItem) => {
    setConfirmModal({
      open: true,
      title: "Delete Booking Record",
      message: `Are you sure you want to permanently delete booking "${guestItem.bookingId}"? This cannot be undone.`,
      action: async () => {
        try {
          const res = await superAdminService.deleteReservation(guestItem.id);
          if (res.success) {
            toast.success("Booking deleted successfully.");
            loadData();
          }
        } catch (err) {
          toast.error(err.message || "Failed to delete booking.");
        } finally {
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      }
    });
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title="Guest & Customer Directory"
        subtitle="View and manage consolidated guest records, active hotel stays, check-in schedules, and redemptions."
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {/* Toolbar Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-card border rounded-xl p-4 shadow-soft">
        {/* Search */}
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="pl-9 h-10 rounded-full border-muted text-xs bg-white"
          />
        </div>

        {/* Property Filter */}
        <div>
          <Select
            value={propertyFilter}
            onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
            className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
          >
            <option value="All">All Properties</option>
            {properties.map((p) => (
              <option key={p.id || p._id} value={p.id || p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-white border border-muted px-3.5 h-10 rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-purple cursor-pointer shadow-soft text-muted-foreground"
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Checked-in">Checked-in</option>
            <option value="Checked-out">Checked-out</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>

        {/* Date Range Start */}
        <div>
          <Input
            type="date"
            placeholder="From Date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="h-10 rounded-full border-muted text-xs bg-white text-muted-foreground"
          />
        </div>

        {/* Date Range End */}
        <div>
          <Input
            type="date"
            placeholder="To Date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="h-10 rounded-full border-muted text-xs bg-white text-muted-foreground"
          />
        </div>
      </div>

      {/* Directory Database */}
      <Panel title="Guest Database Records" description={`Showing ${filteredGuests.length} total guest accounts`}>
        <div className="p-4 bg-white rounded-b-xl space-y-4">
          {loading ? (
            <LoadingRows rows={5} />
          ) : paginatedGuests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-xs font-semibold">
              No matching guests or reservation records found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4 text-left whitespace-nowrap">Guest Details</th>
                      <th className="p-4 text-left whitespace-nowrap">Contact</th>
                      <th className="p-4 text-left whitespace-nowrap">Booking ID</th>
                      <th className="p-4 text-left whitespace-nowrap">Assigned Property</th>
                      <th className="p-4 text-left whitespace-nowrap">Room Stays</th>
                      <th className="p-4 text-left whitespace-nowrap">Check-In</th>
                      <th className="p-4 text-left whitespace-nowrap">Check-Out</th>
                      <th className="p-4 text-left whitespace-nowrap">Status</th>
                      <th className="p-4 text-left whitespace-nowrap">Payment</th>
                      <th className="p-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {paginatedGuests.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 whitespace-nowrap text-left">
                          <div className="font-bold text-navy text-sm flex items-center gap-1.5">
                            <User className="size-3.5 text-purple shrink-0" />
                            {g.name}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-left">
                          <div className="text-navy font-semibold">{g.email}</div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{g.phone}</div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-left font-mono font-bold text-purple">{g.bookingId}</td>
                        <td className="p-4 whitespace-nowrap text-left font-semibold text-navy">
                          <div className="flex items-center gap-1.5">
                            <Building className="size-3 text-navy/40 shrink-0" />
                            {g.propertyName}
                          </div>
                        </td>
                        <td className="p-4 whitespace-nowrap text-left font-semibold text-muted-foreground">{g.room}</td>
                        <td className="p-4 whitespace-nowrap text-left font-semibold text-navy">{g.checkIn}</td>
                        <td className="p-4 whitespace-nowrap text-left font-semibold text-navy">{g.checkOut}</td>
                        <td className="p-4 whitespace-nowrap text-left">
                          <Tag tone={
                            g.bookingStatus === "Confirmed" || g.bookingStatus === "Checked-in" ? "success" :
                            g.bookingStatus === "Checked-out" ? "neutral" :
                            g.bookingStatus === "Cancelled" ? "error" : "warning"
                          }>
                            {g.bookingStatus}
                          </Tag>
                        </td>
                        <td className="p-4 whitespace-nowrap text-left">
                          <Tag tone={g.paymentStatus === "Paid" ? "success" : g.paymentStatus === "—" ? "neutral" : "warning"}>
                            {g.paymentStatus}
                          </Tag>
                        </td>
                        <td className="p-4 text-right space-x-1 whitespace-nowrap">
                          <Link
                            to={`/super-admin/users/view/${g.id}`}
                            className="size-8 p-0 rounded-full text-navy hover:bg-muted cursor-pointer flex items-center justify-center inline-flex"
                            title="View Guest Record"
                          >
                            <Eye className="size-4" />
                          </Link>
                          {g.booking && g.bookingStatus !== "Cancelled" && g.bookingStatus !== "Checked-out" && (
                            <Button
                              onClick={() => handleCancelBooking(g)}
                              variant="ghost"
                              className="size-8 p-0 rounded-full text-warning hover:bg-warning/10 cursor-pointer"
                              title="Cancel Booking"
                            >
                              <XCircle className="size-4" />
                            </Button>
                          )}
                          {g.booking && (
                            <Button
                              onClick={() => handleDeleteBooking(g)}
                              variant="ghost"
                              className="size-8 p-0 rounded-full text-error hover:bg-error/10 cursor-pointer"
                              title="Delete Booking"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 text-xs font-semibold">
                  <span className="text-muted-foreground">Showing page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-muted hover:bg-muted font-bold"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-muted hover:bg-muted font-bold"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Panel>


      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-deep/60 backdrop-blur-sm animate-fade-in text-left">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-[0_20px_50px_rgba(13,27,42,0.35)] border border-navy/5 relative">
            <div className="flex items-center gap-2 pb-2 mb-2">
              <AlertTriangle className="size-5 text-error" />
              <h4 className="font-display font-bold text-navy text-base">{confirmModal.title}</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-normal mb-4 font-medium">{confirmModal.message}</p>
            <div className="flex gap-2 justify-end border-t pt-4">
              <Button
                variant="ghost"
                onClick={() => setConfirmModal({ open: false, title: "", message: "", action: null })}
                className="rounded-full text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                onClick={confirmModal.action}
                className="bg-error hover:bg-error/90 text-cream rounded-full px-5 text-xs font-semibold cursor-pointer"
              >
                Confirm Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/users")({
  head: () => ({
    meta: [
      { title: "Guest Directory Control Console — Hour Stay" },
      { name: "description", content: "Manage guest databases and registration accounts across properties." }
    ]
  }),
  component: SuperAdminGuests
});