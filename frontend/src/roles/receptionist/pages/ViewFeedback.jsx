import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { PageHeader, Tag, Notice, LoadingRows, Panel, Crumbs, ActionGroup } from "@/components/hs/kit";
import { receptionistService } from "@/services/receptionist";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare,
  Calendar,
  User,
  Star,
  Sparkles,
  MessageSquareText,
  Activity,
  Bed,
  CheckCircle2,
  Send,
  ArrowLeft,
  Smile,
  Meh,
  Frown
} from "lucide-react";

export const Route = createFileRoute("/reception/feedback/$id")({
  head: () => ({
    meta: [
      { title: "Guest Feedback Dossier — Front Desk" },
      { name: "description", content: "Review guest stay feedback, ratings, and front desk acknowledgment." }
    ]
  }),
  component: ReceptionistViewFeedback
});

function StarRating({ rating }) {
  const num = Number(rating) || 5;
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < num ? "fill-amber-400 text-amber-500" : "text-slate-200"}`}
        />
      ))}
    </div>
  );
}

function SentimentBadge({ sentiment, rating }) {
  const num = Number(rating) || 5;
  const s = sentiment || (num >= 4 ? "positive" : num === 3 ? "neutral" : "negative");
  
  if (s === "positive") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Smile className="size-3" /> Positive Experience
      </span>
    );
  }
  if (s === "neutral") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
        <Meh className="size-3" /> Neutral Feedback
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
      <Frown className="size-3" /> Needs Attention
    </span>
  );
}

function ReceptionistViewFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Response Editor State
  const [responseText, setResponseText] = useState("");
  const [responseStatus, setResponseStatus] = useState("Resolved");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || (user.role !== "receptionist" && user.role !== "admin" && user.role !== "manager")) {
      setIsAuthorized(false);
      setLoading(false);
      return;
    }

    const loadFeedbackDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        let decodedId = id;
        try {
          decodedId = atob(id);
        } catch (e) {
          decodedId = id;
        }
        const feedbackRes = await receptionistService.getFeedback();
        if (feedbackRes && feedbackRes.data) {
          const list = Array.isArray(feedbackRes.data) ? feedbackRes.data : [];
          const matched = list.find(f => 
            String(f._id) === String(decodedId) || 
            String(f.id) === String(decodedId) || 
            String(f._id) === String(id) || 
            String(f.id) === String(id) ||
            String(f.bookingId) === String(id)
          );
          if (matched) {
            setFeedback(matched);
            setResponseText(matched.response || "");
            setResponseStatus(matched.status || "Resolved");
          } else {
            setError("Feedback review record not found.");
          }
        } else {
          setError("Failed to query feedback database.");
        }
      } catch (err) {
        setError(err.message || "Failed to load guest feedback details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadFeedbackDetails();
  }, [id]);

  const handleResponseSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!feedback) return;
    const fid = feedback._id || feedback.id;
    setIsSubmitting(true);
    try {
      const res = await receptionistService.respondFeedback(fid, responseText, responseStatus);
      if (res && res.success !== false) {
        toast.success("Front desk acknowledgment saved successfully.");
        // Reload details
        const feedbackRes = await receptionistService.getFeedback();
        if (feedbackRes && feedbackRes.data) {
          const list = Array.isArray(feedbackRes.data) ? feedbackRes.data : [];
          const matched = list.find(f => String(f._id) === String(fid) || String(f.id) === String(fid));
          if (matched) {
            setFeedback(matched);
            setResponseText(matched.response || "");
            setResponseStatus(matched.status || "Resolved");
          }
        }
      } else {
        toast.error(res?.message || "Failed to save response.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to save feedback response.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view feedback for this property.
        </Notice>
      </div>
    );
  }

  const guestName = feedback?.guestName || feedback?.guest || "Guest";
  const rating = Number(feedback?.rating) || 5;
  const commentText = feedback?.comment || feedback?.comments || "";

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans font-ui text-navy">
      <Crumbs
        items={[
          { label: "Front Desk", to: "/reception" },
          { label: "Feedback", to: "/reception/feedback" },
          { label: feedback ? `${guestName}'s Review` : "Feedback Details" }
        ]}
      />

      {error && <Notice tone="error" title="Feedback Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : feedback ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Guest & Review Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stay details info */}
            <div className="bg-white border border-muted rounded-2xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <User className="size-5 text-purple" />
                  <h4 className="font-semibold text-navy text-sm">Guest & Stay Information</h4>
                </div>
                <SentimentBadge sentiment={feedback.sentiment} rating={rating} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Guest Name</span>
                  <strong className="text-navy-deep text-sm block mt-0.5">{guestName}</strong>
                  {(feedback.guestPhone || feedback.guestEmail) && (
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      {feedback.guestPhone || feedback.guestEmail}
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Booking Reference ID</span>
                  <span className="font-mono font-bold text-purple block mt-0.5">#{feedback.bookingId || "BK-N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Room Details</span>
                  <strong className="text-navy block mt-0.5 text-sm">Room {feedback.room || "101"} · {feedback.roomType || "Standard Room"}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Category / Source</span>
                  <span className="font-semibold text-navy block mt-0.5">{feedback.category || "Front Desk Checkout"}</span>
                </div>
              </div>
            </div>

            {/* Guest Remarks */}
            <div className="bg-white border border-muted rounded-2xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="size-4.5 text-purple" />
                  <h4 className="font-semibold text-navy text-sm">Guest Remarks & Comments</h4>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={rating} />
                  <span className="font-bold text-sm text-navy">{rating}.0 / 5</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-purple/[0.03] border border-purple/15 text-xs text-navy leading-relaxed italic">
                "{commentText || "No detailed written feedback provided."}"
              </div>

              {feedback.ratings && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-muted/20 border border-muted rounded-xl text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cleanliness</span>
                    <div className="font-bold text-navy-deep text-sm mt-0.5">{feedback.ratings.cleanliness || 5}/5</div>
                  </div>
                  <div className="p-3 bg-muted/20 border border-muted rounded-xl text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Staff Service</span>
                    <div className="font-bold text-navy-deep text-sm mt-0.5">{feedback.ratings.service || 5}/5</div>
                  </div>
                  <div className="p-3 bg-muted/20 border border-muted rounded-xl text-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Comfort</span>
                    <div className="font-bold text-navy-deep text-sm mt-0.5">{feedback.ratings.room || 5}/5</div>
                  </div>
                </div>
              )}
            </div>

            {/* Front Desk Response / Acknowledgment */}
            <div className="bg-white border border-muted rounded-2xl p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-4.5 text-purple" />
                  <h4 className="font-semibold text-navy text-sm">Front Desk Acknowledgment</h4>
                </div>
                <Tag tone={feedback.response ? "success" : "brand"}>
                  {feedback.status || (feedback.response ? "Resolved" : "Pending Response")}
                </Tag>
              </div>

              <form onSubmit={handleResponseSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-navy block">Response / Operational Follow-up Notes</label>
                  <textarea
                    rows={4}
                    placeholder="Type official acknowledgment or front desk response to this review..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="w-full p-3.5 text-xs rounded-xl bg-[#fcfcfc] border border-muted text-navy focus:outline-none focus:border-purple font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-navy block">Resolution Status</label>
                    <select
                      value={responseStatus}
                      onChange={(e) => setResponseStatus(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-xl bg-[#fcfcfc] border border-muted text-navy focus:outline-none focus:border-purple cursor-pointer"
                    >
                      <option value="Resolved">Resolved</option>
                      <option value="Published">Published</option>
                      <option value="Action Required">Action Required</option>
                      <option value="Pending">Pending Review</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 sm:pt-5">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-navy hover:bg-navy-deep text-white h-9 px-5 text-xs font-bold gap-1.5 cursor-pointer shadow-soft rounded-xl"
                    >
                      <Send className="size-3.5" />
                      {isSubmitting ? "Saving..." : "Save Acknowledgment"}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

          </div>

          {/* Right Column Summary */}
          <div className="space-y-6">
            <Panel title="Review Summary" description="Overview of guest rating attributes.">
              <div className="p-4 space-y-4 text-xs font-semibold text-navy">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Overall Score:</span>
                    <span className="font-bold text-amber-500 flex items-center gap-1">
                      <Star className="size-3.5 fill-amber-400" /> {rating}.0 / 5
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Room Number:</span>
                    <span className="font-mono font-bold">#{feedback.room || "101"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="text-muted-foreground">
                      {feedback.createdAt ? new Date(feedback.createdAt).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                  {feedback.respondedAt && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Responded:</span>
                      <span className="text-emerald-700 font-semibold">
                        {new Date(feedback.respondedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-muted">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/reception/feedback")}
                    className="w-full text-xs font-bold gap-1.5 h-9 rounded-xl cursor-pointer"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to Feedback List
                  </Button>
                </div>
              </div>
            </Panel>
          </div>

        </div>
      ) : null}
    </div>
  );
}

export default ReceptionistViewFeedback;
