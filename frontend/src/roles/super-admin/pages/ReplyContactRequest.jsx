import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { validateWithZod, replyContactSchema } from "@/schemas";
import {
  Mail,
  Phone,
  Building,
  Calendar,
  Send,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Eye
} from "lucide-react";

export const Route = createFileRoute("/super-admin/contacts/reply/$id")({
  head: () => ({
    meta: [
      { title: "Reply via Email — Super Admin | Hour Stay" },
      { name: "description", content: "Compose and dispatch email reply to client contact inquiry." }
    ]
  }),
  component: ReplyContactRequest
});

export function ReplyContactRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form State
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [targetStatus, setTargetStatus] = useState("Resolved");
  const [submitting, setSubmitting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        let targetId = id;
        if (!targetId) {
          const listRes = await superAdminService.getContactRequests();
          const items = listRes?.data?.items || (Array.isArray(listRes?.data) ? listRes.data : []);
          if (items.length > 0) {
            targetId = items[0]._id || items[0].id;
            navigate({ to: `/super-admin/contacts/reply/${targetId}` }, { replace: true });
          }
        }

        if (!targetId) {
          setError("No contact inquiries found to reply to.");
          setLoading(false);
          return;
        }

        const res = await superAdminService.getContactRequest(targetId);
        if (res && res.success && res.data) {
          setContact(res.data);
          setReplySubject(`Re: ${res.data.subject || "Hour Stay Inquiry"}`);
          setReplyBody(
`Dear ${res.data.name},

Thank you for contacting Hour Stay Speshway Luxury Hotel.

In response to your inquiry regarding "${res.data.subject || 'our services'}":
We have reviewed your request and are delighted to assist you. 

If you require any further assistance or have additional questions, please do not hesitate to reach out to us directly.

Warm regards,
Super Admin Team
Hour Stay Speshway Luxury Hotel`
          );
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

  const applyTemplate = (type) => {
    if (!contact) return;
    if (type === "standard") {
      setReplySubject(`Re: ${contact.subject || "Hour Stay Inquiry"}`);
      setReplyBody(
`Dear ${contact.name},

Thank you for reaching out to Hour Stay Speshway Luxury Hotel.

In response to your inquiry regarding "${contact.subject || 'our services'}":
We have reviewed your request and are happy to assist you with everything you need.

Please feel free to reply directly to this email or call our front desk if you require urgent arrangements.

Warm regards,
Super Admin Team
Hour Stay Speshway Luxury Hotel`
      );
    } else if (type === "booking") {
      setReplySubject(`Reservation Assistance: Re: ${contact.subject || "Room Booking Inquiry"}`);
      setReplyBody(
`Dear ${contact.name},

Thank you for your interest in reserving a stay with Hour Stay Speshway Luxury Hotel.

We offer flexible hourly and overnight stay packages with premium amenities. To confirm your booking at special rates, please let us know:
1. Preferred Check-in Date & Time
2. Duration of Stay (Hourly / Overnight)
3. Number of Guests & Room Preference

We look forward to welcoming you!

Warm regards,
Reservations Desk
Hour Stay Speshway Luxury Hotel`
      );
    } else if (type === "resolved") {
      setReplySubject(`Inquiry Resolved: ${contact.subject || "Hour Stay Support"}`);
      setReplyBody(
`Dear ${contact.name},

We are pleased to inform you that your request regarding "${contact.subject || 'your inquiry'}" has been processed and successfully resolved.

Thank you for your patience and for choosing Hour Stay Speshway Luxury Hotel.

If there is anything else we can do to make your experience smoother, please do not hesitate to let us know.

Best regards,
Guest Relations
Hour Stay Speshway Luxury Hotel`
      );
    } else if (type === "more_info") {
      setReplySubject(`Additional Information Required: Re: ${contact.subject || "Hour Stay Inquiry"}`);
      setReplyBody(
`Dear ${contact.name},

Thank you for reaching out to Hour Stay Speshway Luxury Hotel.

To help us assist you better with your inquiry, could you please provide a few additional details regarding your request?

You can reply directly to this email at your convenience.

Warm regards,
Super Admin Support
Hour Stay Speshway Luxury Hotel`
      );
    }
    toast.success(`Applied "${type.replace('_', ' ')}" template.`);
  };

  const handleOpenGmail = () => {
    if (!contact?.email) return;
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contact.email)}&su=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    navigator.clipboard?.writeText?.(contact.email);
    toast.success("Opened Gmail in new tab! Recipient email copied to clipboard.");
  };

  const handleOpenDefaultMail = () => {
    if (!contact?.email) return;
    navigator.clipboard?.writeText?.(contact.email);
    window.location.href = `mailto:${encodeURIComponent(contact.email)}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(replyBody)}`;
    toast.info("Triggered default mail app. Recipient email copied to clipboard.");
  };

  const handleCopyEmail = () => {
    if (!contact?.email) return;
    navigator.clipboard?.writeText?.(contact.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
    toast.success(`Copied "${contact.email}" to clipboard!`);
  };

  const handleCopyBody = () => {
    navigator.clipboard?.writeText?.(replyBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
    toast.success("Draft message text copied to clipboard!");
  };

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!contact) return;
    const validation = validateWithZod(replyContactSchema, { replySubject, replyBody, targetStatus });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || "Please check your reply subject and message content.");
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      let success = false;
      try {
        const res = await superAdminService.replyContactRequest(contact._id || contact.id, {
          replyMessage: replyBody,
          status: targetStatus
        });
        if (res && res.success) success = true;
      } catch {
        const updateRes = await superAdminService.updateContactRequestStatus(contact._id || contact.id, targetStatus);
        if (updateRes && updateRes.success) success = true;
      }

      if (success) {
        toast.success(`Reply recorded! Inquiry status set to "${targetStatus}".`);
        navigate({ to: `/super-admin/contacts/view/${contact._id || contact.id}` });
      } else {
        toast.error("Failed to record reply.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to process reply.");
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={contact ? `Reply to Inquiry — ${contact.name}` : "Reply via Email"}
          subtitle="Compose and record official email responses with automated status tracking."
        />
        {contact && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: `/super-admin/contacts/view/${contact._id || contact.id}` })}
            className="rounded-full text-xs font-semibold cursor-pointer border-navy/20 hover:bg-cream/40"
          >
            <Eye className="size-3.5 mr-1.5" />
            View Inquiry Details
          </Button>
        )}
      </div>

      {error && (
        <Notice tone="error" title="Inquiry Notice">
          <div className="space-y-2">
            <p>{error}</p>
            <Button
              size="sm"
              onClick={() => navigate({ to: "/super-admin/contacts" })}
              className="rounded-full bg-navy text-white text-xs cursor-pointer"
            >
              Back to Contact Inquiries
            </Button>
          </div>
        </Notice>
      )}

      {loading ? (
        <LoadingRows count={5} />
      ) : contact ? (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Original Inquiry & Client Context (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Panel title="Client Profile" description="Verified sender credentials">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 p-3.5 border border-navy/10 rounded-xl bg-cream/30">
                  <div className="size-11 rounded-full bg-purple/10 text-purple flex items-center justify-center font-extrabold text-base shrink-0">
                    {contact.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-navy text-sm truncate">{contact.name}</h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">Inquiry Submitter</span>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground pt-1">
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
              </div>
            </Panel>

            {/* Original Inquiry Message */}
            <Panel title="Original Inquiry" description="Full submitted query from customer">
              <div className="p-5 bg-white rounded-b-xl space-y-3 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple block mb-0.5">Subject</span>
                  <h4 className="font-bold text-navy text-sm">{contact.subject || "General Inquiry"}</h4>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Message</span>
                  <div className="p-3.5 rounded-xl bg-cream/40 border border-navy/10 text-xs text-navy leading-relaxed whitespace-pre-wrap font-sans max-h-56 overflow-y-auto">
                    {contact.message}
                  </div>
                </div>
              </div>
            </Panel>

            {/* Previous Admin Reply if any */}
            {(contact.replyMessage || contact.status === "Replied") && (
              <Panel title="Previous Admin Reply" description="Last logged correspondence">
                <div className="p-5 bg-white rounded-b-xl space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="font-semibold text-purple flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-purple" />
                      Sent Log
                    </span>
                    <span>{contact.repliedAt ? new Date(contact.repliedAt).toLocaleString("en-IN") : "Recorded"}</span>
                  </div>
                  {contact.replyMessage && (
                    <div className="p-3.5 rounded-xl bg-purple/5 border border-purple/15 text-xs text-navy leading-relaxed whitespace-pre-wrap font-sans">
                      {contact.replyMessage}
                    </div>
                  )}
                </div>
              </Panel>
            )}
          </div>

          {/* Right Column: Full Email Composer Form (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <Panel title="Email Composer" description="Draft and send official communication">
              <form onSubmit={handleSendReply} className="p-6 bg-white rounded-b-xl space-y-5 text-xs font-sans">
                {/* Template Chips */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-purple" />
                      Choose Response Template
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyBody}
                      className="text-xs font-semibold text-purple hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedBody ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      {copiedBody ? "Copied drafted text" : "Copy drafted text"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyTemplate("standard")}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cream/60 border border-navy/15 hover:border-purple text-navy hover:bg-purple/5 transition-all cursor-pointer"
                    >
                      📝 Standard Greeting
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate("booking")}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cream/60 border border-navy/15 hover:border-purple text-navy hover:bg-purple/5 transition-all cursor-pointer"
                    >
                      🏨 Booking & Rates
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate("resolved")}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cream/60 border border-navy/15 hover:border-purple text-navy hover:bg-purple/5 transition-all cursor-pointer"
                    >
                      ✅ Issue Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTemplate("more_info")}
                      className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cream/60 border border-navy/15 hover:border-purple text-navy hover:bg-purple/5 transition-all cursor-pointer"
                    >
                      ❓ Request Details
                    </button>
                  </div>
                </div>

                {/* Recipient & Subject Row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-navy block mb-1">To (Recipient)</label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-navy/15 bg-cream/20 text-navy font-semibold">
                      <Mail className="size-3.5 text-purple shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-navy block mb-1">
                      Post-Reply Status <span className="text-purple font-normal">(Workflow)</span>
                    </label>
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-navy/15 bg-white text-navy font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-purple/30 cursor-pointer"
                    >
                      <option value="Resolved">Resolved (Close Inquiry)</option>
                      <option value="Replied">Replied (Awaiting Follow-up)</option>
                      <option value="In Progress">In Progress (Active Work)</option>
                    </select>
                  </div>
                </div>

                {/* Email Subject */}
                <div>
                  <label className="text-xs font-bold text-navy block mb-1">Email Subject</label>
                  <input
                    type="text"
                    required
                    value={replySubject}
                    onChange={(e) => {
                      setReplySubject(e.target.value);
                      if (fieldErrors.replySubject) setFieldErrors({ ...fieldErrors, replySubject: undefined });
                    }}
                    className={`w-full px-4 py-2.5 rounded-xl border ${fieldErrors.replySubject ? "border-rose-500" : "border-navy/15"} bg-white text-navy text-xs font-sans focus:outline-none focus:ring-2 focus:ring-purple/30`}
                    placeholder="Enter email subject line"
                  />
                  {fieldErrors.replySubject && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.replySubject}</p>
                  )}
                </div>

                {/* Response Message Body */}
                <div>
                  <label className="text-xs font-bold text-navy block mb-1">Reply Message Content</label>
                  <textarea
                    rows={12}
                    required
                    value={replyBody}
                    onChange={(e) => {
                      setReplyBody(e.target.value);
                      if (fieldErrors.replyBody) setFieldErrors({ ...fieldErrors, replyBody: undefined });
                    }}
                    className={`w-full p-4 rounded-xl border ${fieldErrors.replyBody ? "border-rose-500" : "border-navy/15"} bg-white text-navy text-xs font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple/30 resize-y`}
                    placeholder="Type official reply message..."
                  />
                  {fieldErrors.replyBody && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.replyBody}</p>
                  )}
                </div>

                {/* Quick External Email Dispatch Options */}
                <div className="p-4 rounded-xl bg-cream/40 border border-navy/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-navy block text-xs">Direct Web & App Mail Launchers:</span>
                    <span className="text-[11px] text-muted-foreground">Open pre-filled in your preferred client</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenGmail}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold hover:bg-rose-100 transition-colors cursor-pointer text-xs"
                      title="Open in Gmail Web composer with subject & body"
                    >
                      <ExternalLink className="size-3.5" />
                      Open in Gmail
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenDefaultMail}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-navy/15 text-navy font-semibold hover:bg-cream transition-colors cursor-pointer text-xs"
                      title="Open default system mail client"
                    >
                      <Mail className="size-3.5" />
                      Mail Client
                    </button>
                  </div>
                </div>

                {/* Form Footer Action Buttons */}
                <div className="pt-2 border-t border-navy/10 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: `/super-admin/contacts/view/${contact._id || contact.id}` })}
                    className="rounded-full text-xs font-semibold cursor-pointer border-navy/20 hover:bg-cream"
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-purple hover:bg-purple/90 text-white text-xs font-bold cursor-pointer shadow-sm hover:shadow transition-all px-5"
                    >
                      <Send className="size-3.5 mr-1.5" />
                      {submitting ? "Saving Reply..." : `Send & Mark ${targetStatus}`}
                    </Button>
                  </div>
                </div>
              </form>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ReplyContactRequest;
