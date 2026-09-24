import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  nameSchema,
  optionalNameSchema,
  citySchema,
  priceSchema,
  positiveIntegerSchema,
  emailSchema,
  optionalEmailSchema,
  phoneSchema,
  optionalPhoneSchema,
  passwordSchema
} from "./primitives.js";

// Room Creation & Edit
export const roomSchema = z
  .object({
    roomNumber: textSchema(1, "Room number is required"),
    type: optionalTextSchema(100),
    category: optionalTextSchema(100),
    floor: textSchema(1, "Floor is required"),
    pricePerNight: priceSchema("Room tariff").optional(),
    baseRate: priceSchema("Base tariff").optional(),
    capacity: positiveIntegerSchema("Guest capacity", 1).optional(),
    status: z.string().optional().default("Available"),
    amenities: z.any().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.type?.trim() && !data.category?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Room category / type is required",
        path: ["type"]
      });
    }
    const rate = data.pricePerNight ?? data.baseRate;
    if (rate === undefined || rate === null || rate <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter a valid rate greater than zero",
        path: ["pricePerNight"]
      });
    }
  });

// Room Type Creation & Edit
export const roomTypeSchema = z
  .object({
    name: optionalTextSchema(100),
    category: optionalTextSchema(100),
    basePrice: priceSchema("Base tariff").optional(),
    baseRate: priceSchema("Base tariff").optional(),
    capacity: positiveIntegerSchema("Standard capacity", 1).optional(),
    occupancy: positiveIntegerSchema("Standard capacity", 1).optional(),
    description: optionalTextSchema(1000),
    amenities: z.any().optional()
  })
  .superRefine((data, ctx) => {
    if (!data.name?.trim() && !data.category?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Room type / category name is required",
        path: ["category"]
      });
    }
    const rate = data.basePrice ?? data.baseRate;
    if (rate === undefined || rate === null || rate <= 0) {
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
  city: citySchema,
  address: textSchema(5, "Full street address is required").optional().or(z.literal("")),
  gstin: textSchema(5, "GSTIN number is required").optional().or(z.literal("")),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  totalRooms: positiveIntegerSchema("Total room count", 1).optional(),
  rooms: positiveIntegerSchema("Total room count", 1).optional(),
  propertyType: optionalTextSchema(100),
  gm: optionalNameSchema(100),
  assignedAdmin: optionalTextSchema(100),
  status: z.string().optional().default("Active"),
  adminName: optionalNameSchema(100),
  adminEmail: optionalEmailSchema,
  adminPassword: passwordSchema.optional().or(z.literal("")),
  adminMobile: optionalPhoneSchema
});
