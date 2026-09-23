import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  priceSchema,
  positiveIntegerSchema,
  emailSchema,
  phoneSchema,
  optionalPhoneSchema,
  passwordSchema
} from "./primitives.js";

// Room Creation & Edit
export const roomSchema = z.object({
  roomNumber: textSchema(1, "Room number is required"),
  type: optionalTextSchema(100),
  category: optionalTextSchema(100),
  floor: textSchema(1, "Floor is required"),
  pricePerNight: z.coerce.number().positive("Price must be greater than zero").optional(),
  baseRate: z.coerce.number().positive("Base rate must be greater than zero").optional(),
  capacity: z.union([positiveIntegerSchema("Guest capacity", 1), z.string()]).optional(),
  status: z.string().optional().default("Available"),
  amenities: z.any().optional()
}).superRefine((data, ctx) => {
  if (!data.type?.trim() && !data.category?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Room category / type is required",
      path: ["type"]
    });
  }
  const rate = data.pricePerNight ?? data.baseRate;
  if (!rate || rate <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid rate greater than zero",
      path: ["pricePerNight"]
    });
  }
});

// Room Type Creation & Edit
export const roomTypeSchema = z.object({
  name: optionalTextSchema(100),
  category: optionalTextSchema(100),
  basePrice: z.coerce.number().positive("Base tariff must be greater than zero").optional(),
  baseRate: z.coerce.number().positive("Base tariff must be greater than zero").optional(),
  capacity: z.union([positiveIntegerSchema("Standard capacity", 1), z.string()]).optional(),
  occupancy: z.union([positiveIntegerSchema("Standard capacity", 1), z.string()]).optional(),
  description: optionalTextSchema(1000),
  amenities: z.any().optional()
}).superRefine((data, ctx) => {
  if (!data.name?.trim() && !data.category?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Room type / category name is required",
      path: ["category"]
    });
  }
  const rate = data.basePrice ?? data.baseRate;
  if (!rate || rate <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter a valid base tariff greater than zero",
      path: ["baseRate"]
    });
  }
});

// Property / Hotel Branch Creation & Edit
export const propertySchema = z.object({
  name: textSchema(2, "Hotel property name is required"),
  city: textSchema(2, "City is required"),
  address: textSchema(5, "Full street address is required").optional().or(z.literal("")),
  gstin: textSchema(5, "GSTIN number is required").optional().or(z.literal("")),
  phone: optionalPhoneSchema,
  email: emailSchema.optional().or(z.literal("")),
  totalRooms: positiveIntegerSchema("Total room count", 1).optional(),
  rooms: positiveIntegerSchema("Total room count", 1).optional(),
  propertyType: optionalTextSchema(100),
  gm: optionalTextSchema(100),
  assignedAdmin: optionalTextSchema(100),
  status: z.string().optional().default("Active"),
  adminName: optionalTextSchema(100),
  adminEmail: emailSchema.optional().or(z.literal("")),
  adminPassword: passwordSchema.optional().or(z.literal("")),
  adminMobile: optionalPhoneSchema
});
