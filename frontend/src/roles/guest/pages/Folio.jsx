import { createFileRoute } from "@tanstack/react-router";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  FileText, Download, Printer, ShieldCheck, Hotel, MapPin, 
  CreditCard, Calendar, Bed, RefreshCw, AlertCircle, Sparkles, 
  CheckCircle2, Eye, ArrowLeft 
} from "lucide-react";
import { inr } from "@/data/hs-data";
import { subscribeRealtimeSync } from "@/services/socket";

export const Route = createFileRoute("/guest/folio")({
  head: () => ({
    meta: [
      { title: "Digital Folio — Hour Stay" },
      { name: "description", content: "Your live reservation invoices, stay charges and payment ledgers." }
    ]
  }),
  component: GuestFolioPage
});

function GuestFolioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeParams = useParams();

  const [folios, setFolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFolio, setSelectedFolio] = useState(null);

  const pathId = location.pathname.split('/guest/folio/')[1];
  const activeId = routeParams?.id || pathId || new URLSearchParams(location.search).get('id');

  const fetchFolioData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiBase}/v1/guest/folio`, { headers });
      const result = await res.json();

      let list = [];
      if (result && result.success && result.data && Array.isArray(result.data.folios)) {
        list = result.data.folios;
      }
      setFolios(list);
    } catch (err) {
      console.error("Failed to load digital folios:", err);
      setError("Failed to load digital folios from server.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const handleSelectFolio = (f) => {
    if (f) {
      const folioId = f.folioId || f.id;
      navigate(`/guest/folio/${folioId}`);
    } else {
      navigate('/guest/folio');
    }
  };

  useEffect(() => {
    fetchFolioData(false);

    const handleFocus = () => fetchFolioData(true);

    const unsubscribe = subscribeRealtimeSync(() => {
      fetchFolioData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (folios.length > 0) {
      if (activeId) {
        const matched = folios.find(f => (f.folioId === activeId || f.id === activeId || f.bookingId === activeId));
        setSelectedFolio(matched || folios[0]);
      } else {
        setSelectedFolio(null);
      }
    }
  }, [activeId, folios]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/5 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Fetching live digital folios from MongoDB...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-rose-200 text-center space-y-4 shadow-soft font-ui">
        <AlertCircle className="size-10 text-rose-500 mx-auto" />
        <h3 className="font-display text-lg font-bold text-navy">Unable to Load Digital Folios</h3>
        <p className="text-xs text-rose-600 font-semibold max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchFolioData}
          className="px-5 py-2 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none"
        >
          <RefreshCw className="size-3.5" /> Try Again
        </button>
      </div>
    );
  }

  // Dedicated Folio Details Page View when an item is selected
  if (selectedFolio) {
    const f = selectedFolio;
    return (
      <div className="space-y-6 text-left font-ui">
        
        {/* Top Header Controls Panel */}
        <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-navy/60">Booking Ref: {f.bookingId}</span>
            </div>
            <h2 className="font-display text-xl font-bold text-navy mt-1">{f.hotel}</h2>
            <p className="text-xs text-navy/60 flex items-center gap-1.5 mt-0.5 font-medium">
              <MapPin className="size-3.5 text-purple" /> {f.address}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {f.invoiceAvailable && (
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-purple text-cream rounded-xl text-xs font-bold hover:bg-purple/90 transition-colors shadow-soft inline-flex items-center gap-2 cursor-pointer border-none"
              >
                <Download className="size-3.5" /> Download GST Invoice
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cream text-navy border border-navy/10 rounded-xl text-xs font-bold hover:bg-cream/80 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Printer className="size-3.5" /> Print Receipt
            </button>
          </div>
        </div>

        {/* Main Folio Invoice Ledger Panel */}
        <div className="bg-white rounded-2xl border border-navy/10 p-6 sm:p-8 shadow-soft space-y-6">
          
          {/* Folio Header Info */}
          <div className="grid gap-6 md:grid-cols-2 border-b border-navy/5 pb-6">
            <div className="space-y-1 text-xs text-navy font-semibold">
              <span className="text-[10px] uppercase font-bold text-navy/50 tracking-wider block">Guest Information</span>
              <p className="font-bold text-sm">{f.guestName}</p>
              <p className="text-navy/70">Phone: {f.guestPhone}</p>
              <p className="text-navy/70">Email: {f.guestEmail}</p>
              <p className="text-navy/70">Assigned Suite: <strong className="text-purple">{f.room}</strong></p>
            </div>

            <div className="space-y-1 text-xs text-navy font-semibold md:text-right">
              <span className="text-[10px] uppercase font-bold text-navy/50 tracking-wider block">Property Tax Credentials</span>
              <p className="font-bold text-sm">{f.hotel}</p>
              <p className="text-navy/70">GSTIN: <strong className="font-mono text-navy">{f.gstNo}</strong></p>
              <p className="text-navy/70">Dates: {f.dates}</p>
              <p className="text-navy/70">Folio Status: <strong className="text-emerald-600">{f.status}</strong></p>
            </div>
          </div>

          {/* Itemized Folio Table */}
          <div className="overflow-x-auto rounded-xl border border-muted bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] uppercase font-bold text-muted-foreground">
                  <th className="py-3 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Description / Charge Type</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted font-medium text-navy">
                {/* Room Tariff Line Item */}
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">{f.checkIn}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-navy block">Room Tariff Charges ({f.room})</span>
                    <span className="text-[11px] text-muted-foreground">Base accommodation tariff</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-navy whitespace-nowrap">{inr(f.roomCharges)}</td>
                </tr>

                {/* GST Tax Line Item */}
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">{f.checkIn}</td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-bold text-navy block">Taxes & GST (18%)</span>
                    <span className="text-[11px] text-muted-foreground">Statutory GST liability on room tariff</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-navy whitespace-nowrap">{inr(f.gstTax)}</td>
                </tr>

                {/* Dynamic Services / Add-ons Line Items */}
                {f.services && f.services.map((srv, idx) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-muted-foreground whitespace-nowrap">{srv.date || f.checkIn}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-navy block">{srv.name}</span>
                      <span className="text-[11px] text-purple font-semibold">Service / Incidentals</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-navy whitespace-nowrap">{inr(srv.amount)}</td>
                  </tr>
                ))}

                {/* Discount line item if applicable */}
                {f.discount > 0 && (
                  <tr className="hover:bg-muted/10 transition-colors bg-emerald-50/50">
                    <td className="py-3.5 px-4 font-mono text-emerald-700 whitespace-nowrap">{f.checkIn}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-700 block">Promotional / Corporate Discount</span>
                      <span className="text-[11px] text-emerald-600">Promotional credit applied</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">-{inr(f.discount)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ledger Breakdown Totals Footer */}
          <div className="pt-4 border-t border-navy/5 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="text-xs text-navy/60 space-y-1">
              <p className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <ShieldCheck className="size-4" /> Official Hour Stay Digital Folio Ledger
              </p>
              <p>Any additions by front desk manager reflect dynamically in real time.</p>
            </div>

            <div className="w-full md:w-72 space-y-2 text-xs font-semibold text-navy bg-cream/20 p-4 rounded-xl border border-navy/5">
              <div className="flex justify-between">
                <span className="text-navy/60">Subtotal:</span>
                <span>{inr(f.totalCharges)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Paid Online:</span>
                <span>-{inr(f.paidAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-navy/10 font-bold text-sm">
                <span className="text-navy">Net Balance:</span>
                <span className={f.balance > 0 ? "text-amber-600" : "text-emerald-600"}>
                  {inr(f.balance)}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  }

  // Standard Main Table View matching Admin/Manager style
  return (
    <div className="space-y-6 text-left font-ui">
      
      {/* Main Table Container Panel */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4">

        {folios.length === 0 ? (
          <div className="py-16 text-center space-y-4 border border-dashed border-navy/10 rounded-2xl bg-cream/10">
            <FileText className="size-12 text-navy/20 mx-auto" />
            <div>
              <h3 className="font-display text-base font-bold text-navy">No Digital Folios Found</h3>
              <p className="text-xs text-navy/60 max-w-sm mx-auto mt-1">
                You don't have any active stay folios recorded. Explore our luxury hotels and book your next stay!
              </p>
            </div>
            <a
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple text-cream rounded-xl text-xs font-bold hover:bg-purple/90 transition-colors shadow-soft"
            >
              Explore Hotels & Rooms
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-muted bg-white">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-muted bg-[#fcfcfc] text-[10px] uppercase font-bold text-muted-foreground">
                  <th className="py-3 px-4 whitespace-nowrap">Folio ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Hotel Property</th>
                  <th className="py-3 px-4 whitespace-nowrap">Room Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Stay Dates</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Total Charges</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Paid Amount</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Balance</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Payment Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted font-medium text-navy">
                {folios.map((f) => (
                  <tr 
                    key={f.id || f.folioId} 
                    onClick={() => handleSelectFolio(f)}
                    className="hover:bg-purple/5 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-purple whitespace-nowrap">
                      {f.folioId}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-navy block">{f.hotel}</span>
                      <span className="text-[11px] text-muted-foreground">{f.city}</span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground whitespace-nowrap">
                      {f.room}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-navy whitespace-nowrap">
                      {f.dates}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-navy whitespace-nowrap">
                      {inr(f.totalCharges)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {inr(f.paidAmount)}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${f.balance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {inr(f.balance)}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        f.paymentStatus === 'Settled'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {f.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectFolio(f);
                        }}
                        className="size-8 rounded-lg bg-navy/5 hover:bg-purple hover:text-cream text-navy inline-flex items-center justify-center transition-colors cursor-pointer border-none"
                        title="View Folio Details"
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}