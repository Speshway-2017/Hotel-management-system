import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader, Panel, Tag, Notice, LoadingRows, ActionGroup, ViewActionButton, EditActionButton, DeleteActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/hs/FormFields";
import { adminService } from "@/services/admin";
import { toast } from "sonner";
import { subscribeRealtimeSync } from "@/services/socket";
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  Percent,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Tag as TagIcon,
  Flame,
  ArrowRight,
  Clock,
  ShieldCheck,
  Building2,
  DollarSign,
  Eye
} from "lucide-react";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({
    meta: [
      { title: "Coupons & Offers — Admin Console" },
      { name: "description", content: "Create and manage promotional coupons and direct website booking discounts." }
    ]
  }),
  component: AdminCouponsPage
});

function StatCard({ label, value, hint, accentColor = "#0d1b2a", icon: Icon }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[120px] h-full text-left"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-1.5 font-sans tracking-tight tabular-nums text-xl font-bold text-slate-800 leading-none">{value}</h3>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-navy/5 text-navy">
            <Icon className="size-4 text-purple" />
          </div>
        )}
      </div>
      <div className="mt-auto pt-2 text-[11px] text-muted-foreground truncate font-medium">
        {hint}
      </div>
    </div>
  );
}

export function AdminCouponsPage() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadData(isSilent = false) {
    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await adminService.getCoupons();
      if (res && (res.success || Array.isArray(res.data) || Array.isArray(res))) {
        const list = res.data || res;
        setCoupons(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load coupons");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  useEffect(() => {
    loadData(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleToggleStatus = async (coupon) => {
    const id = coupon._id || coupon.id;
    try {
      const res = await adminService.toggleCouponStatus(id);
      if (res.success || res.data) {
        toast.success(`Coupon ${coupon.code} status updated!`);
        loadData(true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id || deleteTarget.id;
    setIsDeleting(true);
    try {
      const res = await adminService.deleteCoupon(id);
      if (res.success || res.data) {
        toast.success(`Coupon ${deleteTarget.code} deleted successfully.`);
        setDeleteTarget(null);
        loadData(true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete coupon");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered coupons
  const filtered = coupons.filter(c => {
    const matchesSearch =
      (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.title && c.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    const matchesType = typeFilter === "All" || c.discountType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate quick stats
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.status === "Active").length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (Number(c.usedCount) || 0), 0);
  const percentageOffers = coupons.filter(c => c.discountType === "percentage").length;

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="space-y-6 text-left pb-16">
      {/* 1. Page Header Actions */}
      <div className="flex items-center justify-end">
        <Button
          onClick={() => navigate({ to: "/admin/coupons/add" })}
          className="bg-navy hover:bg-navy/90 text-white rounded-full font-bold shadow-soft hover:shadow-lift transition-all px-5 h-10 gap-2 cursor-pointer"
        >
          <Plus className="size-4" /> Create Coupon
        </Button>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Campaigns"
          value={totalCoupons}
          hint="All created discount coupons"
          icon={Ticket}
          accentColor="#534570"
        />
        <StatCard
          label="Active Coupons"
          value={activeCoupons}
          hint="Live on website checkout"
          icon={CheckCircle2}
          accentColor="#10b981"
        />
        <StatCard
          label="Total Redemptions"
          value={totalRedemptions}
          hint="Bookings using promo codes"
          icon={TrendingUp}
          accentColor="#3b82f6"
        />
        <StatCard
          label="Percentage Deals"
          value={percentageOffers}
          hint="Dynamic % off deals"
          icon={Percent}
          accentColor="#f59e0b"
        />
      </div>

      {/* 3. Search & Filter Bar */}
      <Panel>
        <div className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between bg-white rounded-xl">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search coupon code or title..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Status:</span>
              <Select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-9 text-xs w-32"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Type:</span>
              <Select
                value={typeFilter}
                onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                className="h-9 text-xs w-36"
              >
                <option value="All">All Types</option>
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </Select>
            </div>
          </div>
        </div>
      </Panel>

      {/* 4. Coupons Table List */}
      <Panel
        title={`All Coupons (${filtered.length})`}
        description="Coupons configured strictly for the public booking engine on the main website."
      >
        {loading ? (
          <div className="p-6">
            <LoadingRows count={4} />
          </div>
        ) : error ? (
          <div className="p-6">
            <Notice tone="danger" title="Error loading coupons">{error}</Notice>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-b-xl">
            <div className="size-14 rounded-full bg-purple/10 text-purple flex items-center justify-center mx-auto mb-3">
              <Ticket className="size-7" />
            </div>
            <h3 className="font-sans tracking-tight tabular-nums text-lg font-bold text-slate-800">No coupons match your filter</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
              Create a new promotional discount coupon or adjust your search filter to view campaigns.
            </p>
            <Button
              onClick={() => navigate({ to: "/admin/coupons/add" })}
              className="mt-4 bg-navy hover:bg-navy/90 text-white rounded-full text-xs font-bold px-4 h-9 gap-1.5 cursor-pointer"
            >
              <Plus className="size-3.5" /> Create Coupon
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-cream/60 border-b border-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Min. Spend</th>
                  <th className="py-3 px-4">Validity Window</th>
                  <th className="py-3 px-4">Usage & Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-left min-w-[160px] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/60">
                {paginated.map((c) => {
                  const isExpired = new Date() > new Date(c.validUntil);
                  const isExhausted = c.usageLimit > 0 && (c.usedCount || 0) >= c.usageLimit;
                  const discountDisplay = c.discountType === 'percentage'
                    ? `${c.discountValue}% OFF ${c.maxDiscount > 0 ? `(Max ₹${c.maxDiscount})` : ''}`
                    : `Flat ₹${c.discountValue.toLocaleString('en-IN')} OFF`;

                  const couponId = c._id || c.id;

                  return (
                    <tr key={couponId} className="hover:bg-purple/5 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-mono font-bold text-sm bg-purple/10 text-purple border border-purple/20 px-2.5 py-1 rounded-lg tracking-wider">
                            {c.code}
                          </div>
                        </div>
                        {c.title && c.title !== c.code && (
                          <div className="text-[11px] font-semibold text-navy mt-1 truncate max-w-[200px]">
                            {c.title}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy text-xs">{discountDisplay}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{c.discountType} discount</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-navy">
                          {c.minBookingAmount > 0 ? `₹${c.minBookingAmount.toLocaleString('en-IN')}` : 'No minimum'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px] font-medium text-navy flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          <span>{c.validFrom}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{c.validUntil}</span>
                        </div>
                        {isExpired && (
                          <span className="text-[10px] text-rose-600 font-bold mt-0.5 inline-block">
                            Expired
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy">
                          {c.usedCount || 0} <span className="font-normal text-muted-foreground">/ {c.usageLimit > 0 ? `${c.usageLimit} max` : 'Unlimited'}</span>
                        </div>
                        {c.usageLimit > 0 && (
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                            <div
                              className="h-full bg-purple"
                              style={{ width: `${Math.min(100, Math.round(((c.usedCount || 0) / c.usageLimit) * 100))}%` }}
                            />
                          </div>
                        )}
                        {isExhausted && (
                          <span className="text-[10px] text-amber-600 font-bold mt-0.5 inline-block">
                            Limit Reached
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleStatus(c)}
                          className="flex items-center gap-1.5 cursor-pointer text-left"
                          title="Click to toggle status"
                        >
                          <Tag tone={c.status === "Active" ? "success" : "neutral"}>
                            {c.status}
                          </Tag>
                          {c.status === "Active" ? (
                            <ToggleRight className="size-4 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="size-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-left align-middle min-w-[160px] whitespace-nowrap">
                        <ActionGroup align="left">
                          <ViewActionButton
                            onClick={() => navigate({ to: `/admin/coupons/view/${couponId}` })}
                          />
                          <EditActionButton
                            onClick={() => navigate({ to: `/admin/coupons/edit/${couponId}` })}
                          />
                          <DeleteActionButton
                            onClick={() => setDeleteTarget(c)}
                          />
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-muted flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="h-8 text-xs cursor-pointer disabled:opacity-40"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-8 text-xs cursor-pointer disabled:opacity-40"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-muted text-left">
            <h3 className="font-sans tracking-tight tabular-nums text-base font-bold text-slate-800">Delete Coupon</h3>
            <p className="text-xs text-muted-foreground mt-2">
              Are you sure you want to delete coupon <strong className="text-navy">{deleteTarget.code}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleDelete}
                className="cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCouponsPage;
