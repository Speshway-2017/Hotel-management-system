import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  emailSchema,
  optionalEmailSchema,
  phoneSchema,
  aadhaarSchema,
  optionalAadhaarSchema,
  dateSchema,
  priceSchema,
  positiveIntegerSchema,
  nonNegativeNumberSchema
} from "./primitives.js";

// Public Guest Checkout Booking Form
export const publicBookingSchema = z
  .object({
    guestName: textSchema(2, "Full guest name is required"),
    email: emailSchema,
    phone: phoneSchema,
    city: textSchema(1, "City / Location is required"),
    checkIn: dateSchema,
    checkOut: dateSchema,
    pax: textSchema(1, "Number of guests is required"),
    roomType: textSchema(1, "Room type selection is required"),
    aadhaarNumber: optionalAadhaarSchema,
    specialRequests: optionalTextSchema(500)
  })
  .refine(
    (data) => {
      const start = new Date(data.checkIn);
      const end = new Date(data.checkOut);
      return end >= start;
    },
    {
      message: "Check-out date cannot be earlier than check-in date",
      path: ["checkOut"]
    }
  );

// Receptionist / Front Desk Walk-In Booking
export const walkInBookingSchema = z
  .object({
    guest: optionalTextSchema(100),
    guestName: optionalTextSchema(100),
    email: optionalEmailSchema,
    phone: phoneSchema,
    room: optionalTextSchema(100),
    roomNumber: optionalTextSchema(50),
    roomType: optionalTextSchema(100),
    checkIn: dateSchema,
    checkOut: dateSchema,
    amount: priceSchema("Booking amount"),
    balance: nonNegativeNumberSchema("Balance amount").optional().default(0),
    nights: positiveIntegerSchema("Nights", 1).optional().default(1),
    pax: optionalTextSchema(50),
    paymentMethod: optionalTextSchema(50),
    idProofType: optionalTextSchema(50),
    idProofNumber: optionalTextSchema(50),
    aadhaarNumber: optionalAadhaarSchema,
    notes: optionalTextSchema(500),
    specialRequests: optionalTextSchema(500)
  })
  .superRefine((data, ctx) => {
    if (!data.guest?.trim() && !data.guestName?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Guest full name is required",
        path: ["guest"]
      });
    }

    if (!data.room?.trim() && !data.roomNumber?.trim() && !data.roomType?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Room selection or room type is required",
        path: ["roomType"]
      });
    }

    if (data.checkIn && data.checkOut) {
      const start = new Date(data.checkIn);
      const end = new Date(data.checkOut);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Check-out date cannot be earlier than check-in date",
          path: ["checkOut"]
        });
      }
    }

    if (data.idProofType === "Aadhaar Card" || data.idProofType === "Aadhaar") {
      const cleanAadh = (data.idProofNumber || data.aadhaarNumber || "").replace(/\D/g, "");
      if (cleanAadh && cleanAadh.length !== 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Aadhaar number must be exactly 12 numeric digits",
          path: ["idProofNumber"]
        });
      }
    }
  });

// Stay Extension Form (Modal & Page)
export const extendStaySchema = z.object({
  extraDays: positiveIntegerSchema("Extension days", 1),
  additionalAmount: nonNegativeNumberSchema("Additional amount"),
  reason: optionalTextSchema(300)
});

// Front Desk ID Verification & Room Check-In
export const guestIdVerificationSchema = z.object({
  idDocType: textSchema(1, "ID document type is required"),
  idDocNumber: textSchema(4, "ID document number is required"),
  assignedRoom: textSchema(1, "Room allocation is required")
}).superRefine((data, ctx) => {
  if (data.idDocType === "Aadhaar Card" || data.idDocType === "Aadhaar") {
    if (!/^\d{12}$/.test(data.idDocNumber.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aadhaar number must be exactly 12 numeric digits",
        path: ["idDocNumber"]
      });
    }
  }
});

// Admin / Manager Add & Edit Reservation
export const adminReservationSchema = z
  .object({
    guest: textSchema(2, "Guest name is required"),
    email: emailSchema,
    phone: phoneSchema,
    room: textSchema(1, "Room selection is required"),
    checkIn: dateSchema,
    checkOut: dateSchema,
    amount: priceSchema("Reservation tariff"),
    pax: optionalTextSchema(50),
    status: textSchema(1, "Reservation status is required"),
    notes: optionalTextSchema(500)
  })
  .refine(
    (data) => {
      const start = new Date(data.checkIn);
      const end = new Date(data.checkOut);
      return end >= start;
    },
    {
      message: "Check-out date cannot be earlier than check-in date",
      path: ["checkOut"]
    }
  );

// Payment / Transaction Recording & Editing
export const paymentSchema = z.object({
  guestName: textSchema(2, "Guest name is required"),
  bookingId: optionalTextSchema(100),
  roomNumber: optionalTextSchema(50),
  amount: priceSchema("Payment amount"),
  paymentMethod: optionalTextSchema(100).default("UPI"),
  status: optionalTextSchema(100).default("Settled"),
  notes: optionalTextSchema(500)
});
