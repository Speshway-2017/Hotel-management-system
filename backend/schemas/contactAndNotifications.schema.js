import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  nameSchema,
  optionalNameSchema,
  emailSchema,
  phoneSchema
} from "./primitives.js";

// Public Contact Us Form
export const contactFormSchema = z
  .object({
    name: nameSchema(2, "Please enter your name"),
    email: emailSchema,
    phone: phoneSchema,
    hotelName: optionalTextSchema(200),
    subject: optionalTextSchema(200),
    message: textSchema(10, "Tell us a little more (10+ characters)")
  })
  .superRefine((data, ctx) => {
    if (!data.hotelName?.trim() && !data.subject?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter your hotel/property name or subject",
        path: ["hotelName"]
      });
    }
  });

// Super Admin Reply to Contact Request
export const replyContactSchema = z
  .object({
    replySubject: textSchema(3, "Reply subject is required"),
    replyBody: optionalTextSchema(10000),
    replyMessage: optionalTextSchema(10000),
    targetStatus: optionalTextSchema(50)
  })
  .superRefine((data, ctx) => {
    const msg = data.replyBody ?? data.replyMessage;
    if (!msg || msg.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reply message must be at least 5 characters long",
        path: ["replyBody"]
      });
    }
  });

// Create Notification Schema
export const createNotificationSchema = z.object({
  title: textSchema(2, "Notification title is required"),
  message: textSchema(2, "Notification message is required"),
  type: optionalTextSchema(50).default("system"),
  role: optionalTextSchema(50).default("all"),
  propertyId: optionalTextSchema(100),
  targetUser: optionalTextSchema(100),
  actionUrl: optionalTextSchema(300)
});
