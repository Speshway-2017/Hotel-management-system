import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Mail,
  Phone,
  Building,
  Calendar,
  CheckCircle2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Send,
  CornerDownRight
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
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        let targetId = id;
        // If route is /super-admin/contacts/view/ without an ID, pick the most recent inquiry
        if (!targetId) {
          const listRes = await superAdminService.getContactRequests();
          const items = listRes?.data?.items || (Array.isArray(listRes?.data) ? listRes.data : []);
          if (items.length > 0) {
            targetId = items[0]._id || items[0].id;
            navigate({ to: `/super-admin/contacts/view/${targetId}` }, { replace: true });
          }
        }

        if (!targetId) {
          setError("No contact inquiries found in the system.");
          setLoading(false);
          return;
        }

        const res = await superAdminService.getContactRequest(targetId);
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

    fetchDetails();
  }, [id, navigate]);

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

  const handleOpenGmail = () => {
    if (!contact?.email) return;
    const subject = `Re: ${contact.subject || "Hour Stay Inquiry"}`;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}&su=${encodeURIComponent(subject)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    navigator.clipboard?.writeText?.(contact.email);
    toast.success("Opening Gmail in new tab! Recipient email copied to clipboard.");
  };

  const handleOpenDefaultMail = () => {
    if (!contact?.email) return;
    navigator.clipboard?.writeText?.(contact.email);
    window.location.href = `mailto:${encodeURIComponent(contact.email)}?subject=Re: ${encodeURIComponent(contact.subject || "Hour Stay Inquiry")}`;
    toast.info("Triggered default mail app. Recipient email copied to clipboard.");
  };

  const handleCopyEmail = () => {
    if (!contact?.email) return;
    navigator.clipboard?.writeText?.(contact.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    toast.success(`Copied "${contact.email}" to clipboard!`);
  };

  const getStatusBadge = (status) => {
    const norm = (status || "New").toLowerCase();
    if (norm === "new") return <Tag tone="brand" className="font-semibold text-xs px-2.5 py-0.5">New</Tag>;
    if (norm === "in progress") return <Tag tone="warning" className="font-semibold text-xs px-2.5 py-0.5">In Progress</Tag>;
    if (norm === "resolved" || norm === "replied") return <Tag tone="success" className="font-semibold text-xs px-2.5 py-0.5">{status || "Resolved"}</Tag>;
    return <Tag tone="neutral" className="font-semibold text-xs px-2.5 py-0.5">{status}</Tag>;
  };

  return (
    <div className="space-y-6 text-left font-ui">
      {/* Page Header */}
      <PageHeader
        title={contact ? `Inquiry: ${contact.subject || "Contact Submission"}` : "Contact Inquiry Details"}
        subtitle="Full message content, contact coordinates, and status management."
      />

      {error && (
        <Notice tone="error" title="Inquiry Notice">
          <div className="space-y-2">
            <p>{error}</p>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/super-admin/contacts" })}
              className="rounded-full bg-navy text-white text-xs cursor-pointer"
            >
              Go to Contact Requests
            </Button>
          </div>
        </Notice>
      )}

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
                    {contact.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-navy text-sm truncate">{contact.name}</h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">Public Inquiry Lead</span>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Current Status</span>
                    <div>{getStatusBadge(contact.status)}</div>
                  </div>

                  <div className="flex items-center justify-between gap-2.5 pb-2 border-b border-navy/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="size-4 text-purple shrink-0" />
                      <span className="truncate text-navy font-semibold">{contact.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="shrink-0 p-1 rounded hover:bg-cream/60 text-muted-foreground hover:text-navy transition-colors cursor-pointer"
                      title="Copy email address"
                    >
                      {copiedEmail ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    </button>
                  </div>

                  {contact.phone && (
                    <div className="flex items-center gap-2.5 pb-2 border-b border-navy/5">
                      <Phone className="size-4 text-emerald-600 shrink-0" />
                      <a href={`tel:${contact.phone}`} className="text-navy font-semibold hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-4 text-navy/40 shrink-0" />
                    <span>
                      Received: {contact.createdAt ? new Date(contact.createdAt).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="pt-4 border-t border-navy/10 space-y-2.5">
                  {/* Reply via Email opens dedicated reply page */}
                  <Button
                    size="sm"
                    onClick={() => navigate({ to: `/super-admin/contacts/reply/${contact._id || contact.id}` })}
                    className="w-full rounded-full bg-purple hover:bg-purple/90 text-white text-xs font-bold cursor-pointer shadow-sm hover:shadow transition-all"
                  >
                    <Mail className="size-3.5 mr-1.5" />
                    Reply via Email
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGmail}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-rose-200 bg-rose-50/60 hover:bg-rose-50 text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Open message in Gmail compose tab"
                    >
                      <ExternalLink className="size-3" />
                      Gmail Tab
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenDefaultMail}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg border border-navy/15 bg-white hover:bg-cream/40 text-navy text-[11px] font-semibold transition-colors cursor-pointer"
                      title="Open default email client"
                    >
                      <Mail className="size-3" />
                      Mail App
                    </button>
                  </div>

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

                {/* Show Admin Response Log if previously replied */}
                {(contact.replyMessage || contact.status === "Replied") && (
                  <div className="p-4 rounded-xl bg-purple/5 border border-purple/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple flex items-center gap-1.5">
                        <CheckCircle2 className="size-3.5 text-purple" />
                        Admin Reply Record
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {contact.repliedAt ? new Date(contact.repliedAt).toLocaleString("en-IN") : "Replied"}
                      </span>
                    </div>
                    {contact.replyMessage && (
                      <p className="text-xs text-navy whitespace-pre-wrap font-sans bg-white p-3.5 rounded-lg border border-purple/10 leading-relaxed">
                        {contact.replyMessage}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate({ to: `/super-admin/contacts/reply/${contact._id || contact.id}` })}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-purple hover:underline cursor-pointer"
                      >
                        <CornerDownRight className="size-3" />
                        Send Follow-up Email
                      </button>
                    </div>
                  </div>
                )}

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
