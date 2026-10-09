import { z } from "zod";
import {
  textSchema,
  optionalTextSchema,
  nameSchema,
  optionalNameSchema,
  phoneSchema,
  optionalPhoneSchema,
  emailSchema,
  optionalEmailSchema,
  citySchema,
  optionalCitySchema,
  gstinSchema,
  panSchema,
  pincodeSchema,
  positiveIntegerSchema
} from "./primitives.js";

// Organization / Company Profile Schema
export const organizationSchema = z.object({
  name: textSchema(2, "Organization / Enterprise name is required"),
  companyName: optionalTextSchema(150),
  legalName: optionalTextSchema(150),
  tradeName: optionalTextSchema(150),
  email: emailSchema,
  phone: phoneSchema,
  alternatePhone: optionalPhoneSchema,
  website: optionalTextSchema(200),
  gstin: gstinSchema,
  pan: panSchema,
  address: textSchema(5, "Registered street address is required"),
  city: citySchema,
  state: optionalCitySchema,
  country: optionalCitySchema.default("India"),
  pincode: pincodeSchema,
  postalCode: pincodeSchema,
  totalProperties: positiveIntegerSchema("Property count", 1).optional(),
  contactPerson: optionalNameSchema(100),
  contactEmail: optionalEmailSchema,
  contactPhone: optionalPhoneSchema,
  status: z.string().optional().default("Active"),
  notes: optionalTextSchema(1000)
});

export default {
  organizationSchema
};
