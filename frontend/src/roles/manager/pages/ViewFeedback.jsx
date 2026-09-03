import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Tag, Notice, LoadingRows, Panel } from "@/components/hs/kit";
import { FormField, Textarea } from "@/components/hs/FormFields";
import { managerService } from "@/services/manager";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MessageSquare,
  Calendar,
  User,
  Star,
  ChevronLeft,
  Sparkles,
  MessageSquareText,
  Activity
} from "lucide-react";

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1 text-warning">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${i < rating ? "fill-warning text-warning" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ManagerViewFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(true);

  // Response Editor State
  const [managerResponse, setManagerResponse] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (!user || user.role !== "manager") {
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
        const feedbackRes = await managerService.getFeedback();
        if (feedbackRes.success && feedbackRes.data) {
          const list = feedbackRes.data;
          const matched = list.find(f => f._id === decodedId || f.id === decodedId || f._id === id || f.id === id);
          if (matched) {
            const overall = Math.round((matched.ratings.cleanliness + matched.ratings.service + matched.ratings.room) / 3);
            const compiled = {
              id: matched._id || matched.id,
              bookingId: matched.bookingId,
              guest: matched.guestName,
              room: matched.room || "101",
              stayDates: "stay dates",
              overall,
              cleanliness: matched.ratings.cleanliness,
              service: matched.ratings.service,
              roomRating: matched.ratings.room,
              comments: matched.comment,
              submittedDate: new Date(matched.createdAt).toISOString().split('T')[0],
              status: matched.response ? "Responded" : "Pending Response",
              response: matched.response || null
            };
            setFeedback(compiled);
            setManagerResponse(matched.response || "");
          } else {
            setError("Feedback review record not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load guest feedback details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadFeedbackDetails();
  }, [id]);

  const handleResponseSubmit = async () => {
    if (!currentUser || !feedback) return;
    setProcessing(true);
    try {
      const res = await managerService.respondFeedback(feedback.id, managerResponse);
      if (res.success) {
        toast.success("Manager response published successfully.");
        // Reload details dynamically
        const feedbackRes = await managerService.getFeedback();
        if (feedbackRes.success && feedbackRes.data) {
          const matched = feedbackRes.data.find(f => f._id === feedback.id || f.id === feedback.id);
          if (matched) {
            const overall = Math.round((matched.ratings.cleanliness + matched.ratings.service + matched.ratings.room) / 3);
            setFeedback({
              id: matched._id || matched.id,
              bookingId: matched.bookingId,
              guest: matched.guestName,
              room: matched.room || "101",
              stayDates: "stay dates",
              overall,
              cleanliness: matched.ratings.cleanliness,
              service: matched.ratings.service,
              roomRating: matched.ratings.room,
              comments: matched.comment,
              submittedDate: new Date(matched.createdAt).toISOString().split('T')[0],
              status: matched.response ? "Responded" : "Pending Response",
              response: matched.response || null
            });
            setManagerResponse(matched.response || "");
          }
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to save feedback response.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="space-y-6 text-left">
        <PageHeader title="Access Denied" subtitle="Security and privilege validation." />
        <Notice tone="error" title="Unauthorized Access">
          You are not authorized to view feedback for this property. Scoped hotel access only.
        </Notice>
        <Link to="/manager/feedback" className="inline-flex items-center gap-1.5 text-xs text-navy font-bold hover:underline">
          <ChevronLeft className="size-3.5" /> Back to Feedback Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left animate-fade-in font-sans">

      <PageHeader
        title={feedback ? `${feedback.guest}'s Review` : "Feedback Details"}
        subtitle="Detailed guest scores, cleanliness rating audits, comments feed, and replies portal."
      />

      {error && <Notice tone="error" title="CRM Sync Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={4} />
      ) : feedback ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Guest & Review Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stay details info */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div className="flex items-center gap-2">
                  <User className="size-5 text-brand" />
                  <h4 className="font-semibold text-navy text-sm font-display">Guest & Stay Information</h4>
                </div>
                <Tag tone={feedback.status === "Responded" ? "success" : "brand"}>
                  {feedback.status}
                </Tag>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-navy">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Guest Name</span>
                  <strong className="text-navy-deep text-sm block mt-0.5">{feedback.guest}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Booking Reference ID</span>
                  <span className="font-mono font-semibold block mt-0.5">#{feedback.bookingId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Assigned Room</span>
                  <strong className="text-brand block mt-0.5 text-sm">Room {feedback.room}</strong>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Stay Duration Dates</span>
                  <div className="flex items-center gap-1.5 mt-0.5 font-semibold text-muted-foreground">
                    <Calendar className="size-4 shrink-0" />
                    <span>{feedback.stayDates}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual score breakdowns */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <Activity className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm font-display">Individual Review Ratings</h4>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-muted/20 border border-muted rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Cleanliness</span>
                  <div className="font-bold text-navy-deep text-sm mt-1">{feedback.cleanliness}/5</div>
                </div>
                <div className="p-3 bg-muted/20 border border-muted rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Service</span>
                  <div className="font-bold text-navy-deep text-sm mt-1">{feedback.service}/5</div>
                </div>
                <div className="p-3 bg-muted/20 border border-muted rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Room quality</span>
                  <div className="font-bold text-navy-deep text-sm mt-1">{feedback.roomRating}/5</div>
                </div>
                <div className="p-3 bg-brand/5 border border-brand/20 rounded-xl">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand">Overall Rating</span>
                  <div className="font-bold text-brand text-sm mt-1 flex justify-center"><StarRating rating={feedback.overall} /></div>
                </div>
              </div>
            </div>

            {/* Guest comments text */}
            <div className="bg-white border border-muted rounded-xl p-6 shadow-soft space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-muted">
                <MessageSquareText className="size-4.5 text-brand" />
                <h4 className="font-semibold text-navy text-sm font-display">Guest Comments</h4>
              </div>
              <p className="italic text-navy-deep text-xs leading-relaxed bg-[#fcfcfc] border border-muted p-4 rounded-xl">
                "{feedback.comments}"
              </p>
            </div>

          </div>

          {/* Right response portal */}
          <div className="lg:col-span-1 space-y-6">
            
            {feedback.status === "Pending Response" ? (
              <Panel title="Draft Response" description="Post a professional reply to the guest stay review.">
                <div className="p-5 space-y-4 bg-white rounded-b-xl text-left">
                  <FormField label="Manager Response" required id="resp-text">
                    <Textarea
                      id="resp-text"
                      placeholder="Type your thank you note or operational recovery response here..."
                      value={managerResponse}
                      onChange={(e) => setManagerResponse(e.target.value)}
                      className="min-h-[120px] text-xs font-semibold"
                    />
                  </FormField>
                  
                  <Button
                    onClick={handleResponseSubmit}
                    disabled={processing || !managerResponse.trim()}
                    className="w-full bg-brand hover:bg-brand/90 text-navy font-bold h-9 rounded-full cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="size-4 text-navy" /> Submit & Publish Reply
                  </Button>
                </div>
              </Panel>
            ) : (
              /* Already replied view */
              <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4 text-left">
                <div className="flex items-center gap-2 pb-3 border-b border-muted">
                  <Sparkles className="size-4.5 text-success" />
                  <h4 className="font-semibold text-navy text-sm font-display">Published Response</h4>
                </div>
                
                <div className="space-y-3 text-xs text-navy">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Responded By</span>
                    <strong className="text-navy-deep block mt-0.5">{feedback.respondedBy || "Hotel Manager"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Timestamp</span>
                    <span className="font-semibold block mt-0.5 text-muted-foreground">{feedback.respondedAt || "—"}</span>
                  </div>
                  <div className="pt-2.5 border-t border-muted/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Published Message</span>
                    <p className="italic text-muted-foreground mt-1.5 leading-relaxed bg-[#fcfcfc] border border-muted p-3.5 rounded-xl">
                      "{feedback.response}"
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : null}
    </div>
  );
}

export const Route = createFileRoute("/manager/feedback/view/$id")({
  component: ManagerViewFeedback
});
