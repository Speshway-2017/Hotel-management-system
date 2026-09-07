import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { PageHeader, Panel, Tag, Notice, LoadingRows, ActionGroup, ViewActionButton, DeleteActionButton } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { superAdminService } from "@/services/superAdmin";
import { subscribeRealtimeSync } from "@/services/socket";
import { toast } from "sonner";
import {
  Search,
  Mail,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  MessageSquare,
  Building,
  RefreshCw,
  Send,
  X,
  Sparkles,
  Filter,
  Check
} from "lucide-react";

export const Route = createFileRoute("/super-admin/contacts")({
  head: () => ({
    meta: [
      { title: "Contact Requests — Super Admin | Hour Stay" },
      { name: "description", content: "Manage public contact form inquiries, client onboarding requests, and communication logs." }
    ]
  }),
  component: ContactRequestsPage
});

export function ContactRequestsPage() {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'New' | 'In Progress' | 'Resolved'

  // View Details Modal
  const [selectedContact, setSelectedContact] = useState(null);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    item: null
  });

  const loadContacts = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await superAdminService.getContactRequests();
      if (res && res.success && Array.isArray(res.data)) {
        setContacts(res.data);
      } else {
        setContacts([]);
      }
    } catch (err) {
      if (!isSilent) setError(err.message || "Failed to load contact inquiries.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts(false);

    const handleFocus = () => loadContacts(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      loadContacts(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Update Status Handler
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await superAdminService.updateContactRequestStatus(id, newStatus);
      if (res && res.success) {
        toast.success(`Inquiry marked as "${newStatus}".`);
        setContacts(prev =>
          prev.map(c => (c._id === id || c.id === id ? { ...c, status: newStatus } : c))
        );
        if (selectedContact && (selectedContact._id === id || selectedContact.id === id)) {
          setSelectedContact(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deleteModal.item) return;
    const id = deleteModal.item._id || deleteModal.item.id;
    try {
      const res = await superAdminService.deleteContactRequest(id);
      if (res && res.success) {
        toast.success("Contact request deleted successfully.");
        setContacts(prev => prev.filter(c => c._id !== id && c.id !== id));
        if (selectedContact && (selectedContact._id === id || selectedContact.id === id)) {
          setSelectedContact(null);
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete inquiry.");
    } finally {
      setDeleteModal({ open: false, item: null });
    }
  };

  // Filtered List
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.message && c.message.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (c.status || "New").toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [contacts, searchQuery, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = contacts.length;
    const newCount = contacts.filter(c => (c.status || "New") === "New").length;
    const inProgressCount = contacts.filter(c => c.status === "In Progress").length;
    const resolvedCount = contacts.filter(c => c.status === "Resolved" || c.status === "Replied").length;
    return { total, newCount, inProgressCount, resolvedCount };
  }, [contacts]);

  const getStatusBadge = (status) => {
    const norm = (status || "New").toLowerCase();
    if (norm === "new") {
      return <Tag tone="brand" className="font-semibold text-xs px-2.5 py-0.5">New</Tag>;
    }
    if (norm === "in progress") {
      return <Tag tone="warning" className="font-semibold text-xs px-2.5 py-0.5">In Progress</Tag>;
    }
    if (norm === "resolved" || norm === "replied") {
      return <Tag tone="success" className="font-semibold text-xs px-2.5 py-0.5">Resolved</Tag>;
    }
    return <Tag tone="neutral" className="font-semibold text-xs px-2.5 py-0.5">{status}</Tag>;
  };

  return (
    <div className="space-y-6 text-left font-ui">
      {/* 1. Page Header */}
      <PageHeader
        title="Contact Requests & Inquiries"
        subtitle="Manage public inquiries, hotel onboarding leads, and prospective client communications."
      />

      {error && (
        <Notice tone="error" title="Error loading inquiries">
          {error}
        </Notice>
      )}

      {/* 2. KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inquiries</span>
            <span className="p-2 rounded-lg bg-navy/5 text-navy"><MessageSquare className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-navy font-display">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground">All client messages</span>
        </div>

        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple uppercase tracking-wider">New Requests</span>
            <span className="p-2 rounded-lg bg-purple/10 text-purple"><Sparkles className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple font-display">{stats.newCount}</p>
          <span className="text-[11px] text-muted-foreground">Awaiting initial review</span>
        </div>

        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">In Progress</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-600 font-display">{stats.inProgressCount}</p>
          <span className="text-[11px] text-muted-foreground">Follow-up ongoing</span>
        </div>

        <div className="card-guest bg-white border border-navy/5 p-4 rounded-xl shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600 font-display">{stats.resolvedCount}</p>
          <span className="text-[11px] text-muted-foreground">Onboarded / Closed</span>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <Panel title="Inquiry Log Files" description="Filter and inspect submissions received through the public Contact page.">
        <div className="p-4 border-b border-navy/5 bg-cream/20 flex flex-wrap gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, property, text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-xs bg-white h-9 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {["all", "New", "In Progress", "Resolved"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-navy text-cream shadow-sm"
                    : "bg-white text-navy/70 border border-navy/10 hover:bg-cream/50"
                }`}
              >
                {st === "all" ? "All Inquiries" : st}
              </button>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadContacts(false)}
              className="h-9 px-3 rounded-lg text-xs"
              title="Refresh inquiries feed"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 uppercase tracking-wider text-muted-foreground text-[10px] font-bold">
                <th className="p-3.5 pl-6">Client / Contact</th>
                <th className="p-3.5">Hotel / Subject</th>
                <th className="p-3.5">Inquiry Snippet</th>
                <th className="p-3.5">Received Date</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right pr-6 min-w-[160px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6">
                    <LoadingRows count={4} />
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground">
                    <MessageSquare className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="font-semibold text-sm text-navy">No Contact Requests Found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {searchQuery || statusFilter !== "all"
                        ? "Try clearing your filters or search terms."
                        : "New inquiries from public visitors will appear here automatically."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((c) => {
                  const id = c._id || c.id;
                  const dateStr = c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "--";

                  return (
                    <tr key={id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-3.5 pl-6">
                        <div className="font-bold text-navy text-xs">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="size-3 shrink-0 text-purple" />
                          <span>{c.email}</span>
                        </div>
                        {c.phone && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Phone className="size-3 shrink-0 text-emerald-600" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-medium text-navy text-xs max-w-[200px]">
                        <div className="truncate font-semibold">{c.subject || "General Inquiry"}</div>
                        <div className="text-[11px] text-muted-foreground">{c.propertyId || "General Lead"}</div>
                      </td>

                      <td className="p-3.5 text-muted-foreground text-xs max-w-[280px]">
                        <p className="line-clamp-2 leading-relaxed">{c.message}</p>
                      </td>

                      <td className="p-3.5 text-muted-foreground text-[11px] whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="p-3.5">
                        <select
                          value={c.status || "New"}
                          onChange={(e) => handleStatusChange(id, e.target.value)}
                          className="text-[11px] font-semibold rounded-md border border-navy/15 bg-white px-2 py-1 focus:ring-1 focus:ring-purple cursor-pointer"
                        >
                          <option value="New">New</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                        </select>
                      </td>

                      <td className="p-3.5 text-right pr-6 min-w-[160px] whitespace-nowrap">
                        <ActionGroup>
                          <ViewActionButton onClick={() => navigate({ to: `/super-admin/contacts/view/${id}` })} />
                          <DeleteActionButton onClick={() => setDeleteModal({ open: true, item: c })} />
                        </ActionGroup>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 4. VIEW MESSAGE DETAILS MODAL */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-navy/10 overflow-hidden text-left font-ui">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-navy/10 bg-cream/30">
              <div>
                <span className="text-[10px] font-bold text-purple uppercase tracking-widest">Inquiry Details</span>
                <h3 className="font-display text-xl font-bold text-navy mt-0.5">
                  {selectedContact.subject || "Contact Submission"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedContact(null)}
                className="size-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-navy/5 transition-colors cursor-pointer"
              >
                <X className="size-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Contact Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-cream/40 border border-navy/5 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Full Name</span>
                  <span className="font-bold text-navy text-sm">{selectedContact.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Email Address</span>
                  <a href={`mailto:${selectedContact.email}`} className="font-bold text-purple hover:underline text-xs block truncate">
                    {selectedContact.email}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                  <a href={`tel:${selectedContact.phone}`} className="font-bold text-emerald-700 hover:underline text-xs block">
                    {selectedContact.phone || "--"}
                  </a>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Submitted Timestamp</span>
                  <span className="font-medium text-navy text-xs">
                    {selectedContact.createdAt ? new Date(selectedContact.createdAt).toLocaleString("en-IN") : "--"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Assigned Property Scope</span>
                  <span className="font-bold text-navy text-xs">{selectedContact.propertyId || "General Group"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Current Status</span>
                  <div className="mt-1">{getStatusBadge(selectedContact.status)}</div>
                </div>
              </div>

              {/* Message Content Box */}
              <div>
                <Label className="text-xs font-bold text-navy uppercase tracking-wider mb-2 block">
                  Complete Inquiry Message
                </Label>
                <div className="p-4 rounded-xl bg-muted/20 border border-navy/5 text-xs text-navy leading-relaxed font-sans whitespace-pre-wrap">
                  {selectedContact.message}
                </div>
              </div>

              {/* Status Update Quick Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-navy/10">
                <span className="text-xs font-semibold text-muted-foreground">Change Status:</span>
                <div className="flex gap-2">
                  {["New", "In Progress", "Resolved"].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedContact._id || selectedContact.id, st)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        (selectedContact.status || "New") === st
                          ? "bg-navy text-cream shadow-xs font-bold"
                          : "bg-white border border-navy/15 text-navy hover:bg-cream/40"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-navy/10 bg-cream/20 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedContact(null)}
                className="rounded-full text-xs cursor-pointer"
              >
                Close
              </Button>

              <div className="flex gap-2">
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-purple hover:bg-purple/90 text-white text-xs cursor-pointer"
                >
                  <a href={`mailto:${selectedContact.email}?subject=Re: ${selectedContact.subject || "Hour Stay Inquiry"}`}>
                    <Mail className="size-3.5 mr-1.5" />
                    Reply via Email
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELETE CONFIRMATION MODAL */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-navy/10 p-6 text-left font-ui">
            <div className="flex items-center gap-3 text-error mb-4">
              <div className="size-10 rounded-full bg-error/10 flex items-center justify-center">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h4 className="font-display font-bold text-base text-navy">Delete Contact Request</h4>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-6">
              Are you sure you want to permanently delete the inquiry from <strong>{deleteModal.item?.name}</strong>?
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteModal({ open: false, item: null })}
                className="rounded-full text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteConfirm}
                className="rounded-full bg-error text-white hover:bg-error/90 text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children, className = "" }) {
  return <label className={className}>{children}</label>;
}
