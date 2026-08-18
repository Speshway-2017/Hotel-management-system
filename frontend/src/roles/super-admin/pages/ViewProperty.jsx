import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, statusTone, Notice, LoadingRows, Crumbs } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import { Building2, Bed, TrendingUp, Users, ArrowLeft } from "lucide-react";

function ViewProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [users, setUsers] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("details");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [propRes, usersRes, reservationsRes] = await Promise.all([
          superAdminService.getProperty(id),
          superAdminService.getUsers(),
          superAdminService.getReservations()
        ]);
        if (propRes.success) setProperty(propRes.data);
        if (usersRes.success) setUsers(usersRes.data);
        if (reservationsRes.success) setReservations(reservationsRes.data);
      } catch (err) {
        setError(err.message || "Failed to load property operational data");
      } finally {
        setLoading(false);
      }
    };
    if (id) loadData();
  }, [id]);

  const assignedUsers = property
    ? users.filter(u => u.propertyId === property._id || u.propertyId === property.id)
    : [];

  const propertyReservations = property
    ? reservations.filter(r => r.propertyId === property._id || r.propertyId === property.id)
    : [];

  const totalRevenue = propertyReservations.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="space-y-6">

      <PageHeader
        title={property ? property.name : "Property Overview"}
        subtitle="Audit layouts, staff configurations, and yield performance metrics."
      />

      {error && <Notice tone="error" title="Data Synchronization Failure" className="text-left">{error}</Notice>}

      {loading ? (
        <LoadingRows rows={5} />
      ) : property ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start font-sans">
          
          {/* Main Info Tabs Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Panel className="bg-white">
              {/* Tab headers */}
              <div className="flex gap-1 border-b border-muted bg-muted/10 p-2.5 overflow-x-auto scrollbar-none">
                {[
                  { label: "Overview Details", key: "details", icon: Building2 },
                  { label: "Room Inventory", key: "inventory", icon: Bed },
                  { label: "Yield Performance", key: "performance", icon: TrendingUp },
                  { label: "Assigned Operators", key: "users", icon: Users }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "flex items-center gap-2 pb-2 pt-1.5 px-4 rounded-full font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer",
                      activeTab === tab.key 
                        ? "bg-purple/10 text-purple border border-purple/10 shadow-sm" 
                        : "text-muted-foreground hover:text-navy hover:bg-muted/30"
                    )}
                  >
                    <tab.icon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {activeTab === "details" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs text-left">
                    <div className="space-y-1">
                      <strong className="text-navy font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Hotel Name</strong>
                      <p className="text-sm font-semibold text-navy">{property.name}</p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-navy font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Property Category</strong>
                      <p className="text-sm font-semibold text-navy">{property.propertyType || "Boutique Resort"}</p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-navy font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Location City</strong>
                      <p className="text-sm font-semibold text-navy">{property.city}</p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-navy font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Assigned Admin / Owner</strong>
                      <p className="text-sm font-semibold text-navy">{property.assignedAdmin?.name || property.gm || "Unassigned"}</p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-navy font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Registered Date</strong>
                      <p className="text-sm font-semibold text-navy">
                        {property.createdAt ? new Date(property.createdAt).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' }) : "05 Aug 2026"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <strong className="text-navy font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Licensing Plan</strong>
                      <p className="mt-0.5"><Tag tone="brand">{property.subscriptionTier || "Basic SaaS"}</Tag></p>
                    </div>
                  </div>
                )}

                {activeTab === "inventory" && (
                  <div className="space-y-4">
                    <Notice tone="info" title="Room Inventory Mappings">
                      Capacities and allotments mapped across the active PMS grid.
                    </Notice>
                    <div className="border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            <th className="p-3.5">Room Category</th>
                            <th className="p-3.5">Keys Allotted</th>
                            <th className="p-3.5 text-right">Base Tariff</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y font-sans">
                          <tr className="hover:bg-muted/5">
                            <td className="p-3.5 font-semibold text-navy">Deluxe Courtyard Room</td>
                            <td className="p-3.5">{Math.round(property.rooms * 0.4)} Keys</td>
                            <td className="p-3.5 text-right font-semibold text-navy">₹8,900</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3.5 font-semibold text-navy">Premier Haveli Room</td>
                            <td className="p-3.5">{Math.round(property.rooms * 0.35)} Keys</td>
                            <td className="p-3.5 text-right font-semibold text-navy">₹12,400</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3.5 font-semibold text-navy">Maharaja Suite</td>
                            <td className="p-3.5">{Math.round(property.rooms * 0.15)} Keys</td>
                            <td className="p-3.5 text-right font-semibold text-navy">₹24,500</td>
                          </tr>
                          <tr className="hover:bg-muted/5">
                            <td className="p-3.5 font-semibold text-navy">Garden Pool Villa</td>
                            <td className="p-3.5">{Math.round(property.rooms * 0.1)} Keys</td>
                            <td className="p-3.5 text-right font-semibold text-navy">₹38,900</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "performance" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-left">
                      <div className="border border-muted rounded-xl p-4 bg-muted/10">
                        <strong className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Occupancy Rate</strong>
                        <p className="text-2xl font-bold text-navy mt-1.5">{property.occupancy}%</p>
                      </div>
                      <div className="border border-muted rounded-xl p-4 bg-muted/10">
                        <strong className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Average ADR</strong>
                        <p className="text-2xl font-bold text-navy mt-1.5">₹{(property.adr || 0).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="border border-muted rounded-xl p-4 bg-muted/10">
                        <strong className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Yield RevPAR</strong>
                        <p className="text-2xl font-bold text-navy mt-1.5">₹{(property.revpar || 0).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="border border-muted rounded-xl p-4 bg-muted/10">
                        <strong className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Capacity</strong>
                        <p className="text-2xl font-bold text-navy mt-1.5">{property.rooms} Keys</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "users" && (
                  <div className="space-y-4 text-left">
                    <Notice tone="info" title="Staff & Operators Assignment Mapped">
                      Operators with active dashboard permissions registered under this node.
                    </Notice>
                    {assignedUsers.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-xs">No staff operators mapped to this property.</div>
                    ) : (
                      <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/30 border-b text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              <th className="p-3.5">Operator Name</th>
                              <th className="p-3.5">Email</th>
                              <th className="p-3.5">Role Type</th>
                              <th className="p-3.5 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y font-sans">
                            {assignedUsers.map((u) => (
                              <tr key={u.id || u._id} className="hover:bg-muted/5">
                                <td className="p-3.5 font-semibold text-navy">{u.name}</td>
                                <td className="p-3.5 text-muted-foreground">{u.email}</td>
                                <td className="p-3.5"><Tag tone="info">{u.role}</Tag></td>
                                <td className="p-3.5 text-right"><Tag tone={u.status === "Active" ? "success" : "warning"}>{u.status}</Tag></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Panel>
          </div>

          {/* Side Info Cards */}
          <div className="space-y-6">
            <Panel title="Property Operational Status" description="Core system configuration state.">
              <div className="p-5 space-y-4 text-left text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-muted">
                  <span className="font-semibold text-muted-foreground">Node ID</span>
                  <span className="font-mono font-bold text-navy">{property._id || property.id}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-muted">
                  <span className="font-semibold text-muted-foreground">Status</span>
                  <Tag tone={statusTone(property.status)}>{property.status}</Tag>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-muted">
                  <span className="font-semibold text-muted-foreground">Total Bookings</span>
                  <span className="font-bold text-navy">{propertyReservations.length} Bookings</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="font-semibold text-muted-foreground">Total Revenue Generated</span>
                  <span className="font-extrabold text-purple text-sm">₹{totalRevenue.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </Panel>

            <Panel title="Quick Actions">
              <div className="p-5 flex flex-col gap-3">
                <Button 
                  onClick={() => navigate({ to: `/super-admin/properties/edit/${property._id || property.id}` })}
                  className="w-full bg-navy text-white rounded-full font-semibold h-10 text-xs"
                >
                  Edit Configuration
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate({ to: "/super-admin/properties" })}
                  className="w-full text-navy hover:bg-muted rounded-full font-semibold h-10 text-xs border"
                >
                  Back to Portfolio
                </Button>
              </div>
            </Panel>
          </div>

        </div>
      ) : (
        <Notice tone="error" title="Not Found">The requested property record could not be located.</Notice>
      )}
    </div>
  );
}

export const Route = createFileRoute("/super-admin/properties/view/$id")({
  head: () => ({
    meta: [
      { title: "View Property Details — Hour Stay" },
      { name: "description", content: "Review PMS node setup and operators details." }
    ]
  }),
  component: ViewProperty
});
