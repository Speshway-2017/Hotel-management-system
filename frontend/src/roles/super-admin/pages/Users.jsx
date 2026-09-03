import { FormField, Input, Select } from "@/components/hs/FormFields";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  Search,
  Building,
  User,
  Eye,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/super-admin/users")({
  head: () => ({
    meta: [
      { title: "Guests Portfolio — Super Admin | Hour Stay" },
      { name: "description", content: "Consolidated guest accounts, portfolio profiles, and guest loyalty registry across all properties." }
    ]
  }),
  component: SuperAdminGuests
});

function SuperAdminGuests() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const [usersRes, bookingsRes, propertiesRes] = await Promise.all([
        superAdminService.getUsers().catch(() => ({})),
        superAdminService.getReservations().catch(() => ({})),
        superAdminService.getProperties().catch(() => ({}))
      ]);

      if (usersRes.success && Array.isArray(usersRes.data)) {
        setUsers(usersRes.data);
      }
      if (bookingsRes.success && Array.isArray(bookingsRes.data)) {
        setBookings(bookingsRes.data);
      }
      if (propertiesRes.success && Array.isArray(propertiesRes.data)) {
        setProperties(propertiesRes.data);
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load guests directory.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);

    const handleFocus = () => loadData(true);
    window.addEventListener("focus", handleFocus);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const getPropertyName = (propertyId) => {
    if (!propertyId || propertyId === "all") return "Central Portfolio";
    const prop = properties.find((p) => p.id === propertyId || p._id === propertyId);
    return prop ? prop.name : "All Properties";
  };

  // Build guests directory (all registered guests with aggregated stay metrics)
  const guestDirectory = useMemo(() => {
    const guestUsers = users.filter((u) => u.role === "guest");

    return guestUsers.map((u) => {
      const userBookings = bookings.filter(
        (b) =>
          (b.email && u.email && b.email.toLowerCase() === u.email.toLowerCase()) ||
          (b.phone && u.mobile && b.phone.replace(/\s+/g, "") === u.mobile.replace(/\s+/g, "")) ||
          (b.guest && u.name && b.guest.toLowerCase() === u.name.toLowerCase())
      );

      const totalStays = userBookings.length;
      const latestBooking = userBookings[0] || null;

      return {
        id: u._id || u.id,
        name: u.name || "Guest",
        email: u.email || "—",
        phone: u.mobile || "—",
        propertyId: u.propertyId || (latestBooking ? latestBooking.propertyId : "all"),
        propertyName: getPropertyName(u.propertyId || (latestBooking ? latestBooking.propertyId : "all")),
        status: u.status || "Active",
        totalStays,
        joinedAt: u.createdAt || u.joinedAt || null,
        city: u.city || (latestBooking ? latestBooking.city : "—")
      };
    });
  }, [users, bookings, properties]);

  // Filtered dataset
  const filteredGuests = useMemo(() => {
    return guestDirectory.filter((g) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        g.propertyName.toLowerCase().includes(q);

      const matchesProperty = propertyFilter === "All" || g.propertyId === propertyFilter;
      const matchesStatus = statusFilter === "All" || g.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesProperty && matchesStatus;
    });
  }, [guestDirectory, searchQuery, propertyFilter, statusFilter]);

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage) || 1;
  const paginatedGuests = filteredGuests.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6 text-left font-ui">
      <PageHeader
        title="Guests Portfolio & Profiles"
        subtitle="Overview of registered guest directory, contact coordinates, preferred locations, and lifetime stay metrics."
      />

      {error && <Notice tone="error" title="Synchronization Notice">{error}</Notice>}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Guests</span>
            <span className="p-2 rounded-lg bg-navy/5 text-navy"><User className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-navy font-display">{guestDirectory.length}</p>
          <span className="text-[11px] text-muted-foreground">Registered profile accounts</span>
        </div>

        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple uppercase tracking-wider">Active Members</span>
            <span className="p-2 rounded-lg bg-purple/10 text-purple"><ShieldCheck className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple font-display">
            {guestDirectory.filter((g) => g.status === "Active").length}
          </p>
          <span className="text-[11px] text-muted-foreground">In good standing</span>
        </div>

        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Completed Stays</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Sparkles className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 font-display">
            {guestDirectory.reduce((sum, g) => sum + g.totalStays, 0)}
          </p>
          <span className="text-[11px] text-muted-foreground">Lifetime bookings aggregated</span>
        </div>
      </div>

      {/* Filters */}
      <Panel title="Guest Directory Index" description={`Displaying ${filteredGuests.length} registered guest accounts.`}>
        <div className="p-4 border-b border-navy/5 bg-cream/20 flex flex-wrap gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search guest by name, email, phone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="pl-10 text-xs bg-white h-9 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <select
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs bg-white rounded-lg border border-navy/15 focus:ring-1 focus:ring-purple font-medium cursor-pointer"
            >
              <option value="All">All Properties</option>
              {properties.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs bg-white rounded-lg border border-navy/15 focus:ring-1 focus:ring-purple font-medium cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              className="h-9 px-3 rounded-lg text-xs"
              title="Refresh Directory"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-bold">
                <th className="p-3.5 pl-6">Guest Profile</th>
                <th className="p-3.5">Contact Coordinates</th>
                <th className="p-3.5">Preferred Property</th>
                <th className="p-3.5">Lifetime Stays</th>
                <th className="p-3.5">Joined Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-6 w-28 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-6">
                    <LoadingRows count={5} />
                  </td>
                </tr>
              ) : paginatedGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <User className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-sm text-navy">No Guest Profiles Found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery || propertyFilter !== "All" || statusFilter !== "All"
                        ? "Try adjusting your search query or property filters."
                        : "Registered guests will appear here automatically."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedGuests.map((g) => {
                  const dateFormatted = g.joinedAt
                    ? new Date(g.joinedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })
                    : "—";

                  return (
                    <tr key={g.id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-full bg-purple/10 text-purple flex items-center justify-center font-bold text-xs shrink-0">
                            {g.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-navy text-xs">{g.name}</div>
                            <div className="text-[10px] text-muted-foreground">ID: {String(g.id).slice(-6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Mail className="size-3 shrink-0 text-purple" />
                          <span className="truncate">{g.email}</span>
                        </div>
                        {g.phone && g.phone !== "—" && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Phone className="size-3 shrink-0 text-emerald-600" />
                            <span>{g.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-navy font-semibold text-xs">
                          <Building className="size-3.5 text-purple shrink-0" />
                          <span>{g.propertyName}</span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cream/70 border border-navy/10 text-[11px] font-bold text-navy">
                          {g.totalStays} {g.totalStays === 1 ? "Stay" : "Stays"}
                        </span>
                      </td>

                      <td className="p-3.5 text-[11px] text-muted-foreground whitespace-nowrap">
                        {dateFormatted}
                      </td>

                      <td className="p-3.5">
                        <Tag tone={g.status === "Active" ? "success" : "neutral"} className="text-[10px] font-bold">
                          {g.status}
                        </Tag>
                      </td>

                      <td className="p-3.5 text-right pr-6 w-28 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate({ to: `/super-admin/users/view/${g.id}` })}
                          className="h-8 px-2.5 rounded-full hover:bg-purple/10 text-purple text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                          title="View Guest Details"
                        >
                          <Eye className="size-3.5" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-navy/5 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              Page {page} of {totalPages} ({filteredGuests.length} guests)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-lg text-xs"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-lg text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

export default SuperAdminGuests;