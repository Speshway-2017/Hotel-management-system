import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HorizontalRouteTabs, PageHeader, Notice } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  Bed,
  Users,
  ConciergeBell,
  Sliders,
  DollarSign,
  Grid,
  TrendingUp,
  Tag,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Sparkles
} from "lucide-react";

const operationsTabs = [
  { label: "Reservations", to: "/admin/reservations", icon: CalendarCheck },
  { label: "Rooms & Rates", to: "/admin/rooms", icon: Bed },
  { label: "Guests", to: "/admin/guests", icon: Users },
  { label: "Front Desk", to: "/admin/front-desk", icon: ConciergeBell }
];

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms & Rates — Speshway Luxury Hotel" },
      { name: "description", content: "Configure inventory status, rate plans, promotional prices and bulk tariff updates." }
    ]
  }),
  component: RoomsRatesPage
});

// Mock Initial Rates for the Calendar
const initialRates = {
  "Maharaja Suite": [24500, 24500, 26900, 26900, 24500, 24500, 24500],
  "Garden Pool Villa": [38900, 38900, 42500, 42500, 38900, 38900, 38900],
  "Heritage Luxury": [11400, 11400, 12500, 12500, 11400, 11400, 11400],
  "Superior Deluxe": [8500, 8500, 9500, 9500, 8500, 8500, 8500]
};

const calendarDates = [
  { day: "Mon", date: "Aug 17" },
  { day: "Tue", date: "Aug 18" },
  { day: "Wed", date: "Aug 19" },
  { day: "Thu", date: "Aug 20" },
  { day: "Fri", date: "Aug 21" },
  { day: "Sat", date: "Aug 22" },
  { day: "Sun", date: "Aug 23" }
];

const categoryDetails = [
  {
    name: "Maharaja Suite",
    amenities: ["Private Jacuzzi", "Royal balcony view", "Personal butler service", "Minibar", "Wi-Fi 6", "In-room safe"],
    rooms: ["201", "202", "301", "302"],
    losDiscount: "10% off for 3+ nights"
  },
  {
    name: "Garden Pool Villa",
    amenities: ["Private infinity pool", "Plunge deck", "Open-air shower", "Mini cellar", "Express check-in"],
    rooms: ["203", "303"],
    losDiscount: "12% off for 4+ nights"
  },
  {
    name: "Heritage Luxury",
    amenities: ["Heritage furnishings", "Garden facing", "Coffee station", "Workspace desk", "Rain shower"],
    rooms: ["103", "104", "105", "204", "205", "304", "305"],
    losDiscount: "8% off for 3+ nights"
  },
  {
    name: "Superior Deluxe",
    amenities: ["Courtyard facing", "Smart TV", "Mini espresso station", "Modern bath amenities"],
    rooms: ["106", "107", "108", "206", "207", "208", "306", "307", "308"],
    losDiscount: "5% off for 2+ nights"
  }
];

function RoomsRatesPage() {
  const [rates, setRates] = useState(initialRates);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [ratesSubTab, setRatesSubTab] = useState("calendar"); // 'calendar' | 'plans'

  // Bulk update states
  const [targetCategory, setTargetCategory] = useState("all");
  const [ratePlan, setRatePlan] = useState("Standard");
  const [updateAction, setUpdateAction] = useState("increase");
  const [amountType, setAmountType] = useState("percent");
  const [updateValue, setUpdateValue] = useState("");

  function handleBulkUpdate(e) {
    e.preventDefault();
    const val = Number(updateValue);
    if (isNaN(val) || val <= 0) {
      alert("Please enter a valid numeric value.");
      return;
    }

    setRates((prev) => {
      const updated = { ...prev };
      const categories = targetCategory === "all" ? Object.keys(updated) : [targetCategory];

      categories.forEach((cat) => {
        updated[cat] = updated[cat].map((price) => {
          let diff = 0;
          if (amountType === "percent") {
            diff = Math.round(price * (val / 100));
          } else {
            diff = val;
          }

          if (updateAction === "increase") {
            return price + diff;
          } else {
            return Math.max(1000, price - diff);
          }
        });
      });
      return updated;
    });

    setIsBulkOpen(false);
    setUpdateValue("");
  }

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <HorizontalRouteTabs tabs={operationsTabs} />

      {/* Room Status Inventory Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#2ecc71] shrink-0">Available</p>
          <h3 className="mt-2 text-2xl font-black text-navy leading-none">62</h3>
          <p className="mt-2 text-[10px] text-muted-foreground">Ready for check-in</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-brand shrink-0">Occupied</p>
          <h3 className="mt-2 text-2xl font-black text-navy leading-none">52</h3>
          <p className="mt-2 text-[10px] text-muted-foreground">Current active stays</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-warning shrink-0">Dirty</p>
          <h3 className="mt-2 text-2xl font-black text-navy leading-none">8</h3>
          <p className="mt-2 text-[10px] text-muted-foreground">Pending room cleaning</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">Clean</p>
          <h3 className="mt-2 text-2xl font-black text-navy leading-none">4</h3>
          <p className="mt-2 text-[10px] text-muted-foreground">Inspected and certified</p>
        </div>

        <div className="bg-white rounded-xl border border-muted p-4 shadow-soft flex flex-col justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-destructive shrink-0">Out of Order</p>
          <h3 className="mt-2 text-2xl font-black text-navy leading-none">2</h3>
          <p className="mt-2 text-[10px] text-muted-foreground">Out of service</p>
        </div>
      </div>

      {/* Main Rates Section split in Rate Calendar & Category Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Rate Calendar & Floor Maps */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Rate Calendar Toggle Panel */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-muted">
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded bg-navy/5 text-navy font-bold text-xs">₹</span>
                <h3 className="font-display font-black text-navy text-md">Rate Schedule & Calendar</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground hidden sm:inline">17 Aug → 23 Aug, 2026</span>
                <Button
                  onClick={() => setIsBulkOpen(true)}
                  className="bg-navy hover:bg-navy-deep text-white shadow-soft text-[10.5px] h-7.5 px-3 font-bold"
                >
                  <Sliders className="size-3 mr-1" /> Bulk Update
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] font-bold uppercase tracking-widest text-muted-foreground select-none">
                    <th className="py-3 px-4">Room Category</th>
                    {calendarDates.map((d, i) => (
                      <th key={i} className="py-3 px-2 text-center">
                        <div>{d.day}</div>
                        <div className="text-[9px] text-muted-foreground lowercase">{d.date}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted text-sm text-[#2a2a2a]">
                  {Object.keys(rates).map((cat) => (
                    <tr key={cat} className="hover:bg-[#fcfcfc]/60">
                      <td className="py-4.5 px-4 font-semibold text-navy">{cat}</td>
                      {rates[cat].map((price, i) => {
                        const isWeekend = i === 5 || i === 6; // Saturday, Sunday premium
                        return (
                          <td key={i} className="py-4.5 px-2 text-center tabular-nums font-mono text-[13px]">
                            <div className={`font-bold ${isWeekend ? "text-brand" : "text-[#1b2a4a]"}`}>
                              ₹{price.toLocaleString()}
                            </div>
                            <div className="text-[9px] text-muted-foreground/75 mt-0.5">
                              {isWeekend ? "wkend" : "wkday"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Physical Floor Layout Mapping */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-muted">
              <Layers className="size-4.5 text-navy" />
              <h3 className="font-display font-black text-navy text-md">Room Assignments by Floor</h3>
            </div>

            <div className="space-y-4.5">
              {["Floor 3", "Floor 2", "Floor 1"].map((floor) => {
                const floorRooms = categoryDetails.flatMap((cat) =>
                  cat.rooms
                    .filter((r) => r.startsWith(floor.includes("3") ? "3" : floor.includes("2") ? "2" : "1"))
                    .map((num) => ({ num, catName: cat.name }))
                );

                return (
                  <div key={floor} className="space-y-2">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{floor} Layout</h4>
                    <div className="flex flex-wrap gap-2">
                      {floorRooms.map((rm) => (
                        <div key={rm.num} className="px-3 py-2 bg-muted/40 border border-muted rounded-lg text-center min-w-[70px]">
                          <div className="font-bold text-xs text-navy">#{rm.num}</div>
                          <div className="text-[8px] text-muted-foreground truncate max-w-[65px] mt-0.5">{rm.catName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right column: Category Specification Panels & Plans */}
        <div className="space-y-6">
          
          {/* Room Categories Detail (Amenities) */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="pb-3 border-b border-muted">
              <h3 className="font-display font-black text-navy text-md">Room Specifications</h3>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {categoryDetails.map((cat) => (
                <div key={cat.name} className="p-3.5 bg-muted/20 border border-muted rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-navy text-xs">{cat.name}</h4>
                    <span className="rounded bg-brand/10 border border-brand/20 px-2 py-0.5 text-[9px] font-bold text-brand uppercase">
                      LOS: {cat.losDiscount}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1 select-none">
                    {cat.amenities.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-0.5 rounded bg-white border border-muted/80 px-1.5 py-0.5 text-[8.5px] font-medium text-navy">
                        <Sparkles className="size-2 text-gold mr-0.5" /> {a}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Plans & Discounts */}
          <div className="bg-white border border-muted rounded-xl p-5 shadow-soft space-y-4">
            <div className="pb-3 border-b border-muted">
              <h3 className="font-display font-black text-navy text-md">Rate Configuration Plans</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 border border-muted rounded-lg bg-muted/10">
                <h4 className="font-bold text-navy">Standard Best Available Rate (BAR)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Flexible cancellation plan with check-in payment option. Refundable up to 24 hours prior.</p>
              </div>

              <div className="p-3 border border-muted rounded-lg bg-muted/10">
                <h4 className="font-bold text-brand">Non-Refundable Promo Plan</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Prepaid direct channel rates featuring 12% off standard rate. Non-cancellable, non-modifiable.</p>
              </div>

              <div className="p-3 border border-muted rounded-lg bg-[#9b59b6]/5 border-[#9b59b6]/20 text-[#9b59b6]">
                <h4 className="font-bold text-navy">Corporate Contract Rate (GDS)</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">Length-of-stay specific corporate pricing with fixed pre-negotiated corporate rates.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bulk Rate Update Modal */}
      {isBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl border border-muted max-w-md w-full shadow-lift overflow-hidden text-left flex flex-col">
            <div className="p-5 border-b border-muted bg-[#fcfcfc] flex items-center justify-between">
              <h3 className="font-display font-black text-navy text-md">Bulk Rate adjustment</h3>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => setIsBulkOpen(false)}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
            <form onSubmit={handleBulkUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Target Room Type</label>
                <select
                  value={targetCategory}
                  onChange={(e) => setTargetCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                >
                  <option value="all">All Room Types</option>
                  <option value="Maharaja Suite">Maharaja Suite</option>
                  <option value="Garden Pool Villa">Garden Pool Villa</option>
                  <option value="Heritage Luxury">Heritage Luxury</option>
                  <option value="Superior Deluxe">Superior Deluxe</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Rate Plan Context</label>
                <select
                  value={ratePlan}
                  onChange={(e) => setRatePlan(e.target.value)}
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                >
                  <option value="Standard">Standard Rate Plan</option>
                  <option value="Weekend">Weekend Premium Plan</option>
                  <option value="Promo">Monsoon Promo Rate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Adjustment Action</label>
                  <select
                    value={updateAction}
                    onChange={(e) => setUpdateAction(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="increase">Increase (+)</option>
                    <option value="decrease">Decrease (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Value Type</label>
                  <select
                    value={amountType}
                    onChange={(e) => setAmountType(e.target.value)}
                    className="w-full px-3 py-2 border border-muted rounded-lg text-sm bg-white focus:outline-none focus:border-navy"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Price (₹)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Adjustment value</label>
                <input
                  type="number"
                  required
                  value={updateValue}
                  onChange={(e) => setUpdateValue(e.target.value)}
                  placeholder={amountType === "percent" ? "e.g. 10 for 10%" : "e.g. 1500 for ₹1,500"}
                  className="w-full px-3 py-2 border border-muted rounded-lg text-sm focus:outline-none focus:border-navy"
                />
              </div>

              <div className="pt-4 border-t border-muted flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsBulkOpen(false)}
                  className="h-10 px-4"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-navy hover:bg-navy-deep text-white h-10 px-6">
                  Apply Tariff Update
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}