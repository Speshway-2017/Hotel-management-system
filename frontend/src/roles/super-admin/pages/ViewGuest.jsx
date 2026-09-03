import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, LoadingRows } from "@/components/hs/kit";
import { superAdminService } from "@/services/superAdmin";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, Building, Calendar, ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/super-admin/users/view/$id")({
  head: () => ({
    meta: [
      { title: "Guest Profile Details — Super Admin | Hour Stay" },
      { name: "description", content: "View verified guest profile credentials, contact information, and aggregated stay statistics." }
    ]
  }),
  component: ViewGuest
});

function ViewGuest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guest, setGuest] = useState(null);

  useEffect(() => {
    const loadGuestDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const [usersRes, bookingsRes, propertiesRes] = await Promise.all([
          superAdminService.getUsers().catch(() => ({})),
          superAdminService.getReservations().catch(() => ({})),
          superAdminService.getProperties().catch(() => ({}))
        ]);

        const usersList = usersRes.data || [];
        const bookingsList = bookingsRes.data || [];
        const propertiesList = propertiesRes.data || [];

        const getPropertyName = (propertyId) => {
          if (!propertyId || propertyId === "all") return "Central Portfolio";
          const prop = propertiesList.find((p) => p.id === propertyId || p._id === propertyId);
          return prop ? prop.name : "All Properties";
        };

        // Match user by ID
        const matchedUser = usersList.find((u) => u._id === id || u.id === id);

        if (matchedUser) {
          const userBookings = bookingsList.filter(
            (b) =>
              (b.email && matchedUser.email && b.email.toLowerCase() === matchedUser.email.toLowerCase()) ||
              (b.phone && matchedUser.mobile && b.phone.replace(/\s+/g, "") === matchedUser.mobile.replace(/\s+/g, "")) ||
              (b.guest && matchedUser.name && b.guest.toLowerCase() === matchedUser.name.toLowerCase())
          );

          setGuest({
            id: matchedUser._id || matchedUser.id,
            name: matchedUser.name || "Guest",
            email: matchedUser.email || "—",
            phone: matchedUser.mobile || "—",
            status: matchedUser.status || "Active",
            role: matchedUser.role || "guest",
            joinedAt: matchedUser.createdAt || matchedUser.joinedAt || null,
            propertyId: matchedUser.propertyId || "all",
            propertyName: getPropertyName(matchedUser.propertyId || "all"),
            totalStays: userBookings.length,
            city: matchedUser.city || (userBookings[0]?.city) || "India"
          });
          return;
        }

        setError("Guest account not found in directory.");
      } catch (err) {
        setError(err.message || "Failed to load guest profile.");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadGuestDetails();
  }, [id]);

  return (
    <div className="space-y-6 text-left font-ui">
      <div className="flex items-center justify-between">
        <PageHeader
          title={guest ? `Guest Profile: ${guest.name}` : "Guest Profile"}
          subtitle="Verified guest account details, contact coordinates, and lifetime visit metrics."
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: "/super-admin/users" })}
          className="rounded-full text-xs font-semibold cursor-pointer"
        >
          <ArrowLeft className="size-3.5 mr-1.5" />
          Back to Directory
        </Button>
      </div>

      {error && <Notice tone="error" title="Profile Notice">{error}</Notice>}

      {loading ? (
        <LoadingRows count={4} />
      ) : guest ? (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Identity & Contact Card */}
          <div className="md:col-span-1 space-y-4">
            <Panel title="Personal Profile" description="Identity credentials">
              <div className="p-5 bg-white rounded-b-xl space-y-4 text-xs font-sans">
                <div className="flex items-center gap-3 p-4 border border-navy/10 rounded-xl bg-cream/30">
                  <div className="size-12 rounded-full bg-purple/10 text-purple flex items-center justify-center font-extrabold text-lg shrink-0">
                    {guest.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-navy text-sm">{guest.name}</h4>
                    <span className="text-[11px] text-muted-foreground font-semibold">Registered Guest</span>
                  </div>
                </div>

                <div className="space-y-3 font-medium text-muted-foreground pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-navy/5">
                    <span className="text-muted-foreground text-[11px]">Account Status</span>
                    <Tag tone={guest.status === "Active" ? "success" : "neutral"} className="text-xs font-bold">
                      {guest.status}
                    </Tag>
                  </div>

                  <div className="flex items-center gap-2.5 pb-2 border-b border-navy/5">
                    <Mail className="size-4 text-purple shrink-0" />
                    <a href={`mailto:${guest.email}`} className="truncate text-navy font-semibold hover:underline">
                      {guest.email}
                    </a>
                  </div>

                  <div className="flex items-center gap-2.5 pb-2 border-b border-navy/5">
                    <Phone className="size-4 text-emerald-600 shrink-0" />
                    <span className="text-navy font-semibold">{guest.phone}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Calendar className="size-4 text-navy/40 shrink-0" />
                    <span>
                      Joined: {guest.joinedAt ? new Date(guest.joinedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Portfolio & Visit Metrics */}
          <div className="md:col-span-2 space-y-4">
            <Panel title="Guest Portfolio Overview" description="Aggregated multi-property metrics and preferences">
              <div className="p-6 bg-white rounded-b-xl space-y-6 text-xs font-sans">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-cream/30 border border-navy/10 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Preferred Scope / Property
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <Building className="size-4 text-purple shrink-0" />
                      <span className="font-bold text-navy text-sm">{guest.propertyName}</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-cream/30 border border-navy/10 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Completed Stays
                    </span>
                    <div className="flex items-center gap-2 pt-1">
                      <Sparkles className="size-4 text-gold shrink-0" />
                      <span className="font-bold text-navy text-sm">
                        {guest.totalStays} {guest.totalStays === 1 ? "Stay Completed" : "Stays Completed"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-navy/10 space-y-2 bg-muted/10">
                  <div className="flex items-center gap-2 font-bold text-navy text-xs">
                    <ShieldCheck className="size-4 text-purple" />
                    <span>Central Account Governance</span>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Super Admin oversees high-level guest profile status and portfolio analytics across all branches.
                    Front-desk bookings, room assignments, and check-in workflows are directly managed by local property reception and management teams.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ViewGuest;
