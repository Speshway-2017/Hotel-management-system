import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";

function ViewPlanSubscribers() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => {
    const loadPlanSubscribers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await superAdminService.getSubscriptionPlans();
        if (res.success) {
          const matched = res.data.find(p => p._id === id || p.id === id);
          if (matched) {
            setPlan(matched);
            
            // Mock properties list associated to the plan limit
            const names = ["Jaipur Rambagh Residency", "Candolim Beach Resort Goa", "Udaipur Lake Palace", "Munroe Island Retreat Kerala", "Airport Stay Delhi", "Gateway Hotel Mumbai"];
            const limit = matched.activeSubscribers || 0;
            const mockList = [];
            for (let i = 0; i < limit; i++) {
              mockList.push({
                id: `SUB-${1000 + i}`,
                propertyName: names[i % names.length],
                joinedDate: "14 Aug 2025",
                status: "Active"
              });
            }
            setSubscribers(mockList);
          } else {
            setError("Subscription Plan not found.");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load subscription plan information.");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadPlanSubscribers();
  }, [id]);

  return (
    <div className="space-y-6 text-left">
      <Crumbs
        items={[
          { label: "Super Admin", to: "/super-admin" },
          { label: "Plans & Billing", to: "/super-admin/subscription" },
          { label: "View Subscribers" }
        ]}
      />

      <PageHeader
        title={plan ? `Subscribers: ${plan.name}` : "Plan Subscribers"}
        subtitle="Operational view of hotel properties registered under this subscription level."
        actions={
          <Button
            onClick={() => navigate({ to: "/super-admin/subscription" })}
            className="bg-navy hover:bg-navy/90 text-white rounded-full px-5 h-9 font-bold text-xs cursor-pointer"
          >
            Back to Plans
          </Button>
        }
      />

      {error && <Notice tone="error" title="Synchronization Error">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={3} />
      ) : (
        <Panel title={`Active Subscribers Database (${subscribers.length})`} description="Properties associated with this plan.">
          <div className="p-5 bg-white rounded-b-xl space-y-4">
            {subscribers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs font-semibold">
                No active properties are currently subscribed to this plan.
              </div>
            ) : (
              <div className="space-y-3 font-sans max-w-xl">
                {subscribers.map((sub) => (
                  <div key={sub.id} className="flex justify-between items-center p-4 border rounded-xl bg-cream/5 hover:border-purple/35 transition-colors">
                    <div>
                      <div className="font-bold text-xs text-navy">{sub.propertyName}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                        Subscriber ID: <span className="font-mono text-purple font-bold">{sub.id}</span> · Enrolled: {sub.joinedDate}
                      </div>
                    </div>
                    <Tag tone="success">{sub.status}</Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/subscription/view/$id")({
  component: ViewPlanSubscribers
});
