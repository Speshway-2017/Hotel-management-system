import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  emailSchema,
  phoneSchema,
  optionalPhoneSchema,
  optionalAadhaarSchema,
  priceSchema,
  dateSchema,
  passwordSchema
} from "./primitives.js";

// Staff Creation & Edit
export const staffSchema = z.object({
  name: textSchema(2, "Staff member name is required"),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema.optional().or(z.literal("")),
  role: optionalTextSchema(100),
  salary: z.coerce.number().min(0, "Salary cannot be negative").optional().default(0),
  shift: optionalTextSchema(100),
  dept: optionalTextSchema(100),
  department: optionalTextSchema(100),
  status: z.string().optional().default("Active"),
  joinDate: dateSchema.optional().or(z.literal(""))
});

// Guest Creation & Profile Edit
export const guestProfileSchema = z.object({
  name: textSchema(2, "Guest name is required"),
  email: emailSchema,
  phone: phoneSchema,
  city: optionalTextSchema(100),
  state: optionalTextSchema(100),
  country: optionalTextSchema(100),
  address: optionalTextSchema(300),
  aadhaar: optionalAadhaarSchema,
  idProof: optionalTextSchema(100),
  idDocType: optionalTextSchema(100),
  idDocNumber: optionalTextSchema(100),
  type: optionalTextSchema(100),
  status: optionalTextSchema(100),
  notes: optionalTextSchema(1000)
}).superRefine((data, ctx) => {
  const isAadhaar = data.idDocType === "Aadhaar Card" || data.idDocType === "aadhaar" || data.idProof === "Aadhaar Card" || Boolean(data.aadhaar);
  const num = data.aadhaar || (isAadhaar ? data.idDocNumber : null);
  if (num && isAadhaar) {
    const clean = String(num).replace(/\D/g, "");
    if (clean.length > 0 && clean.length !== 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Aadhaar number must be exactly 12 numeric digits",
        path: [data.idDocNumber ? "idDocNumber" : "aadhaar"]
      });
    }
  }
});

// Admin User Creation & Edit
export const adminUserSchema = z.object({
  name: textSchema(2, "User full name is required"),
  email: emailSchema,
  phone: optionalPhoneSchema,
  mobile: optionalPhoneSchema,
  role: optionalTextSchema(100),
  hotelBranch: optionalTextSchema(100),
  propertyId: optionalTextSchema(100),
  status: optionalTextSchema(100),
  password: passwordSchema.optional().or(z.literal(""))
});
