import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Building,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle2,
  Trash2
} from "lucide-react";

export const Route = createFileRoute("/super-admin/contacts/view/$id")({
  head: () => ({
    meta: [
      { title: "Contact Request Details — Super Admin | Hour Stay" },
      { name: "description", content: "View complete client onboarding inquiry and communication log." }
    ]
  }),
  component: ViewContactRequest
});

export function ViewContactRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getContactRequest(id);
        if (res && res.success && res.data) {
          setContact(res.data);
        } else {
          setError("Contact inquiry record not found.");
        }
      } catch (err) {
        setError(err.message || "Failed to load contact request details.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (!contact) return;
    try {
      const res = await superAdminService.updateContactRequestStatus(contact._id || contact.id, newStatus);
      if (res && res.success) {
        toast.success(`Inquiry marked as "${newStatus}".`);
        setContact(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.message || "Failed to update status.");
    }
  };

  const handleDelete = async () => {
    if (!contact) return;
    if (!window.confirm(`Are you sure you want to delete inquiry from "${contact.name}"?`)) return;
    try {
      const res = await superAdminService.deleteContactRequest(contact._id || contact.id);
      if (res && res.success) {
        toast.success("Contact request deleted.");
        navigate({ to: "/super-admin/contacts" });
      }
    } catch (err) {
      toast.error(err.message || "Failed to delete request.");
    }
  };

  const getStatusBadge = (status) => {
    const norm = (status || "New").toLowerCase();
    if (norm === "new") return <Tag tone="brand" className="font-semibold text-xs px-2.5 py-0.5">New</Tag>;
    if (norm === "in progress") return <Tag tone="warning" className="font-semibold text-xs px-2.5 py-0.5">In Progress</Tag>;
    if (norm === "resolved" || norm === "replied") return <Tag tone="success" className="font-semibold text-xs px-2.5 py-0.5">Resolved</Tag>;
    return <Tag tone="neutral" className="font-semibold text-xs px-2.5 py-0.5">{status}</Tag>;
  };

  return (
    <div className="space-y-6 text-left font-ui">
      <Crumbs
        items={[
          { label: "Contact Inquiries", to: "/super-admin/contacts" },
          { label: contact ? (contact.subject || "Inquiry Details") : "Contact Inquiry Details" }
        ]}
      />

      <PageHeader
        title={contact ? `Inquiry: ${contact.subject || "Contact Submission"}` : "Contact Inquiry Details"}
        subtitle="Full message content, contact coordinates, and status management."
      />

      {error && <Notice tone="error" title="Inquiry Notice">{error}</Notice>}

      {loading ? (
        <LoadingRows count={4} />
      ) : contact ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Contact Details Card */}
          <div className="md:col-span-1 space-y-4">
            <Panel title="Client Profile" description="Verified inquiry coordinates">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 p-4 border border-navy/10 rounded-xl bg-cream/30">
                  <div className="size-12 rounded-full bg-purple/10 text-purple flex items-center justify-center font-extrabold text-lg shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-navy text-sm">{contact.name}</h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">Public Inquiry Lead</span>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Current Status</span>
                    <div>{getStatusBadge(contact.status)}</div>
                  </div>

                  <div className="flex items-center gap-2.5 pb-2 border-b border-navy/5">
                    <Mail className="size-4 text-purple shrink-0" />
                    <a href={`mailto:${contact.email}`} className="truncate text-navy font-semibold hover:underline">
                      {contact.email}
                    </a>
                  </div>

                  {contact.phone && (
                    <div className="flex items-center gap-2.5 pb-2 border-b border-navy/5">
                      <Phone className="size-4 text-emerald-600 shrink-0" />
                      <a href={`tel:${contact.phone}`} className="text-navy font-semibold hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 pb-2 border-b border-navy/5">
                    <Building className="size-4 text-navy/40 shrink-0" />
                    <span>Property Scope: <strong className="text-navy">{contact.propertyId || "General Lead"}</strong></span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-4 text-navy/40 shrink-0" />
                    <span>
                      Received: {contact.createdAt ? new Date(contact.createdAt).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-navy/10 space-y-2">
                  <Button
                    asChild
                    size="sm"
                    className="w-full rounded-full bg-purple hover:bg-purple/90 text-white text-xs font-bold cursor-pointer"
                  >
                    <a href={`mailto:${contact.email}?subject=Re: ${contact.subject || "Hour Stay Inquiry"}`}>
                      <Mail className="size-3.5 mr-1.5" />
                      Reply via Email
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="w-full rounded-full border-error/30 text-error hover:bg-error/10 text-xs font-semibold cursor-pointer"
                  >
                    <Trash2 className="size-3.5 mr-1.5" />
                    Delete Inquiry
                  </Button>
                </div>
              </div>
            </Panel>
          </div>

          {/* Message Content & Status Controls */}
          <div className="md:col-span-2 space-y-4">
            <Panel title="Message Content" description="Complete message submitted via contact form">
              <div className="p-6 bg-white rounded-b-xl space-y-6 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple block mb-1">Subject Header</span>
                  <h3 className="font-display text-lg font-bold text-navy">{contact.subject || "General Inquiry"}</h3>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">Message Body</span>
                  <div className="p-5 rounded-xl bg-cream/30 border border-navy/10 text-xs text-navy leading-relaxed whitespace-pre-wrap font-sans">
                    {contact.message}
                  </div>
                </div>

                {/* Quick Status Changers */}
                <div className="p-4 rounded-xl border border-navy/10 bg-muted/10 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-navy">Update Request Status:</span>
                  <div className="flex gap-2">
                    {["New", "In Progress", "Resolved"].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleStatusChange(st)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          (contact.status || "New") === st
                            ? "bg-navy text-cream shadow-xs"
                            : "bg-white border border-navy/15 text-navy hover:bg-cream/40"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ViewContactRequest;
