import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  emailSchema,
  phoneSchema,
  positiveIntegerSchema
} from "./primitives.js";

// Guest Feedback & Reviews
export const feedbackSchema = z.object({
  rating: positiveIntegerSchema("Rating", 1).max(5, "Rating cannot exceed 5 stars"),
  category: optionalTextSchema(100),
  comment: optionalTextSchema(1000),
  comments: optionalTextSchema(1000),
  title: optionalTextSchema(200),
  guestName: optionalTextSchema(100),
  hotelName: optionalTextSchema(200),
  roomNumber: optionalTextSchema(50),
  room: optionalTextSchema(50),
  bookingId: optionalTextSchema(100),
  recommend: z.boolean().optional(),
  categories: z.any().optional()
}).superRefine((data, ctx) => {
  const comm = data.comments ?? data.comment;
  if (!comm || comm.trim().length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide comments or review details (minimum 5 characters)",
      path: ["comments"]
    });
  }
});

// Guest Stay Refund Request
export const refundRequestSchema = z
  .object({
    bookingId: textSchema(1, "Booking ID is required"),
    reason: optionalTextSchema(500),
    refundMode: optionalTextSchema(50),
    refundMethod: optionalTextSchema(50),
    upiId: optionalTextSchema(100),
    bankAccountNumber: optionalTextSchema(50),
    accountNumber: optionalTextSchema(50),
    ifscCode: optionalTextSchema(20),
    accountHolderName: optionalTextSchema(100),
    accountHolder: optionalTextSchema(100),
    bankName: optionalTextSchema(100),
    amount: z.coerce.number().min(0, "Amount must be greater than or equal to 0").optional(),
    details: optionalTextSchema(1000)
  })
  .superRefine((data, ctx) => {
    const method = data.refundMethod || data.refundMode || "UPI";
    if (method === "UPI") {
      if (!data.upiId || !data.upiId.includes("@")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid UPI ID (e.g. username@okhdfcbank)",
          path: ["upiId"]
        });
      }
    } else if (method === "Bank Transfer" || method === "Bank") {
      const acc = data.accountNumber || data.bankAccountNumber;
      if (!acc || acc.length < 9) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bank account number must be at least 9 digits",
          path: [data.accountNumber ? "accountNumber" : "bankAccountNumber"]
        });
      }
      if (!data.ifscCode || data.ifscCode.length < 4) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Valid IFSC code is required",
          path: ["ifscCode"]
        });
      }
    }
  });

// Public Contact Us Form
export const contactFormSchema = z.object({
  name: textSchema(2, "Please enter your name"),
  email: emailSchema,
  phone: phoneSchema,
  hotelName: optionalTextSchema(200),
  subject: optionalTextSchema(200),
  message: textSchema(10, "Tell us a little more (10+ characters)")
}).superRefine((data, ctx) => {
  if (!data.hotelName?.trim() && !data.subject?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter your hotel/property name",
      path: ["hotelName"]
    });
  }
});

// Super Admin Reply to Contact Request
export const replyContactSchema = z.object({
  replySubject: textSchema(3, "Reply subject is required"),
  replyBody: optionalTextSchema(10000),
  replyMessage: optionalTextSchema(10000),
  targetStatus: optionalTextSchema(50)
}).superRefine((data, ctx) => {
  const msg = data.replyBody ?? data.replyMessage;
  if (!msg || msg.trim().length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Reply message must be at least 10 characters long",
      path: ["replyBody"]
    });
  }
});
