import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  priceSchema,
  positiveIntegerSchema,
  nonNegativeNumberSchema,
  dateSchema
} from "./primitives.js";

// Coupon Creation & Edit
export const couponSchema = z
  .object({
    code: textSchema(3, "Coupon code must be at least 3 characters").transform((v) =>
      v.toUpperCase()
    ),
    discountType: textSchema(1, "Discount type is required"),
    discountValue: priceSchema("Discount value"),
    minBookingAmount: priceSchema("Minimum booking amount", { allowZero: true })
      .optional()
      .default(0),
    minimumSubscriptionAmount: priceSchema("Minimum subscription amount", { allowZero: true })
      .optional()
      .default(0),
    maxDiscount: priceSchema("Maximum discount amount", { allowZero: true })
      .optional()
      .default(0),
    maxDiscountAmount: priceSchema("Maximum discount amount", { allowZero: true })
      .optional()
      .default(0),
    validFrom: dateSchema.optional().or(z.literal("")),
    validUntil: dateSchema.optional().or(z.literal("")),
    expiryDate: dateSchema.optional().or(z.literal("")),
    usageLimit: positiveIntegerSchema("Usage limit", 1).optional().default(100),
    description: optionalTextSchema(300),
    title: optionalTextSchema(100),
    applicableSubscriptionPlans: z.array(z.string()).optional().default([]),
    status: z.string().optional().default("Active"),
    propertyId: z.string().optional().default("all")
  })
  .superRefine((data, ctx) => {
    const expiry = data.validUntil || data.expiryDate;
    if (!expiry) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry date is required",
        path: ["validUntil"]
      });
    } else if (data.validFrom && new Date(expiry) < new Date(data.validFrom)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry date cannot be earlier than start date",
        path: ["validUntil"]
      });
    }
  });

// SaaS / Hotel Subscription Plan Creation & Edit
export const planSchema = z.object({
  name: textSchema(2, "Plan name is required"),
  price: priceSchema("Plan price", { allowZero: true }).optional(),
  monthlyPrice: priceSchema("Monthly tariff", { allowZero: true }).optional(),
  yearlyPrice: priceSchema("Yearly tariff", { allowZero: true }).optional(),
  propertyLimit: positiveIntegerSchema("Property limit", 1).optional(),
  roomLimit: positiveIntegerSchema("Room limit", 1).optional(),
  billingCycle: optionalTextSchema(50),
  description: optionalTextSchema(500),
  features: z.array(z.string()).optional().default([]),
  includedFeatures: z.array(z.string()).optional().default([]),
  includedFeaturesText: optionalTextSchema(1000),
  status: z.string().optional().default("Active")
});
