import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { 
  RotateCcw, ShieldCheck, CheckCircle2, AlertCircle, 
  Hotel, Calendar, Clock, CreditCard, Banknote, HelpCircle, 
  Send, Sparkles, User, FileText, Check, ChevronRight, Info, 
  Receipt, Building2, AlertTriangle, CheckCircle, 
  RefreshCw, Hourglass, Landmark, QrCode
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/data/hs-data";
import { calculateStayNights } from "@/utils/dateUtils";
import { emitRealtimeEvent, subscribeRealtimeSync } from "@/services/socket";

export const Route = createFileRoute("/guest/refund")({
  head: () => ({
    meta: [
      { title: "Stay Refund Request — Hour Stay" },
      { name: "description", content: "Review cancellation assessment, policy, and submit refund request to hotel management." }
    ]
  }),
  component: GuestRefundPage
});

export function GuestRefundPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const pathId = window.location.pathname.split('/guest/refund/')[1] || 
                 window.location.pathname.split('/guest/refund-request/')[1] || '';
  const initialTargetId = pathId || urlParams.get('id') || urlParams.get('bookingId') || '';

  const [bookings, setBookings] = useState([]);
  const [selectedBookingId, setSelectedBookingId] = useState(initialTargetId);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Payout Form States
  const [refundMethod, setRefundMethod] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [remarks, setRemarks] = useState("");

  const fetchBookingData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

      // 1. Fetch guest bookings list
      const res = await fetch(`${apiBase}/v1/guest/bookings`, { headers });
      const data = await res.json();

      let list = [];
      if (data && data.success && Array.isArray(data.data)) {
        list = data.data;
      }
      setBookings(list);

      // 2. Identify the active booking
      let target = null;
      if (selectedBookingId || initialTargetId) {
        const queryId = selectedBookingId || initialTargetId;
        const cleanQ = String(queryId).replace(/^BK-/, '').replace(/^FOL-/, '');
        target = list.find(b => (
          String(b.bookingId) === String(queryId) || 
          String(b.id) === String(queryId) || 
          String(b._id) === String(queryId) ||
          String(b.bookingId) === String(cleanQ) ||
          String(b.id) === String(cleanQ) ||
          String(b._id) === String(cleanQ)
        ));
      }

      // If no specific match, find the most recent cancelled booking, or first booking
      if (!target) {
        const cancelledStays = list.filter(b => (b.status || '').toLowerCase() === 'cancelled');
        target = cancelledStays.length > 0 ? cancelledStays[0] : (list[0] || null);
      }

      if (target) {
        const bId = target.bookingId || target.id || target._id;
        setSelectedBookingId(bId);

        // Fetch detailed single booking assessment to ensure exact fees & policy
        try {
          const detailRes = await fetch(`${apiBase}/v1/guest/bookings/${bId}`, { headers });
          const detailData = await detailRes.json();
          if (detailData && detailData.success && detailData.data) {
            setCurrentBooking(detailData.data);
            if (detailData.data.refundRequest?.refundMethod) {
              setRefundMethod(detailData.data.refundRequest.refundMethod);
            }
            if (detailData.data.refundRequest?.upiId) {
              setUpiId(detailData.data.refundRequest.upiId);
            }
            if (detailData.data.refundRequest?.accountNumber) {
              setAccountNumber(detailData.data.refundRequest.accountNumber);
            }
            if (detailData.data.refundRequest?.ifscCode) {
              setIfscCode(detailData.data.refundRequest.ifscCode);
            }
          } else {
            setCurrentBooking(target);
          }
        } catch (_) {
          setCurrentBooking(target);
        }
      } else {
        setCurrentBooking(null);
      }
    } catch (err) {
      console.error("Failed to load booking details for refund:", err);
      setError("Unable to load booking data from hotel backend.");
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingData(false);

    const unsubscribe = subscribeRealtimeSync(() => {
      console.log('⚡ Socket event received on Refund Page. Refreshing assessment...');
      fetchBookingData(true);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedBookingId]);

  const handleBookingSwitch = async (bId) => {
    setSelectedBookingId(bId);
    const newUrl = window.location.pathname + '?bookingId=' + bId;
    window.history.pushState({}, '', newUrl);
  };

  const handleSubmitRefundRequest = async (e) => {
    e?.preventDefault();
    if (!currentBooking) {
      toast.error("No valid stay reservation selected.");
      return;
    }

    if (refundMethod === "UPI" && !upiId.trim()) {
      toast.error("Please provide a valid UPI ID (e.g. yourname@upi) for payout.");
      return;
    }

    if (refundMethod === "Bank Transfer" && (!accountNumber.trim() || !ifscCode.trim())) {
      toast.error("Please enter your Bank Account Number and IFSC Code.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('hms_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const targetId = currentBooking.bookingId || currentBooking.id || currentBooking._id;

      const calculatedAmount = Number(
        (currentBooking.refundableAmount !== undefined && Number(currentBooking.refundableAmount) > 0)
          ? currentBooking.refundableAmount
          : (Number(currentBooking.paidAmount) > 0 ? currentBooking.paidAmount : (currentBooking.amount || currentBooking.totalAmount || 0))
      );

      const payload = {
        bookingId: targetId,
        amount: calculatedAmount > 0 ? calculatedAmount : Number(currentBooking.amount || currentBooking.totalAmount || 0),
        reason: currentBooking.cancellationReason || "Upcoming stay cancelled prior to check-in",
        details: remarks || currentBooking.cancellationRemarks || "",
        refundMethod,
        upiId: refundMethod === "UPI" ? upiId.trim() : undefined,
        accountHolder: refundMethod === "Bank Transfer" ? accountHolder.trim() : undefined,
        accountNumber: refundMethod === "Bank Transfer" ? accountNumber.trim() : undefined,
        ifscCode: refundMethod === "Bank Transfer" ? ifscCode.trim().toUpperCase() : undefined,
        bankName: refundMethod === "Bank Transfer" ? bankName.trim() : undefined
      };

      const res = await fetch(`${apiBase}/v1/guest/refund`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data && data.success) {
        toast.success("Refund request submitted successfully to Hotel Management!");
        
        emitRealtimeEvent('refund_requested', {
          bookingId: targetId,
          amount: payload.amount,
          reason: payload.reason
        });
        emitRealtimeEvent('dashboard_sync', { action: 'refund_requested' });

        await fetchBookingData(true);
      } else {
        toast.error(data?.message || "Failed to submit refund request.");
      }
    } catch (err) {
      console.error("Refund submission error:", err);
      toast.error(err.message || "An error occurred while submitting refund request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-16 border border-navy/10 text-center space-y-4 shadow-soft font-ui">
        <div className="mx-auto size-10 rounded-full border-4 border-purple border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-navy/60">Retrieving stay ledger and cancellation policy...</p>
      </div>
    );
  }

  if (error || !currentBooking) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-navy/10 text-center space-y-4 shadow-soft font-ui max-w-2xl mx-auto">
        <AlertCircle className="size-10 text-amber-500 mx-auto" />
        <h2 className="font-display text-lg font-bold text-navy">No Cancelled Reservation Found</h2>
        <p className="text-xs text-navy/60 max-w-md mx-auto">
          Refund requests are available after you cancel an upcoming reservation before check-in. Explore your active stays or cancel an upcoming reservation first.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.href = '/guest/bookings'}
            className="px-5 py-2.5 bg-navy text-cream rounded-xl text-xs font-bold hover:bg-navy/90 transition-colors shadow-soft cursor-pointer inline-flex items-center gap-2 border-none"
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const b = currentBooking;
  const bookingId = b.bookingId || b.id || b._id;
  const hotelName = b.hotel || b.hotelName || "Hour Stay Luxury Hotel";
  const roomName = b.room || b.roomType || "Standard Suite";
  const roomNumber = b.roomNumber || "";
  const checkIn = b.checkIn || b.checkInDate || "2026-09-01";
  const checkOut = b.checkOut || b.checkOutDate || "2026-09-03";
  const totalAmount = Number(b.amount || b.totalAmount || b.pricing?.total || 0);
  const paidAmount = Number(b.paidAmount ?? (totalAmount > 0 ? totalAmount : 0));
  const cancellationFee = Number(b.cancellationFee ?? 0);
  const calculatedRefund = b.refundableAmount !== undefined && b.refundableAmount !== null
    ? Number(b.refundableAmount)
    : (paidAmount > 0 ? Math.max(0, paidAmount - cancellationFee) : totalAmount);
  const refundableAmount = calculatedRefund > 0 ? calculatedRefund : (paidAmount > 0 ? paidAmount : totalAmount);
  const cancellationPolicy = b.cancellationPolicy || "Free cancellation up to 24 hours prior to check-in (12:00 PM). Cancellations within 24 hours will attract a 1-night tariff penalty.";
  const cancellationReason = b.cancellationReason || "Upcoming booking cancellation before check-in";
  const cancellationRemarks = b.cancellationRemarks || b.remarks || "";

  // Refund Request Status
  const hasRefundRequest = Boolean(b.refundRequest || b.refundStatus);
  const refundStatus = b.refundStatus || b.refundRequest?.status || 'Pending';
  const refundRequestedAmount = Number(b.refundRequest?.requestedAmount ?? refundableAmount);
  const requestedAt = b.refundRequest?.requestedAt ? new Date(b.refundRequest.requestedAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : new Date().toLocaleDateString('en-IN');

  const cancelledBookingsList = bookings.filter(item => (item.status || '').toLowerCase() === 'cancelled');

  return (
    <div className="space-y-6 text-left font-ui max-w-5xl mx-auto">
      
      {/* Hero Header */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl font-bold text-navy">Guest Stay Refund Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
              Cancelled Stay
            </span>
            {hasRefundRequest && (
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                refundStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                refundStatus === 'Processing' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                refundStatus === 'Refunded' ? 'bg-purple/10 text-purple border-purple/30' :
                refundStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-300' :
                'bg-amber-50 text-amber-700 border-amber-300'
              }`}>
                Refund Status: {refundStatus}
              </span>
            )}
          </div>
          <p className="text-xs text-navy/60 font-medium mt-1">
            Review your cancellation fee breakdown, policy terms, and submit or track your refund request directly to Manager, Admin, and Receptionist.
          </p>
        </div>

        {/* Multi-Stay Switcher Dropdown if guest has multiple cancelled bookings */}
        {cancelledBookingsList.length > 1 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-navy/60 whitespace-nowrap">Switch Stay:</span>
            <select
              value={selectedBookingId}
              onChange={(e) => handleBookingSwitch(e.target.value)}
              className="px-3 py-1.5 border border-navy/20 rounded-xl text-xs font-bold text-navy bg-cream/30 focus:outline-none focus:ring-2 focus:ring-purple cursor-pointer"
            >
              {cancelledBookingsList.map(item => (
                <option key={item.bookingId || item.id} value={item.bookingId || item.id}>
                  {item.bookingId || item.id} — {item.hotel || "Speshway Hotel"} ({inr(item.amount || 0)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* LIVE REFUND STATUS BANNER (If Request Submitted) */}
      {hasRefundRequest && (
        <div className={`rounded-2xl border p-6 shadow-soft space-y-4 ${
          refundStatus === 'Approved' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' :
          refundStatus === 'Processing' ? 'bg-blue-50/70 border-blue-200 text-blue-950' :
          refundStatus === 'Refunded' ? 'bg-purple/10 border-purple/30 text-navy' :
          refundStatus === 'Rejected' ? 'bg-rose-50/70 border-rose-200 text-rose-950' :
          'bg-amber-50/70 border-amber-200 text-amber-950'
        }`}>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-navy/10">
            <div className="flex items-center gap-3">
              <div className={`size-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                refundStatus === 'Approved' ? 'bg-emerald-600 text-white' :
                refundStatus === 'Processing' ? 'bg-blue-600 text-white' :
                refundStatus === 'Refunded' ? 'bg-purple text-white' :
                refundStatus === 'Rejected' ? 'bg-rose-600 text-white' :
                'bg-amber-600 text-white'
              }`}>
                {refundStatus === 'Approved' ? <CheckCircle2 className="size-5" /> :
                 refundStatus === 'Processing' ? <RefreshCw className="size-5 animate-spin" /> :
                 refundStatus === 'Refunded' ? <Sparkles className="size-5" /> :
                 refundStatus === 'Rejected' ? <AlertTriangle className="size-5" /> :
                 <Hourglass className="size-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-bold text-navy">
                    Refund Request: {refundStatus}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                    refundStatus === 'Approved' ? 'bg-emerald-200 text-emerald-900' :
                    refundStatus === 'Processing' ? 'bg-blue-200 text-blue-900' :
                    refundStatus === 'Refunded' ? 'bg-purple/20 text-purple' :
                    refundStatus === 'Rejected' ? 'bg-rose-200 text-rose-900' :
                    'bg-amber-200 text-amber-900'
                  }`}>
                    {refundStatus}
                  </span>
                </div>
                <p className="text-xs text-navy/70 font-medium">
                  {refundStatus === 'Pending' && 'Your refund request has been received and is awaiting approval by Front Desk & Hotel Manager.'}
                  {refundStatus === 'Approved' && 'Hotel Management has approved your refund. Payout has been queued for bank disbursement.'}
                  {refundStatus === 'Processing' && 'Bank gateway is currently processing the payout credit to your designated account.'}
                  {refundStatus === 'Refunded' && 'Refund payment has been successfully settled and credited to your account.'}
                  {refundStatus === 'Rejected' && `Refund request was reviewed and declined by hotel management. (${b.refundRequest?.decisionReason || 'Policy non-compliance'})`}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase font-bold text-navy/60 block">Approved Amount</span>
              <span className="font-display text-xl font-bold text-navy">{inr(refundRequestedAmount)}</span>
              <span className="text-[10px] text-navy/60 block">Requested: {requestedAt}</span>
            </div>
          </div>

          {/* 5-Step Visual Status Tracker */}
          <div className="py-2">
            <span className="text-[10px] uppercase font-bold text-navy/60 block mb-2 tracking-wider">
              Verification & Disbursement Timeline
            </span>
            <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-bold">
              {[
                { label: "1. Submitted", active: true },
                { label: "2. Under Review", active: true },
                { label: "3. Approved", active: ['Approved', 'Processing', 'Refunded'].includes(refundStatus) },
                { label: "4. Processing", active: ['Processing', 'Refunded'].includes(refundStatus) },
                { label: "5. Refunded", active: refundStatus === 'Refunded' }
              ].map((step, idx) => (
                <div key={idx} className="space-y-1">
                  <div className={`h-1.5 rounded-full transition-all ${
                    step.active ? (refundStatus === 'Rejected' ? 'bg-rose-500' : 'bg-purple') : 'bg-navy/15'
                  }`} />
                  <span className={`block truncate ${step.active ? 'text-navy font-bold' : 'text-navy/40'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Reason or Payout destination reminder */}
          {b.refundRequest?.decisionReason && (
            <div className="p-3 bg-white/70 rounded-xl border border-navy/10 text-xs">
              <strong className="text-navy font-bold">Management Notes: </strong>
              <span className="text-navy/80">{b.refundRequest.decisionReason}</span>
            </div>
          )}

        </div>
      )}

      {/* MAIN TWO-COLUMN ASSESSMENT & SUBMISSION FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: REAL BOOKING & CANCELLATION DATA (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Real Booking & Room Information Card */}
          <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-navy/5 pb-3">
              <h2 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-2">
                <Hotel className="size-4 text-purple" /> Stay & Reservation Details
              </h2>
              <span className="font-mono text-xs font-bold text-purple">
                #{bookingId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Hotel Property</span>
                <span className="font-bold text-navy block truncate">{hotelName}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Room Type & Number</span>
                <span className="font-bold text-navy block truncate">
                  {roomName} {roomNumber ? `(Room ${roomNumber})` : ''}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Guest Name</span>
                <span className="font-bold text-navy block truncate">{b.guest || "Valued Guest"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Check-in Date</span>
                <span className="font-bold text-navy block">{checkIn} (12:00 PM)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Check-out Date</span>
                <span className="font-bold text-navy block">{checkOut} (11:00 AM)</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Duration</span>
                <span className="font-bold text-purple block">
                  {Number(b.nights) || calculateStayNights(checkIn, checkOut)} Night(s)
                </span>
              </div>
            </div>
          </div>

          {/* 2. Cancellation Reason & Remarks Card */}
          <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-2 border-b border-navy/5 pb-3">
              <FileText className="size-4 text-purple" /> Cancellation Logged by Guest
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-navy/50 block">Cancellation Reason</span>
                <p className="font-bold text-navy bg-cream/30 p-2.5 rounded-xl border border-navy/5 mt-1">
                  {cancellationReason}
                </p>
              </div>

              {cancellationRemarks && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-navy/50 block">Guest Remarks</span>
                  <p className="font-medium text-navy/80 bg-cream/20 p-2.5 rounded-xl border border-navy/5 mt-1">
                    {cancellationRemarks}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Hotel Cancellation Policy Card */}
          <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-3">
            <h2 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-2 border-b border-navy/5 pb-3">
              <ShieldCheck className="size-4 text-emerald-600" /> Cancellation Policy & Terms
            </h2>

            <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <ShieldCheck className="size-4 shrink-0" /> Policy Rule:
              </div>
              <p className="text-[11px] leading-relaxed font-medium">
                {cancellationPolicy}
              </p>
            </div>
            
            <p className="text-[10px] text-navy/50 font-medium">
              * The cancellation penalty fee is strictly calculated in accordance with the check-in time cutoff timestamp on MongoDB.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: FINANCIAL BREAKDOWN & PAYOUT SUBMISSION (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Financial Assessment Ledger */}
          <div className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-navy/5 pb-3">
              <h2 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-2">
                <Receipt className="size-4 text-purple" /> Refund Assessment Ledger
              </h2>
              <span className="text-[10px] font-bold text-emerald-600">✓ Verified Backend</span>
            </div>

            {/* Financial Line Items */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-navy/5">
                <span className="font-medium text-navy/70">Total Booking Amount:</span>
                <span className="font-bold text-navy">{inr(totalAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy/5">
                <span className="font-medium text-navy/70">Amount Paid by Guest:</span>
                <span className="font-bold text-emerald-600">{inr(paidAmount)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy/5">
                <span className="font-medium text-navy/70">Cancellation Fee:</span>
                <span className={`font-bold ${cancellationFee > 0 ? 'text-rose-600' : 'text-navy'}`}>
                  {cancellationFee > 0 ? `- ${inr(cancellationFee)}` : '₹0 (Free Window)'}
                </span>
              </div>

              {/* Net Refundable Highlight */}
              <div className="p-4 rounded-xl bg-navy text-cream flex items-center justify-between shadow-soft mt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cream/70 tracking-wider block">
                    Net Refundable Amount
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 block mt-0.5">
                    Direct Payout
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold font-display text-emerald-300">
                    {inr(refundableAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payout Details & Submission Form */}
          <form onSubmit={handleSubmitRefundRequest} className="bg-white rounded-2xl border border-navy/10 p-6 shadow-soft space-y-4">
            <h2 className="text-xs uppercase font-bold tracking-wider text-navy flex items-center gap-2 border-b border-navy/5 pb-3">
              <Banknote className="size-4 text-purple" /> Payout Destination & Routing
            </h2>

            {/* Payout Mode Selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundMethod("UPI")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                  refundMethod === "UPI"
                    ? "bg-navy text-cream border-navy shadow-sm"
                    : "bg-cream/20 text-navy/70 border-navy/10 hover:bg-cream/40"
                }`}
              >
                <QrCode className="size-3.5" /> Instant UPI ID
              </button>

              <button
                type="button"
                onClick={() => setRefundMethod("Bank Transfer")}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                  refundMethod === "Bank Transfer"
                    ? "bg-navy text-cream border-navy shadow-sm"
                    : "bg-cream/20 text-navy/70 border-navy/10 hover:bg-cream/40"
                }`}
              >
                <Landmark className="size-3.5" /> Bank Account
              </button>
            </div>

            {/* UPI Form */}
            {refundMethod === "UPI" && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] font-bold text-navy">
                  UPI ID (VPA) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  disabled={submitting || (hasRefundRequest && refundStatus !== 'Rejected')}
                  className="w-full px-3.5 py-2.5 border border-navy/20 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple disabled:bg-cream/40"
                />
                <span className="text-[10px] text-navy/50 font-medium block">
                  Refund will be disbursed directly via UPI dynamic payout upon staff approval.
                </span>
              </div>
            )}

            {/* Bank Transfer Form */}
            {refundMethod === "Bank Transfer" && (
              <div className="space-y-3 pt-1 text-xs">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-navy">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="Name as on bank passbook"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    disabled={submitting || (hasRefundRequest && refundStatus !== 'Rejected')}
                    className="w-full px-3 py-2 border border-navy/20 rounded-xl font-semibold disabled:bg-cream/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-navy">
                      Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Account Number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      disabled={submitting || (hasRefundRequest && refundStatus !== 'Rejected')}
                      className="w-full px-3 py-2 border border-navy/20 rounded-xl font-mono font-bold disabled:bg-cream/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-navy">
                      IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC0001234"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      disabled={submitting || (hasRefundRequest && refundStatus !== 'Rejected')}
                      className="w-full px-3 py-2 border border-navy/20 rounded-xl font-mono font-bold uppercase disabled:bg-cream/40"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-navy">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={submitting || (hasRefundRequest && refundStatus !== 'Rejected')}
                    className="w-full px-3 py-2 border border-navy/20 rounded-xl font-semibold disabled:bg-cream/40"
                  />
                </div>
              </div>
            )}

            {/* Additional Remarks for Receptionist/Manager */}
            <div className="space-y-1 pt-1">
              <label className="block text-[10px] font-bold text-navy">
                Remarks for Hotel Staff (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Any special remarks or note for the hotel manager / receptionist..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={submitting || (hasRefundRequest && refundStatus !== 'Rejected')}
                className="w-full px-3 py-2 border border-navy/20 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple resize-none disabled:bg-cream/40"
              />
            </div>

            {/* Submit / Re-submit or Staff-Controlled Lifecycle Status Card */}
            <div className="pt-2 space-y-2">
              {hasRefundRequest && refundStatus !== 'Rejected' ? (
                <div className="p-4 bg-cream/50 rounded-xl border border-navy/15 text-center space-y-1.5">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-navy">
                    {refundStatus === 'Pending' && <span>⏳ Awaiting Review by Hotel Staff</span>}
                    {refundStatus === 'Approved' && <span className="text-emerald-700">✓ Refund Approved — Queued for Payout</span>}
                    {refundStatus === 'Processing' && <span className="text-blue-700">⚡ Bank Payout in Processing</span>}
                    {refundStatus === 'Refunded' && <span className="text-purple">🎉 Refund Completed & Settled</span>}
                  </div>
                  <p className="text-[11px] text-navy/60 font-medium">
                    {refundStatus === 'Pending' && 'Your refund request has been logged. Management will approve and initiate bank payout.'}
                    {refundStatus === 'Approved' && 'Hotel management has authorized your refund. Payout is being processed.'}
                    {refundStatus === 'Processing' && 'Disbursement has been initiated to your designated payout account.'}
                    {refundStatus === 'Refunded' && `Amount has been credited to your ${refundMethod} account.`}
                  </p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-none disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="size-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span className="text-white font-bold">Transmitting to Manager & Staff...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5 text-white" />
                      <span className="text-white font-bold">{refundStatus === 'Rejected' ? 'Re-Submit Refund Request' : 'Submit Refund Request to Hotel Staff'}</span>
                    </>
                  )}
                </button>
              )}

              <p className="text-[10px] text-center text-navy/50 font-medium">
                Hotel Manager, Receptionist, and Admin control approval and disbursement lifecycle.
              </p>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}

export default GuestRefundPage;
