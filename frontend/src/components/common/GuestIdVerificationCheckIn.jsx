import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { PageHeader, Panel, Tag, Notice, Crumbs } from "@/components/hs/kit";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/hs/FormFields";
import { toast } from "sonner";
import {
  ShieldCheck,
  UserCheck,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Upload,
  FileText,
  AlertCircle,
  Eye,
  Camera,
  Layers,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Users,
  IndianRupee,
  Lock,
  Unlock,
  Loader2,
  Fingerprint,
  AlertTriangle
} from "lucide-react";
import { receptionistService } from "@/services/receptionist";
import { managerService } from "@/services/manager";
import { superAdminService } from "@/services/superAdmin";
import { adminService } from "@/services/admin";
import { formatDisplayDate, isToday } from "@/utils/dateUtils";
import { useServerTime, getCheckInStatusInfo } from "@/utils/serverTime";
import { validateWithZod, guestIdVerificationSchema } from "@/schemas";

export function GuestIdVerificationCheckIn({ role = "receptionist" }) {
  const params = useParams() || {};
  const id = params.id || (typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "");
  const navigate = useNavigate();

  const { serverTime, formattedServerTime } = useServerTime(2000);

  const [loading, setLoading] = useState(true);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [booking, setBooking] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);

  // Form & ID Verification state
  const [assignedRoom, setAssignedRoom] = useState("");
  const [idDocType, setIdDocType] = useState("Aadhaar Card");
  const [idDocNumber, setIdDocNumber] = useState("");
  const [idDocImage, setIdDocImage] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(null);
  const [verifiedBy, setVerifiedBy] = useState("");
  const [staffAttestation, setStaffAttestation] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [uploadPreview, setUploadPreview] = useState(null);

  // Aadhaar consistency state
  const [aadhaarStatus, setAadhaarStatus] = useState(null);
  const [verificationError, setVerificationError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const formatAadhaarInput = (value) => {
    if (!value) return "";
    const digits = String(value).replace(/\D/g, "").slice(0, 12);
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    return parts.join(" ");
  };

  const getRoleService = () => {
    if (role === "admin") return adminService;
    if (role === "manager") return managerService;
    return receptionistService;
  };

  const fetchAadhaarStatus = async (bookingId) => {
    try {
      const srv = getRoleService();
      if (srv.getGuestAadhaarStatus) {
        const res = await srv.getGuestAadhaarStatus(bookingId);
        if (res?.success && res?.data) {
          setAadhaarStatus(res.data);
          return res.data;
        }
      }
    } catch (err) {
      console.warn("Could not fetch guest Aadhaar status:", err);
    }
    return null;
  };

  // Return navigation path based on role
  const returnUrl =
    role === "admin"
      ? "/admin/reservations"
      : role === "manager"
      ? "/manager/reservations"
      : "/reception/reservations";

  const returnLabel = "Reservations";

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);
      try {
        const [resListRes, roomsRes, superResList] = await Promise.all([
          receptionistService.getReservations().catch(() => ({ success: false })),
          receptionistService.getRooms().catch(() => ({ success: false })),
          superAdminService.getReservations().catch(() => ({ success: false }))
        ]);

        let allBookings = [];
        if (resListRes?.success && Array.isArray(resListRes.data)) allBookings.push(...resListRes.data);
        if (superResList?.success && Array.isArray(superResList.data)) allBookings.push(...superResList.data);

        const found = allBookings.find(
          (b) =>
            String(b._id) === String(id) ||
            String(b.id) === String(id) ||
            String(b.bookingId) === String(id)
        );

        if (found) {
          setBooking(found);
          const initialRoom = found.roomNumber || (found.room ? String(found.room).match(/\b\d{3,4}\b/)?.[0] || found.room.split(" ")[0] : "101");
          setAssignedRoom(initialRoom);

          const isAadhaar = (found.idDocType || "Aadhaar Card") === "Aadhaar Card";
          setIdDocType(found.idDocType || "Aadhaar Card");
          if (found.idDocNumber) {
            setIdDocNumber(isAadhaar ? formatAadhaarInput(found.idDocNumber) : found.idDocNumber);
          }
          if (found.idDocImage) {
            setIdDocImage(found.idDocImage);
            setUploadPreview(found.idDocImage);
          }
          if (
            (found.idVerification === "Verified" || (found.idDocNumber && found.idVerifiedAt)) &&
            found.idVerification !== "Mismatch"
          ) {
            setIsVerified(true);
            setStaffAttestation(true);
            setVerifiedAt(found.idVerifiedAt || new Date().toISOString());
            setVerifiedBy(found.idVerifiedBy || "Front Desk Staff");
          } else {
            setIsVerified(false);
          }

          // Fetch guest Aadhaar consistency profile
          await fetchAadhaarStatus(found._id || found.id);
        } else {
          toast.error("Reservation record could not be found.");
        }

        let dbRooms = roomsRes?.success && Array.isArray(roomsRes.data) ? roomsRes.data : [];
        if (dbRooms.length === 0) {
          dbRooms = [
            { roomNumber: "101", category: "Standard Room", status: "Available" },
            { roomNumber: "102", category: "Standard Room", status: "Available" },
            { roomNumber: "103", category: "Standard Room", status: "Available" },
            { roomNumber: "201", category: "Deluxe Room", status: "Available" },
            { roomNumber: "202", category: "Deluxe Room", status: "Available" },
            { roomNumber: "203", category: "Deluxe Room", status: "Available" },
            { roomNumber: "301", category: "Executive Suite", status: "Available" },
            { roomNumber: "302", category: "Executive Suite", status: "Available" },
            { roomNumber: "303", category: "Executive Suite", status: "Available" }
          ];
        }
        setAvailableRooms(dbRooms);
      } catch (err) {
        console.error("Failed to load booking for verification:", err);
        toast.error("Failed to load reservation data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Document file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadPreview(reader.result);
      setIdDocImage(reader.result);
      toast.success(`Attached ${file.name} for identity proof.`);
    };
    reader.readAsDataURL(file);
  };

  const handleDocTypeChange = (e) => {
    const val = e.target.value;
    setIdDocType(val);
    setVerificationError("");
    if (val === "Aadhaar Card") {
      setIdDocNumber((prev) => formatAadhaarInput(prev));
    }
  };

  const handleDocNumberChange = (e) => {
    const val = e.target.value;
    setVerificationError("");
    if (idDocType === "Aadhaar Card") {
      setIdDocNumber(formatAadhaarInput(val));
    } else {
      setIdDocNumber(val);
    }
  };

  const cleanAadhaar = idDocNumber ? String(idDocNumber).replace(/\D/g, "") : "";
  const isAadhaarDoc = idDocType === "Aadhaar Card";
  const isAadhaarMismatch = Boolean(
    isAadhaarDoc &&
    aadhaarStatus?.hasExistingAadhaar &&
    cleanAadhaar.length === 12 &&
    aadhaarStatus?.last4 &&
    !cleanAadhaar.endsWith(aadhaarStatus.last4)
  );

  // Step 1: Submit ID Verification
  const handleVerifyIdProof = async (e) => {
    e.preventDefault();
    setVerificationError("");

    const val = validateWithZod(guestIdVerificationSchema, {
      idDocType,
      idDocNumber: isAadhaarDoc ? cleanAadhaar : idDocNumber,
      assignedRoom: assignedRoom || booking?.roomNumber || "101"
    });

    if (!val.isValid) {
      setFieldErrors(val.errors);
      setVerificationError(val.firstError);
      toast.error(val.firstError);
      return;
    }
    setFieldErrors({});

    if (isAadhaarDoc) {
      if (!/^[2-9]/.test(cleanAadhaar)) {
        toast.error("Invalid Aadhaar number (cannot start with 0 or 1).");
        return;
      }
      if (isAadhaarMismatch) {
        const msg = `Aadhaar Mismatch: Entered number does not match registered record (${aadhaarStatus?.maskedAadhaar}). Hotel policy requires the same Aadhaar across all bookings for a guest.`;
        setVerificationError(msg);
        toast.error(msg);
        return;
      }
    }

    if (!staffAttestation) {
      toast.error("Please confirm the staff attestation checkbox to verify guest identity.");
      return;
    }

    setSubmittingVerification(true);
    try {
      const payload = {
        idDocType,
        idDocNumber: isAadhaarDoc ? cleanAadhaar : idDocNumber.trim(),
        idDocImage: idDocImage || uploadPreview || "",
        idVerification: "Verified",
        notes: verificationNotes
      };

      const srv = getRoleService();
      const res = await srv.verifyIdProof(booking._id || booking.id, payload);

      if (res?.success || res?.data) {
        setIsVerified(true);
        setVerifiedAt(new Date().toISOString());
        setVerifiedBy(res?.data?.idVerifiedBy || "Authorized Staff");
        setVerificationError("");
        toast.success("Guest ID proof verified and recorded successfully! You can now complete the check-in.");

        // Refresh Aadhaar status and booking
        await fetchAadhaarStatus(booking._id || booking.id);
        if (res?.data?.booking) {
          setBooking(res.data.booking);
        }
      } else {
        const errorMsg = res?.message || "Failed to submit ID proof verification.";
        setVerificationError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error("ID verification error:", err);
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        "ID proof verification failed. Please verify the Aadhaar number.";
      setVerificationError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmittingVerification(false);
    }
  };

  // Step 2: Complete Check-In
  const handleCompleteCheckIn = async () => {
    const checkInStatus = booking ? getCheckInStatusInfo(booking) : { isAllowed: true };
    if (!checkInStatus.isAllowed) {
      toast.error(checkInStatus.tooltip || "Check-in time has not arrived yet based on server time.");
      return;
    }

    if (!isVerified) {
      toast.error("ID verification is mandatory for website reservations before check-in.");
      return;
    }

    if (!assignedRoom) {
      toast.error("Please select an assigned physical room number.");
      return;
    }

    setSubmittingCheckIn(true);
    try {
      const checkinPayload = {
        status: "Checked-in",
        room: assignedRoom,
        roomNumber: assignedRoom,
        idVerification: "Verified",
        idDocType,
        idDocNumber: isAadhaarDoc ? cleanAadhaar : idDocNumber.trim(),
        idDocImage: idDocImage || uploadPreview || ""
      };

      let res;
      if (role === "admin") {
        res = await superAdminService.updateReservation(booking._id || booking.id, checkinPayload);
        await adminService.updateRoomStatus(assignedRoom, "Occupied").catch(() => ({}));
      } else if (role === "manager") {
        res = await managerService.updateReservation(booking._id || booking.id, checkinPayload);
      } else {
        res = await receptionistService.updateReservationStatus(
          booking._id || booking.id,
          "Checked-in",
          assignedRoom,
          checkinPayload
        );
      }

      toast.success(
        `Check-in complete! Guest ${booking.guest || booking.name} is now checked into Room #${assignedRoom}.`
      );

      emitRealtimeEvent("checkin", {
        bookingId: booking.bookingId || booking._id || booking.id,
        roomNumber: assignedRoom,
        status: "Checked-in"
      });
      emitRealtimeEvent("room_status_changed", {
        roomNumber: assignedRoom,
        status: "Occupied"
      });

      setTimeout(() => {
        navigate(returnUrl);
      }, 700);
    } catch (err) {
      console.error("Check-in error:", err);
      const errMsg = err?.response?.data?.message || err?.message || "Failed to complete check-in.";
      toast.error(errMsg);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-3 font-ui text-navy">
        <Loader2 className="size-8 animate-spin text-purple" />
        <p className="text-xs font-bold text-navy/70">Loading Guest & Stay Verification Data...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-8 max-w-2xl mx-auto font-ui text-left space-y-4">
        <Notice tone="error" title="Reservation Record Missing">
          The requested booking details could not be retrieved. Please check the reservation ledger.
        </Notice>
      </div>
    );
  }

  const guestName = booking.guest || booking.guestName || booking.name || "Guest";
  const sourceName = booking.source || "Direct Web";
  const roomCategory = booking.roomType || (booking.room && booking.room.includes("·") ? booking.room.split("·")[1]?.trim() : booking.room || "Standard Room");
  const totalTariff = Number(booking.totalAmount || booking.amount || 0);
  const balanceRemaining = Number(booking.balance || 0);
  const paidAmount = totalTariff - balanceRemaining;

  return (
    <div className="space-y-6 text-left font-ui animate-fade-in max-w-6xl mx-auto pb-12">
      {/* Header & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 pb-4">
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-black text-navy flex items-center gap-2.5">
            <ShieldCheck className="size-6 text-emerald-600 shrink-0" />
            Guest Verification & Check-In
          </h1>
          <p className="text-xs text-navy/70 mt-0.5">
            Mandatory government ID proof capture and check-in clearance for online reservations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tag tone={isVerified ? "success" : "warning"} className="px-3 py-1 text-xs font-bold uppercase tracking-wider">
            {isVerified ? "✓ ID Verified" : "⚠ ID Verification Pending"}
          </Tag>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Guest & Reservation Metadata (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Guest Identity Card */}
          <div className="bg-white rounded-2xl border border-navy/10 p-5 shadow-soft space-y-4">
            <div className="flex items-center justify-between border-b border-navy/5 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-purple/10 text-purple font-bold">
                  <UserCheck className="size-4.5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-navy leading-snug">{guestName}</h3>
                  <p className="text-[10px] font-mono text-muted-foreground">ID: {booking.bookingId || booking._id || booking.id}</p>
                </div>
              </div>
              <Tag tone="brand" className="text-[10px] font-bold px-2 py-0.5">
                {sourceName}
              </Tag>
            </div>

            <div className="space-y-2.5 text-xs text-navy/80">
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold">{booking.phone || "+91 98204 33121"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-semibold">{booking.email || "guest@example.com"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground shrink-0" />
                <span>{booking.city || "Hyderabad, India"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-3.5 text-muted-foreground shrink-0" />
                <span>{booking.pax || "2 Adults"}</span>
              </div>
            </div>

            {aadhaarStatus?.hasExistingAadhaar && (
              <div className="bg-purple/5 border border-purple/20 rounded-xl p-3 flex items-start gap-2.5 mt-3">
                <Fingerprint className="size-4.5 text-purple shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-bold text-navy">Verified Aadhaar on File</span>
                    <Tag tone="success" className="text-[9px] px-1.5 py-0">Registered Guest</Tag>
                  </div>
                  <p className="text-xs font-mono font-bold text-purple mt-0.5 tracking-wider">
                    {aadhaarStatus.maskedAadhaar || `•••• •••• ${aadhaarStatus.last4}`}
                  </p>
                  <p className="text-[10px] text-navy/70 mt-1 leading-tight">
                    Strict Aadhaar Consistency Rule: The same Aadhaar must be presented across all stays for this guest.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Stay & Tariff Details */}
          <div className="bg-white rounded-2xl border border-navy/10 p-5 shadow-soft space-y-4">
            <h4 className="font-display text-sm font-bold text-navy border-b border-navy/5 pb-2.5 flex items-center justify-between">
              <span>Stay & Tariff Summary</span>
              <span className="text-[10px] font-semibold text-purple">{booking.nights || 1} Night(s)</span>
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs bg-cream/40 p-3 rounded-xl border border-navy/5">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Check-In Date</p>
                <p className="font-bold text-navy mt-0.5">{formatDisplayDate(booking.checkIn)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Check-Out Date</p>
                <p className="font-bold text-navy mt-0.5">{formatDisplayDate(booking.checkOut)}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs pt-1 border-t border-navy/5">
              <div className="flex justify-between text-navy/70">
                <span>Reserved Category:</span>
                <span className="font-bold text-navy">{roomCategory}</span>
              </div>
              <div className="flex justify-between text-navy/70">
                <span>Total Stay Tariff:</span>
                <span className="font-bold text-navy">₹{totalTariff.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-navy/70">
                <span>Amount Settled:</span>
                <span className="font-bold text-emerald-700">₹{paidAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-navy/70 font-bold border-t border-navy/10 pt-2 text-sm">
                <span>Balance Due at Desk:</span>
                <span className={balanceRemaining > 0 ? "text-rose-600" : "text-emerald-600"}>
                  ₹{balanceRemaining.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Room Allocation Selector */}
          <div className="bg-white rounded-2xl border border-navy/10 p-5 shadow-soft space-y-3">
            <label className="text-xs font-bold text-navy block flex items-center gap-1.5">
              <Building2 className="size-4 text-purple shrink-0" />
              Assign / Confirm Physical Room Number *
            </label>
            <select
              value={assignedRoom}
              onChange={(e) => setAssignedRoom(e.target.value)}
              className="w-full h-11 px-3 bg-[#fcfcfc] border border-muted rounded-xl text-xs font-bold text-navy focus:outline-none focus:ring-2 focus:ring-purple/30 cursor-pointer"
            >
              {availableRooms.map((rm) => (
                <option key={rm.roomNumber || rm._id} value={rm.roomNumber}>
                  Room #{rm.roomNumber} ({rm.category || "Standard Room"}) — {rm.status || "Available"}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Physical key and operational room assignment for this active guest folio.
            </p>
          </div>
        </div>

        {/* Right Column: ID Proof Capture, Verification & Check-In Action (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Panel
            title="Step 1: Government ID Proof Verification"
            description="Inspect photo identity document and confirm authenticity against reservation records."
          >
            <form onSubmit={handleVerifyIdProof} className="p-6 space-y-5 bg-white rounded-b-2xl">
              {booking?.idVerification === "Mismatch" && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-3">
                  <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-950">Aadhaar Consistency Flagged (Verification Blocked)</p>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                      Previous ID submission was rejected because the entered Aadhaar differed from the guest's verified record ({aadhaarStatus?.maskedAadhaar || "on file"}). Enter the matching Aadhaar to clear this status.
                    </p>
                  </div>
                </div>
              )}

              {verificationError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-start gap-3">
                  <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-950">Verification Error</p>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">{verificationError}</p>
                  </div>
                </div>
              )}

              {isVerified && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold">Identity Verification Cleared</p>
                      <p className="text-[10px] text-emerald-700/80">
                        Verified on {new Date(verifiedAt || Date.now()).toLocaleTimeString()} by {verifiedBy || "Staff"}
                      </p>
                    </div>
                  </div>
                  <Tag tone="success">Verified</Tag>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-navy block mb-1.5">ID Document Type *</label>
                  <select
                    value={idDocType}
                    onChange={handleDocTypeChange}
                    className="w-full h-11 px-3 bg-[#fcfcfc] border border-muted rounded-xl text-xs font-semibold text-navy focus:outline-none focus:ring-2 focus:ring-purple/30 cursor-pointer"
                  >
                    <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                    <option value="Voter ID Card">Voter ID Card (EPIC)</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="National Identity Card">National Identity Card</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-navy block">ID Document Number *</label>
                    {isAadhaarDoc && aadhaarStatus?.hasExistingAadhaar && (
                      <span className="text-[10px] font-mono font-bold text-purple bg-purple/10 px-1.5 py-0.5 rounded">
                        On File: {aadhaarStatus.maskedAadhaar}
                      </span>
                    )}
                  </div>
                  <Input
                    type="text"
                    required
                    placeholder={isAadhaarDoc ? "e.g. 5489 1234 8901" : "e.g. Z1234567"}
                    value={idDocNumber}
                    onChange={(e) => {
                      handleDocNumberChange(e);
                      if (fieldErrors.idDocNumber) setFieldErrors(prev => ({ ...prev, idDocNumber: null }));
                    }}
                    maxLength={isAadhaarDoc ? 14 : 30}
                    className={`h-11 text-xs font-semibold ${
                      isAadhaarMismatch || fieldErrors.idDocNumber
                        ? "border-rose-500 focus-visible:ring-rose-400 bg-rose-50/30"
                        : isAadhaarDoc && cleanAadhaar.length === 12 && aadhaarStatus?.hasExistingAadhaar && cleanAadhaar.endsWith(aadhaarStatus.last4)
                        ? "border-emerald-500 focus-visible:ring-emerald-400 bg-emerald-50/30"
                        : ""
                    }`}
                  />
                  {fieldErrors.idDocNumber && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">{fieldErrors.idDocNumber}</p>
                  )}
                  {isAadhaarDoc && (
                    <div className="mt-1.5">
                      {isAadhaarMismatch ? (
                        <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="size-3.5 shrink-0" />
                          Aadhaar Mismatch: Ends with {cleanAadhaar.slice(-4)}, but registered record is {aadhaarStatus.maskedAadhaar}. Verification blocked.
                        </p>
                      ) : cleanAadhaar.length === 12 && aadhaarStatus?.hasExistingAadhaar && cleanAadhaar.endsWith(aadhaarStatus.last4) ? (
                        <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3.5 shrink-0" />
                          Matches verified guest record on file ({aadhaarStatus.maskedAadhaar}).
                        </p>
                      ) : cleanAadhaar.length === 12 && !aadhaarStatus?.hasExistingAadhaar ? (
                        <p className="text-[11px] font-bold text-purple flex items-center gap-1">
                          <Sparkles className="size-3.5 shrink-0" />
                          Valid 12-digit Aadhaar. Will be saved to guest profile upon verification.
                        </p>
                      ) : cleanAadhaar.length > 0 && cleanAadhaar.length < 12 ? (
                        <p className="text-[10px] text-muted-foreground">
                          {12 - cleanAadhaar.length} digit(s) remaining (12 digits required)
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Document Image Upload / Preview */}
              <div>
                <label className="text-xs font-bold text-navy block mb-1.5">
                  ID Proof Photo / Document Scan (Optional / Front Desk Camera)
                </label>
                <div className="border-2 border-dashed border-muted rounded-2xl p-4 text-center hover:border-purple/40 transition-colors bg-[#fafafa]">
                  {uploadPreview ? (
                    <div className="space-y-3">
                      <div className="relative inline-block max-h-48 rounded-xl overflow-hidden border border-navy/10 shadow-2xs">
                        <img src={uploadPreview} alt="ID Proof Preview" className="max-h-48 object-contain rounded-xl" />
                      </div>
                      <div className="flex justify-center gap-2">
                        <label className="text-[11px] font-bold text-purple hover:underline cursor-pointer bg-purple/10 px-3 py-1.5 rounded-lg">
                          Replace Document
                          <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block py-4">
                      <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs font-bold text-navy">Click or Drag & Drop ID Proof Photo</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, or PDF up to 5MB</p>
                      <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Staff Attestation */}
              <div className="bg-purple/5 p-4 rounded-xl border border-purple/15 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="attest"
                  checked={staffAttestation}
                  onChange={(e) => setStaffAttestation(e.target.checked)}
                  className="mt-0.5 size-4 rounded text-purple focus:ring-purple cursor-pointer"
                />
                <label htmlFor="attest" className="text-xs text-navy font-semibold cursor-pointer select-none leading-relaxed">
                  I attest that the presented government ID document belongs to the primary guest (<strong>{guestName}</strong>) and matches hotel compliance guidelines.
                </label>
              </div>

              {/* Step 1 Submit Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={submittingVerification || isAadhaarMismatch}
                  title={isAadhaarMismatch ? "Verification blocked: Aadhaar mismatch with existing guest record" : undefined}
                  className={`h-11 px-6 text-xs font-bold rounded-xl text-white transition-all shadow-soft flex items-center gap-2 ${
                    isAadhaarMismatch
                      ? "bg-rose-400 cursor-not-allowed opacity-60"
                      : "bg-purple hover:bg-purple-dark cursor-pointer"
                  }`}
                >
                  {submittingVerification ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  {isVerified ? "Update ID Proof Verification" : "Submit ID Verification"}
                </Button>
              </div>
            </form>
          </Panel>

          {/* Step 2: Finalize Check-In */}
          <Panel
            title="Step 2: Complete Check-In Clearance"
            description="Activate stay, lock room occupancy, and synchronize real-time hotel ledger."
          >
            <div className="p-6 bg-white rounded-b-2xl space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-navy/10 bg-cream/30">
                <div>
                  <h4 className="font-display text-sm font-bold text-navy">Ready for Guest Onboarding</h4>
                  <p className="text-xs text-navy/70 mt-0.5">
                    Room #{assignedRoom} will be marked <strong>Occupied</strong> and the guest folio will be active.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block">Assigned Room</span>
                  <span className="font-display text-lg font-black text-purple">Room #{assignedRoom}</span>
                </div>
              </div>

              {!isVerified && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0 text-amber-600" />
                  <span>Please complete Step 1 (ID Proof Verification) above to unlock check-in.</span>
                </div>
              )}

              {(() => {
                const checkInStatus = booking ? getCheckInStatusInfo(booking) : { isAllowed: true };
                if (checkInStatus.isAllowed) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center gap-3">
                    <Clock className="size-4 shrink-0 text-indigo-600" />
                    <div>
                      <span className="font-bold block">Check-In Opens at {booking?.checkInTime || '12:00 PM'} ({checkInStatus.timeRemainingStr})</span>
                      <span className="text-[11px] text-indigo-700">Strict check-in rules require server time ({formattedServerTime}) to reach scheduled check-in time. Button unlocks automatically at 12:00 PM.</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(returnUrl)}
                  className="h-11 px-5 text-xs font-bold text-navy border-navy/20 hover:bg-navy/5 rounded-xl cursor-pointer"
                >
                  Cancel & Return
                </Button>

                {(() => {
                  const checkInStatus = booking ? getCheckInStatusInfo(booking) : { isAllowed: true };
                  const canComplete = isVerified && checkInStatus.isAllowed && !submittingCheckIn;

                  return (
                    <Button
                      type="button"
                      disabled={!canComplete}
                      onClick={handleCompleteCheckIn}
                      title={!checkInStatus.isAllowed ? checkInStatus.tooltip : undefined}
                      className={`h-11 px-7 text-xs font-bold rounded-xl text-white transition-all shadow-soft flex items-center gap-2 ${
                        canComplete
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 cursor-pointer"
                          : "bg-navy/30 cursor-not-allowed opacity-60"
                      }`}
                    >
                      {submittingCheckIn ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      {!checkInStatus.isAllowed
                        ? `Check-In Locked (${checkInStatus.timeRemainingStr})`
                        : "Complete Check-In (Confirmed → Checked-In)"}
                    </Button>
                  );
                })()}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
