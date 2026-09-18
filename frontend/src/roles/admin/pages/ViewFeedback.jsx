import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "@/components/ui/breadcrumb";
import { adminService } from "@/services/admin";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare,
  Search,
  Eye,
  ChevronLeft,
  Star,
  MessageSquareText,
  Calendar,
  Send,
  Trash2,
  Sparkles,
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  Hotel,
  Bed,
  Mail,
  Phone,
  Clock,
  Archive,
  RefreshCw,
  User,
  ShieldCheck,
  Building,
  Check,
  AlertCircle
} from "lucide-react";

export const Route = createFileRoute("/admin/feedback/view/$id")({
  head: () => ({
    meta: [
      { title: "Guest Feedback Review — Admin Console" },
      { name: "description", content: "Review detailed guest feedback, ratings, and compose official management responses." }
    ]
  }),
  component: AdminViewFeedbackPage
});

function StarRating({ rating = 5 }) {
  const r = Math.round(Number(rating) || 5);
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < r ? "fill-amber-400 text-amber-500" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment, rating = 5 }) {
  const norm = sentiment || (rating >= 4 ? "Positive" : rating === 3 ? "Neutral" : "Negative");
  if (norm === "Positive") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <Smile className="size-3.5 text-emerald-600" /> Positive Sentiment
      </span>
    );
  }
  if (norm === "Negative") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
        <Frown className="size-3.5 text-rose-600" /> Negative Sentiment
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
      <Meh className="size-3.5 text-amber-600" /> Neutral Sentiment
    </span>
  );
}

function StatusBadge({ status = "Published" }) {
  const s = status.toLowerCase();
  if (s === "published" || s === "responded" || s === "resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="size-3.5 text-emerald-600" /> {status}
      </span>
    );
  }
  if (s === "pending" || s === "pending response") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="size-3.5 text-amber-600" /> Pending Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
      <Archive className="size-3.5 text-slate-500" /> {status}
    </span>
  );
}

export function AdminViewFeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Response Form State
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState("Resolved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadFeedbackDetail = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      setError(null);

      const res = await adminService.getFeedbackById(id);
      const data = res?.data || res;
      if (data) {
        setFeedback(data);
        if (data.response) {
          setResponseText(data.response);
        }
        if (data.status) {
          setResponseStatus(data.status);
        }
      } else {
        setError("Guest feedback record not found.");
      }
    } catch (err) {
      setError(err.message || "Failed to load guest feedback details.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    loadFeedbackDetail();
  }, [id]);

  // Handle Response Submit
  const handleSendResponse = async (e) => {
    if (e) e.preventDefault();
    if (!responseText.trim()) {
      toast.error("Please enter a response message before submitting.");
      return;
    }
    const fid = feedback?._id || feedback?.id || id;
    setIsSubmitting(true);
    try {
      await adminService.respondFeedback(fid, responseText.trim(), responseStatus);
      toast.success("Management response published successfully.");
      await loadFeedbackDetail(true);
    } catch (err) {
      toast.error(err.message || "Failed to post response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Status Switcher
  const handleStatusChange = async (newStatus) => {
    const fid = feedback?._id || feedback?.id || id;
    try {
      setUpdatingStatus(true);
      await adminService.updateFeedbackStatus(fid, newStatus);
      toast.success(`Feedback status updated to ${newStatus}`);
      setFeedback(prev => (prev ? { ...prev, status: newStatus } : prev));
      setResponseStatus(newStatus);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };


  // Quick Template Injector
  const handleApplyTemplate = (type) => {
    if (type === "thank_you") {
      setResponseText("Thank you so much for your wonderful review! We are delighted that you enjoyed your stay with us at Hour Stay and look forward to welcoming you back soon.");
      setResponseStatus("Published");
    } else if (type === "apology") {
      setResponseText("Thank you for sharing your candid feedback. We sincerely apologize for the inconvenience experienced during your stay. We have shared your comments with our operations team to implement immediate improvements.");
      setResponseStatus("Resolved");
    } else if (type === "resolved") {
      setResponseText("Thank you for your valuable feedback. We are pleased to confirm that the concern has been addressed by our management team. We hope to host you again for a flawless experience.");
      setResponseStatus("Resolved");
    }
  };

  const guestName = feedback?.guestName || feedback?.guest || "Guest";
  const overallRating = Number(feedback?.rating) || 5;
  const ratingCleanliness = feedback?.ratings?.cleanliness || feedback?.rating || 5;
  const ratingService = feedback?.ratings?.service || feedback?.rating || 5;
  const ratingRoom = feedback?.ratings?.room || feedback?.rating || 5;
  const ratingFood = feedback?.ratings?.food || feedback?.rating || 5;
  const commentText = feedback?.comment || feedback?.comments || "No textual remark provided.";

  return (
    <div className="space-y-6 text-left animate-fade-in font-ui max-w-7xl mx-auto pb-10">
      
      {/* Breadcrumb Navigation Bar */}
      <div className="flex items-center justify-between border-b border-navy/10 pb-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin" className="text-xs text-navy/60 hover:text-navy transition-colors font-medium">
                  Admin
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin/feedback" className="text-xs text-navy/60 hover:text-navy transition-colors font-medium">
                  Feedback
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-bold text-navy">
                View Feedback
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <div className="bg-white border border-navy/10 rounded-2xl p-8 shadow-soft">
          <LoadingRows rows={6} />
        </div>
      ) : feedback ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Guest Context, Ratings & Remarks */}
          <div className="lg:col-span-2 space-y-6">

            {/* Guest & Stay Information Dossier */}
            <div className="bg-white border border-navy/10 rounded-2xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-navy/5">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-xl bg-purple/10 text-purple font-bold flex items-center justify-center text-sm">
                    {guestName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-navy text-sm font-sans">Guest & Stay Information</h3>
                    <p className="text-[11px] text-navy/60">Verified reservation stay details</p>
                  </div>
                </div>
                <StatusBadge status={feedback.status || (feedback.response ? "Resolved" : "Published")} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-cream/20 rounded-xl border border-navy/5">
                  <span className="text-[10px] font-bold text-navy/50 uppercase block">Guest Name</span>
                  <strong className="text-navy font-bold text-sm block mt-0.5">{guestName}</strong>
                </div>

                <div className="p-3 bg-cream/20 rounded-xl border border-navy/5">
                  <span className="text-[10px] font-bold text-navy/50 uppercase block">Booking ID</span>
                  <strong className="font-mono text-purple font-bold text-sm block mt-0.5">
                    #{feedback.bookingId || "BK-N/A"}
                  </strong>
                </div>

                <div className="p-3 bg-cream/20 rounded-xl border border-navy/5">
                  <span className="text-[10px] font-bold text-navy/50 uppercase block">Assigned Room</span>
                  <strong className="text-navy font-bold text-sm block mt-0.5">
                    {feedback.room || feedback.roomType || "Standard Room"}
                  </strong>
                </div>

                <div className="p-3 bg-cream/20 rounded-xl border border-navy/5">
                  <span className="text-[10px] font-bold text-navy/50 uppercase block">Property</span>
                  <strong className="text-navy font-bold text-sm block mt-0.5">
                    {feedback.propertyId || "HS-JAI"}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div className="flex items-center gap-2 text-navy/70">
                  <Mail className="size-4 text-navy/40 shrink-0" />
                  <span>{feedback.guestEmail || "No guest email provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-navy/70">
                  <Calendar className="size-4 text-navy/40 shrink-0" />
                  <span>
                    Submitted on: {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent Stay"}
                  </span>
                </div>
              </div>
            </div>

            {/* Scores & Ratings Matrix */}
            <div className="bg-white border border-navy/10 rounded-2xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-navy/5">
                <div>
                  <h3 className="font-bold text-navy text-sm font-sans">Rating & Category Scores</h3>
                  <p className="text-[11px] text-navy/60">Comprehensive guest satisfaction evaluation</p>
                </div>
                <SentimentBadge sentiment={feedback.sentiment} rating={overallRating} />
              </div>

              {/* Overall Score Highlight */}
              <div className="flex items-center justify-between bg-purple/5 border border-purple/15 rounded-xl p-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple">Overall Experience</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold font-sans text-navy">{overallRating}.0</span>
                    <span className="text-xs text-navy/50">/ 5.0</span>
                    <div className="ml-2">
                      <StarRating rating={overallRating} />
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-navy">Category</span>
                  <p className="text-xs text-navy/60">{feedback.category || "General Stay Review"}</p>
                </div>
              </div>

              {/* Breakdown Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Cleanliness", val: ratingCleanliness, icon: Sparkles },
                  { label: "Staff Service", val: ratingService, icon: User },
                  { label: "Room Comfort", val: ratingRoom, icon: Bed },
                  { label: "Food & Dining", val: ratingFood, icon: Hotel }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-white border border-navy/10 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-navy/60 uppercase">{item.label}</span>
                      <item.icon className="size-3.5 text-navy/40" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-navy">{item.val}/5</span>
                      <div className="scale-90 origin-right">
                        <StarRating rating={item.val} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Remarks Card */}
            <div className="bg-white border border-navy/10 rounded-2xl p-6 shadow-soft space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-navy/5">
                <MessageSquare className="size-4 text-purple" />
                <h3 className="font-bold text-navy text-sm font-sans">Guest Remarks & Testimonial</h3>
              </div>
              <div className="p-5 rounded-xl bg-cream/20 border border-navy/5 text-sm text-navy leading-relaxed italic">
                "{commentText}"
              </div>
            </div>

            {/* Publication Status Actions */}
            <div className="bg-white border border-navy/10 rounded-2xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-navy text-sm font-sans">Publication Status</h3>
                  <p className="text-[11px] text-navy/60">Control visibility and workflow stage</p>
                </div>
                {updatingStatus && <span className="text-xs text-purple font-bold animate-pulse">Updating...</span>}
              </div>

              <div className="flex flex-wrap gap-2.5">
                {["Published", "Pending", "Resolved", "Archived"].map((st) => {
                  const isActive = (feedback.status || (feedback.response ? "Resolved" : "Published")).toLowerCase() === st.toLowerCase();
                  return (
                    <button
                      key={st}
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(st)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isActive
                          ? "bg-navy text-cream border-navy shadow-soft"
                          : "bg-white text-navy/70 border-navy/10 hover:bg-cream/40"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Administrative Response Portal */}
          <div className="space-y-6">

            <div className="bg-white border border-navy/10 rounded-2xl p-6 shadow-soft space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-navy/5">
                <MessageSquareText className="size-5 text-purple" />
                <div>
                  <h3 className="font-bold text-navy text-sm font-sans">Official Management Response</h3>
                  <p className="text-[11px] text-navy/60">Craft and publish your property reply</p>
                </div>
              </div>

              {/* Quick Template Selector */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-navy/50">Quick Reply Templates</span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate("thank_you")}
                    className="h-7 px-2.5 text-[11px] font-bold text-purple border-purple/20 hover:bg-purple/10 cursor-pointer"
                  >
                    Thank You
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate("apology")}
                    className="h-7 px-2.5 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 cursor-pointer"
                  >
                    Apology
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplyTemplate("resolved")}
                    className="h-7 px-2.5 text-[11px] font-bold text-emerald-600 border-emerald-200 hover:bg-emerald-50 cursor-pointer"
                  >
                    Issue Resolved
                  </Button>
                </div>
              </div>

              {/* Text Area Form */}
              <form onSubmit={handleSendResponse} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy">
                    Response Content
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Type your official administrative response here. The guest will be notified..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full p-3.5 text-xs rounded-xl bg-cream/10 border border-navy/15 text-navy focus:outline-none focus:border-purple focus:ring-1 focus:ring-purple font-medium resize-y"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy">
                    Status after saving
                  </label>
                  <select
                    value={responseStatus}
                    onChange={(e) => setResponseStatus(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl bg-cream/10 border border-navy/15 text-navy font-semibold focus:outline-none focus:border-purple"
                  >
                    <option value="Resolved">Resolved</option>
                    <option value="Published">Published</option>
                    <option value="Pending">Pending</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  disabled={isSubmitting || !responseText.trim()}
                  className="w-full h-10 text-xs font-bold gap-2 cursor-pointer shadow-soft"
                >
                  <Send className="size-4" />
                  {isSubmitting ? "Publishing..." : "Save & Publish Response"}
                </Button>
              </form>

              {/* Response Meta / History */}
              {feedback.response && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Response Active</span>
                  </div>
                  <p className="text-slate-700 italic text-xs leading-relaxed">
                    "{feedback.response}"
                  </p>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200/40 flex justify-between">
                    <span>By: {feedback.respondedBy || "Administrator"}</span>
                    <span>
                      {feedback.respondedAt ? new Date(feedback.respondedAt).toLocaleString() : "Recently"}
                    </span>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      ) : null}

    </div>
  );
}

export default AdminViewFeedbackPage;
