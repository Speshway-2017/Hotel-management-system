import { z } from "zod";

/**
 * Reusable primitive validations enforcing strict constraints across all forms.
 */

// Text validation with configurable min/max and custom messages
export const textSchema = (min = 1, message = "This field is required", max = 500) =>
  z.string()
    .trim()
    .min(min, message)
    .max(max, `Maximum length is ${max} characters`);

// Optional text that converts empty strings to undefined/empty string cleanly
export const optionalTextSchema = (max = 1000) =>
  z.string()
    .trim()
    .max(max, `Maximum length is ${max} characters`)
    .optional()
    .or(z.literal(""));

// Standard Email validation
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .email("Please enter a valid email address");

export const optionalEmailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address")
  .optional()
  .or(z.literal(""));

// Indian / International phone validation: 10-15 digits
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .regex(
    /^(?:\+?91[\-\s]?)?[6-9]\d{9}$|^[0-9]{10,15}$/,
    "Please enter a valid 10-digit mobile number"
  );

export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(?:\+?91[\-\s]?)?[6-9]\d{9}$|^[0-9]{10,15}$/,
    "Please enter a valid 10-digit mobile number"
  )
  .optional()
  .or(z.literal(""));

// Aadhaar validation: exactly 12 numeric digits
export const aadhaarSchema = z
  .string()
  .trim()
  .min(1, "Aadhaar number is required")
  .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 numeric digits");

export const optionalAadhaarSchema = z
  .string()
  .trim()
  .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 numeric digits")
  .optional()
  .or(z.literal(""));

// Standard Date string validation (YYYY-MM-DD or parseable date string)
export const dateSchema = z
  .string()
  .trim()
  .min(1, "Date is required")
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Please enter a valid date"
  });

export const optionalDateSchema = z
  .string()
  .trim()
  .refine((val) => !val || !isNaN(Date.parse(val)), {
    message: "Please enter a valid date"
  })
  .optional()
  .or(z.literal(""));

// Standard Time validation (HH:mm in 24hr or 12hr AM/PM)
export const timeSchema = z
  .string()
  .trim()
  .min(1, "Time is required")
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d(\s*(AM|PM|am|pm))?$|^([1-9]|1[0-2]):[0-5]\d\s*(AM|PM|am|pm)$/,
    "Please enter a valid time (e.g. 14:00 or 02:00 PM)"
  );

// Positive price/amount schema using z.coerce.number()
export const priceSchema = (fieldName = "Amount") =>
  z.coerce
    .number({ invalid_type_error: `${fieldName} must be a valid number` })
    .positive(`${fieldName} must be greater than zero`);

// Non-negative integer/number schema using z.coerce.number()
export const nonNegativeNumberSchema = (fieldName = "Number") =>
  z.coerce
    .number({ invalid_type_error: `${fieldName} must be a valid number` })
    .min(0, `${fieldName} cannot be negative`);

// Positive integer (count of guests, rooms, nights)
export const positiveIntegerSchema = (fieldName = "Value", min = 1) =>
  z.coerce
    .number({ invalid_type_error: `${fieldName} must be a valid number` })
    .int(`${fieldName} must be an integer`)
    .min(min, `${fieldName} must be at least ${min}`);

// Password schema with minimum 6 characters
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password is too long");

/**
 * Helper to validate form objects against a Zod schema.
 * Returns:
 * {
 *   isValid: boolean,
 *   errors: { [fieldName]: firstErrorMessage },
 *   data: parsedAndCoercedData
 * }
 */
export function validateWithZod(schema, rawData) {
  const result = schema.safeParse(rawData);
  if (result.success) {
    return {
      isValid: true,
      errors: {},
      data: result.data
    };
  }

  const errors = {};
  for (const issue of result.error.issues) {
    const pathKey = issue.path.join(".");
    // Store first error for each field path
    if (pathKey && !errors[pathKey]) {
      errors[pathKey] = issue.message;
    }
  }

  return {
    isValid: false,
    errors,
    data: null,
    firstError: result.error.issues[0]?.message || "Validation failed"
  };
}
