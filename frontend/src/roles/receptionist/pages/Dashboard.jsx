import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Tag } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { authService } from "@/services/auth";
import { receptionistService } from "@/services/receptionist";
import { properties } from "@/data/hs-data";
import { 
  Plus, LogIn, LogOut, Calendar, Users, Home, IndianRupee, 
  Clock, AlertTriangle, ClipboardCheck, ArrowRightLeft, CreditCard
} from "lucide-react";

export const Route = createFileRoute("/reception/")({
  head: () => ({
    meta: [
      { title: "Receptionist Front-Desk Operations Dashboard — Hour Stay" },
      { name: "description", content: "Operational dashboard for front-desk receptionist staff." }
    ]
  }),
  component: FrontDeskDashboard
});

function PremiumStatCard({ label, value, hint, icon: Icon, accentColor = "#0d1b2a" }) {
  return (
    <div
      style={{ "--accent-color": accentColor }}
      className="PremiumStatCard bg-white rounded-xl border border-muted p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift relative overflow-hidden flex flex-col justify-between min-h-[110px] h-full text-left"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-tight">{label}</p>
          <h3 className="mt-2.5 font-display text-base font-black text-navy leading-none">{value}</h3>
        </div>
        {Icon && (
          <span className="grid size-7 place-items-center rounded-lg bg-muted/65 text-navy-deep shrink-0 ml-2">
            <Icon className="size-3.5" />
          </span>
        )}
      </div>
      <div className="mt-auto pt-2 text-[9.5px] text-muted-foreground truncate">
        {hint}
      </div>
    </div>
  );
}

function FrontDeskDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [stats, setStats] = useState({
    available: 0,
    occupied: 0,
    dirty: 0,
    cleaning: 0,
    ooo: 0,
    blocked: 0
  });

  const [propName, setPropName] = useState("Assigned Hotel");

  useEffect(() => {
    // Load dynamic user profile details
    let user = authService.getCurrentUser();
    setCurrentUser(user);

    authService.getProfile()
      .then(res => {
        if (res.success && res.data) {
          setCurrentUser(res.data);
        }
      })
      .catch(err => console.warn("Failed to refresh profile:", err));

    receptionistService.getProperty()
      .then(res => {
        if (res.success && res.data) {
          setPropName(res.data.name);
        }
      })
      .catch(err => console.warn("Failed to load property details:", err));

    receptionistService.getDashboard()
      .then(res => {
        if (res.success && res.data) {
          setArrivals(res.data.arrivals || []);
          setDepartures(res.data.departures || []);
          if (res.data.stats) {
            setStats(res.data.stats);
          }
        }
      })
      .catch(err => console.error("Failed to load dashboard data:", err))
      .finally(() => setLoading(false));
  }, []);

  const receptionistName = currentUser?.name || "Imran Sheikh";
  const currentShift = currentUser?.shift || "Afternoon (15:00 - 23:00)";
  const propertyName = propName;

  const roomStatusCounts = [
    { label: "Clean / Inspected", count: stats.available, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
    { label: "Occupied", count: stats.occupied, color: "text-blue-600 bg-blue-50 border-blue-200" },
    { label: "Dirty", count: stats.dirty, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { label: "Cleaning", count: stats.cleaning, color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
    { label: "Out of Order", count: stats.ooo, color: "text-red-600 bg-red-50 border-red-200" },
    { label: "Blocked", count: stats.blocked, color: "text-slate-600 bg-slate-50 border-slate-200" }
  ];

  const alerts = [
    { type: "Pending Check-ins", message: `${arrivals.filter(a => a.status === 'Pending').length} arrivals pending check-in`, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { type: "Late Check-outs", message: `${departures.filter(d => d.status === 'Late Checkout').length} departures requesting extensions`, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { type: "Pending Payments", message: `${departures.filter(d => d.balance > 0).length} checkout rooms have pending folio balances`, icon: IndianRupee, color: "text-orange-600 bg-orange-50" }
  ];

  const totalOutstandingBalance = departures.reduce((sum, d) => sum + d.balance, 0);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs font-semibold text-muted-foreground">
        Loading operational dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left font-sans animate-fade-in font-ui text-navy">

      {/* Premium KPI Stat Cards Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
        <PremiumStatCard label="Today's Arrivals" value={arrivals.length} hint={`${arrivals.filter(a => a.status === 'Pre-checked').length} Pre-checked, ${arrivals.filter(a => a.status === 'Pending').length} Pending`} icon={LogIn} accentColor="#6366f1" />
        <PremiumStatCard label="Today's Departures" value={departures.length} hint={`${departures.filter(d => d.balance === 0).length} Paid, ${departures.filter(d => d.balance > 0).length} Pending Balance`} icon={LogOut} accentColor="#ec4899" />
        <PremiumStatCard label="In-House Guests" value={stats.occupied} hint={`${stats.occupied} Rooms occupied`} icon={Users} accentColor="#10b981" />
        <PremiumStatCard label="Available Rooms" value={stats.available} hint="Ready to sell" icon={Home} accentColor="#0ea5e9" />
        <PremiumStatCard label="Pending Payments" value={`₹${totalOutstandingBalance.toLocaleString()}`} hint={`${departures.filter(d => d.balance > 0).length} invoices due`} icon={IndianRupee} accentColor="#a855f7" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Arrivals and Departures tables */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Today's Arrivals */}
          <Panel title="Today's Arrivals List" description="Track expected guest check-ins, room mapping, and booking sources.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4">Guest Name</th>
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Room Type / No</th>
                    <th className="py-3 px-4">ETA</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {arrivals.map((arr) => (
                    <tr key={arr.id} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-bold text-navy">{arr.name}</td>
                      <td className="py-3.5 px-4 font-mono text-muted-foreground">{arr.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold">{arr.type}</span>
                        <span className="text-[10px] text-muted-foreground block font-bold">Room #{arr.room}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-navy">{arr.time}</td>
                      <td className="py-3.5 px-4">
                        <Tag tone="brand">{arr.source}</Tag>
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone={arr.status === "Pre-checked" ? "success" : "warning"}>{arr.status}</Tag>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button asChild variant="ghost" className="h-7 px-3 text-[10px] rounded-lg border border-muted font-bold cursor-pointer">
                          <Link to={`/reception/check-in/${arr.id}`}>Check-in</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Today's Departures */}
          <Panel title="Today's Departures List" description="Track check-outs, outstanding billing balances, and checkout times.">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead>
                  <tr className="bg-muted/15 border-b border-muted/50 text-[10px] font-bold text-muted-foreground uppercase select-none">
                    <th className="py-3 px-4">Guest Name</th>
                    <th className="py-3 px-4">Room No</th>
                    <th className="py-3 px-4">Departure Time</th>
                    <th className="py-3 px-4">Folio Balance</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/30 whitespace-nowrap">
                  {departures.map((dep, idx) => (
                    <tr key={idx} className="hover:bg-muted/5">
                      <td className="py-3.5 px-4 font-bold text-navy">{dep.name}</td>
                      <td className="py-3.5 px-4 font-bold text-navy-deep">Room #{dep.room}</td>
                      <td className="py-3.5 px-4 font-semibold text-navy">{dep.time}</td>
                      <td className="py-3.5 px-4 font-black text-navy">
                        ₹{dep.balance.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4">
                        <Tag tone={dep.balance > 0 ? "error" : dep.status === "Late Checkout" ? "warning" : "success"}>
                          {dep.status}
                        </Tag>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button asChild variant="ghost" className="h-7 px-3 text-[10px] rounded-lg border border-muted font-bold cursor-pointer">
                          <Link to="/reception/check-out">Check-out</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

        </div>

        {/* Right Column: Desk Actions and Alerts */}
        <div className="space-y-6">

          {/* Quick Actions Panel */}
          <Panel title="Quick Desk Actions" description="Fast track controls for front desk staff.">
            <div className="p-4 grid grid-cols-2 gap-3 bg-white rounded-b-xl">
              <Link to="/reception/check-in" className="flex flex-col items-center justify-center p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 transition-all text-center group cursor-pointer hover:no-underline">
                <LogIn className="size-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-emerald-800">Check-in</span>
                <span className="text-[9px] text-emerald-600/70 mt-0.5">Arriving guests</span>
              </Link>
              
              <Link to="/reception/check-out" className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 transition-all text-center group cursor-pointer hover:no-underline">
                <LogOut className="size-5 text-rose-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-rose-800">Check-out</span>
                <span className="text-[9px] text-rose-600/70 mt-0.5">Departing guests</span>
              </Link>

              <Link to="/reception/reservations" className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 transition-all text-center group cursor-pointer hover:no-underline">
                <Calendar className="size-5 text-blue-600 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-blue-800">Reservations</span>
                <span className="text-[9px] text-blue-600/70 mt-0.5">New booking</span>
              </Link>

              <Link to="/reception/new-booking" className="flex flex-col items-center justify-center p-3 rounded-xl border border-purple/20 bg-purple/5 hover:bg-purple/10 text-purple transition-all text-center group cursor-pointer hover:no-underline">
                <Plus className="size-5 text-purple group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold mt-1.5 text-purple-deep">Walk-in</span>
                <span className="text-[9px] text-purple/70 mt-0.5">Instant booking</span>
              </Link>
            </div>
          </Panel>

          {/* Quick Tasks / Alerts */}
          <Panel title="Active Desk Alerts" description="Operational highlights requiring front desk action.">
            <div className="p-4 space-y-3">
              {alerts.map((al, idx) => {
                const Icon = al.icon;
                return (
                  <div key={idx} className="flex gap-3 p-3 bg-[#fafafa]/50 border border-muted rounded-xl text-xs text-left">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${al.color}`}>
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-navy leading-none mt-0.5">{al.type}</p>
                      <p className="text-muted-foreground text-[11px] leading-relaxed mt-1">{al.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

        </div>
      </div>

    </div>
  );
}