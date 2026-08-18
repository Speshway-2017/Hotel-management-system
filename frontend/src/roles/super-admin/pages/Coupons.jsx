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
  Plus,
  Search,
  Edit2,
  Trash2,
  Ticket,
  Percent,
  Calendar,
  Users,
  Activity,
  ToggleLeft,
  ToggleRight,
  Eye
} from "lucide-react";

function SuperAdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Pagination states
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    action: null
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const couponsRes = await superAdminService.getPromoCoupons();
      if (couponsRes.success) {
        setCoupons(couponsRes.data);
      }
    } catch (err) {
      setError(err.message || "Failed to sync coupons data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered coupons list
  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = c.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Paginated coupons
  const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
  const paginatedCoupons = filteredCoupons.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Stats counters
  const totalCouponsCount = coupons.length;
  const activeCouponsCount = coupons.filter(c => c.status === "Active").length;
  const totalUsedCount = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);
  const totalDiscountVal = coupons.reduce((sum, c) => sum + ((c.usedCount || 0) * (c.discountValue || 0)), 0);

  const triggerToggleStatus = (coupon) => {
    const nextStatus = coupon.status === "Active" ? "Inactive" : "Active";
    setConfirmModal({
      open: true,
      title: `${nextStatus === "Active" ? "Activate" : "Deactivate"} Coupon`,
      message: `Are you sure you want to toggle the status of Coupon "${coupon.code}" to ${nextStatus}?`,
      action: async () => {
        try {
          const res = await superAdminService.updatePromoCoupon(coupon._id || coupon.id, {
            status: nextStatus
          });
          if (res.success) {
            toast.success(`Coupon "${coupon.code}" is now ${nextStatus}.`);
            loadData();
          }
        } catch (err) {
          toast.error(err.message || "Failed to toggle status.");
        } finally {
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      }
    });
  };

  const triggerDelete = (coupon) => {
    setConfirmModal({
      open: true,
      title: "Delete Promo Coupon",
      message: `Are you sure you want to permanently delete Coupon "${coupon.code}"? This action is irreversible.`,
      action: async () => {
        try {
          const res = await superAdminService.deletePromoCoupon(coupon._id || coupon.id);
          if (res.success) {
            toast.success(`Coupon "${coupon.code}" deleted successfully.`);
            loadData();
          }
        } catch (err) {
          toast.error(err.message || "Failed to delete coupon.");
        } finally {
          setConfirmModal({ open: false, title: "", message: "", action: null });
        }
      }
    });
  };

  return (
    <div className="space-y-6 text-left">

      <PageHeader
        title="Promo Coupons Control Center"
        subtitle="Manage discounts, promo coupons, usage boundaries, and applicable tier plans for subscriptions."
        actions={
          <Link
            to="/super-admin/coupons/add"
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 flex items-center gap-1.5 h-9 font-bold text-xs cursor-pointer"
          >
            <Plus className="size-4" />
            Add Coupon
          </Link>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}


      <Panel title="Promo Coupons Database" description="Live promo coupons for guest reservations.">
        <div className="p-4 bg-white rounded-b-xl space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search coupon code..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-9 h-9 rounded-full border border-navy/45 text-xs bg-white w-full text-navy font-semibold focus:border-navy focus:ring-1 focus:ring-navy"
              />
            </div>
            
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground font-semibold">Status:</span>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="h-9 border border-navy/45 bg-cream/10 rounded-full px-4 text-xs font-semibold text-navy focus:outline-none cursor-pointer"
              >
                <option value="All">All Coupons</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </Select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <LoadingRows rows={4} />
          ) : paginatedCoupons.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs font-medium">No promo coupons found.</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                  <thead>
                    <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-semibold">
                      <th className="p-4">Coupon Code</th>
                      <th className="p-4">Discount Details</th>
                      <th className="p-4">Validity Range</th>
                      <th className="p-4">Min Spend</th>
                      <th className="p-4">Usage Limits</th>
                      <th className="p-4">Used Count</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-sans">
                    {paginatedCoupons.map((c) => (
                      <tr key={c._id || c.id} className="hover:bg-muted/15 transition-colors">
                        <td className="p-4 font-bold text-navy flex items-center gap-2">
                          <Ticket className="size-4 text-purple" />
                          <div>
                            <div className="font-bold text-navy">{c.code}</div>
                            {c.description && <div className="text-[9px] text-muted-foreground font-semibold">{c.description}</div>}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-navy">
                          {c.discountType === "percentage" ? `${c.discountValue}% Off` : `₹${c.discountValue} Off`}
                        </td>
                        <td className="p-4 font-semibold text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3 text-navy/40" />
                            <span>{c.validFrom} to {c.validUntil}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-navy">₹{(c.minimumSubscriptionAmount || 0).toLocaleString("en-IN")}</td>
                        <td className="p-4 font-semibold text-navy">{c.usageLimit} Max</td>
                        <td className="p-4 font-bold text-purple">{c.usedCount || 0} times</td>
                        <td className="p-4">
                          <Tag tone={c.status === "Active" ? "success" : "neutral"}>{c.status}</Tag>
                        </td>
                        <td className="p-4 text-right space-x-1 whitespace-nowrap">
                          <Link
                            to={`/super-admin/coupons/view/${c._id || c.id}`}
                            className="size-8 p-0 rounded-full text-navy hover:bg-muted cursor-pointer inline-flex items-center justify-center"
                            title="View Coupon Details"
                          >
                            <Eye className="size-4" />
                          </Link>
                          <Link
                            to={`/super-admin/coupons/edit/${c._id || c.id}`}
                            className="size-8 p-0 rounded-full text-purple hover:bg-purple/10 cursor-pointer inline-flex items-center justify-center"
                            title="Edit Coupon"
                          >
                            <Edit2 className="size-4" />
                          </Link>
                          <Button
                            onClick={() => triggerToggleStatus(c)}
                            variant="ghost"
                            className={`size-8 p-0 rounded-full hover:bg-muted cursor-pointer ${c.status === "Active" ? "text-warning" : "text-success"}`}
                            title={c.status === "Active" ? "Deactivate Coupon" : "Activate Coupon"}
                          >
                            {c.status === "Active" ? <ToggleLeft className="size-5" /> : <ToggleRight className="size-5" />}
                          </Button>
                          <Button
                            onClick={() => triggerDelete(c)}
                            variant="ghost"
                            className="size-8 p-0 rounded-full text-error hover:bg-error/10 cursor-pointer"
                            title="Delete Coupon"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 text-xs">
                  <span className="text-muted-foreground">Showing page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                      disabled={page === 1}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-muted hover:bg-muted font-semibold"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={page === totalPages}
                      variant="outline"
                      size="sm"
                      className="rounded-full border-muted hover:bg-muted font-semibold"
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
            <h4 className="font-display font-bold text-navy text-base mb-2">{confirmModal.title}</h4>
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

export const Route = createFileRoute("/super-admin/coupons")({
  head: () => ({
    meta: [
      { title: "Subscription Coupons Management — Hour Stay" },
      { name: "description", content: "Manage SaaS subscription discount coupons." }
    ]
  }),
  component: SuperAdminCoupons
});
