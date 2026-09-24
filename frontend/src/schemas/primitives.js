import { z } from "zod";

/**
 * Reusable primitive validations enforcing strict constraints across all forms:
 * - Text fields -> allow text only; show validation error for invalid numbers.
 * - Number fields -> allow numbers only; show validation error for invalid text.
 * - Email fields -> allow valid email format only.
 * - Phone fields -> numbers only with proper length validation (10 to 15 digits).
 * - Amount/price fields -> valid numbers/decimals only.
 */

// 1. Text field validations (Allow text only; reject numbers or pure numeric input)
export const textOnlySchema = (min = 1, message = "This field is required", max = 500) =>
  z
    .string()
    .trim()
    .min(min, message)
    .max(max, `Maximum length is ${max} characters`)
    .refine((val) => !/\d/.test(val), {
      message: "Text fields allow text only; numbers are not allowed"
    });

export const optionalTextOnlySchema = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Maximum length is ${max} characters`)
    .refine((val) => !val || !/\d/.test(val), {
      message: "Text fields allow text only; numbers are not allowed"
    })
    .optional()
    .or(z.literal(""));

// Name validation: Strictly letters, spaces, hyphens, apostrophes, and dots (no digits)
export const nameSchema = (min = 2, message = "Full name is required (minimum 2 characters)") =>
  z
    .string()
    .trim()
    .min(min, message)
    .max(120, "Name is too long (maximum 120 characters)")
    .refine((val) => !/\d/.test(val), {
      message: "Name must contain letters only; numbers are not allowed"
    })
    .refine((val) => /^[a-zA-Z\s.'-]+$/.test(val), {
      message: "Name can only contain alphabetic characters, spaces, hyphens, and dots"
    });

export const optionalNameSchema = (max = 120) =>
  z
    .string()
    .trim()
    .max(max, "Name is too long")
    .refine((val) => !val || !/\d/.test(val), {
      message: "Name must contain letters only; numbers are not allowed"
    })
    .refine((val) => !val || /^[a-zA-Z\s.'-]+$/.test(val), {
      message: "Name can only contain alphabetic characters, spaces, hyphens, and dots"
    })
    .optional()
    .or(z.literal(""));

// City / State validation: Text only (no digits)
export const citySchema = z
  .string()
  .trim()
  .min(2, "City / Location name is required")
  .max(100, "City name is too long")
  .refine((val) => !/\d/.test(val), {
    message: "City must contain letters only; numbers are not allowed"
  });

export const optionalCitySchema = z
  .string()
  .trim()
  .max(100, "City name is too long")
  .refine((val) => !val || !/\d/.test(val), {
    message: "City must contain letters only; numbers are not allowed"
  })
  .optional()
  .or(z.literal(""));

// General text schema (with optional strict textOnly mode)
export const textSchema = (min = 1, message = "This field is required", max = 500, { textOnly = false } = {}) => {
  let schema = z
    .string()
    .trim()
    .min(min, message)
    .max(max, `Maximum length is ${max} characters`);

  if (textOnly) {
    schema = schema.refine((val) => !/\d/.test(val), {
      message: "Text fields allow text only; numbers are not allowed"
    });
  }

  return schema;
};

export const optionalTextSchema = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max, `Maximum length is ${max} characters`)
    .optional()
    .or(z.literal(""));

// 2. Email validation: Valid email format only
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email address is required")
  .max(255, "Email address is too long")
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    "Please enter a valid email address (e.g. user@example.com)"
  );

export const optionalEmailSchema = z
  .string()
  .trim()
  .refine((val) => !val || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val), {
    message: "Please enter a valid email address (e.g. user@example.com)"
  })
  .optional()
  .or(z.literal(""));

// 3. Phone validation: Numbers only with proper length validation (10 to 15 digits)
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((val) => {
    const digitsOnly = val.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
    return /^\d+$/.test(digitsOnly);
  }, {
    message: "Phone number must contain numbers only; letters are not allowed"
  })
  .refine((val) => {
    const digitsOnly = val.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }, {
    message: "Phone number must be between 10 and 15 digits"
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((val) => {
    if (!val) return true;
    const digitsOnly = val.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
    return /^\d+$/.test(digitsOnly);
  }, {
    message: "Phone number must contain numbers only; letters are not allowed"
  })
  .refine((val) => {
    if (!val) return true;
    const digitsOnly = val.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  }, {
    message: "Phone number must be between 10 and 15 digits"
  })
  .optional()
  .or(z.literal(""));

// 4. Aadhaar validation: exactly 12 numeric digits
export const aadhaarSchema = z
  .string()
  .trim()
  .min(1, "Aadhaar number is required")
  .refine((val) => /^\d+$/.test(val.replace(/\s/g, "")), {
    message: "Aadhaar number must contain numbers only"
  })
  .refine((val) => val.replace(/\s/g, "").length === 12, {
    message: "Aadhaar number must be exactly 12 numeric digits"
  });

export const optionalAadhaarSchema = z
  .string()
  .trim()
  .refine((val) => !val || /^\d+$/.test(val.replace(/\s/g, "")), {
    message: "Aadhaar number must contain numbers only"
  })
  .refine((val) => !val || val.replace(/\s/g, "").length === 12, {
    message: "Aadhaar number must be exactly 12 numeric digits"
  })
  .optional()
  .or(z.literal(""));

// 5. Amount/Price fields: Valid numbers / decimals only
export const priceSchema = (fieldName = "Amount", { min = 0.01, allowZero = false } = {}) =>
  z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === "" || val === null || val === undefined) return false;
      const str = String(val).trim();
      return /^-?\d+(\.\d+)?$/.test(str);
    }, {
      message: `${fieldName} must be a valid number or decimal only; invalid text is not allowed`
    })
    .transform((val) => Number(val))
    .refine((num) => !isNaN(num), {
      message: `${fieldName} must be a valid number`
    })
    .refine((num) => (allowZero ? num >= 0 : num >= min), {
      message: allowZero
        ? `${fieldName} cannot be negative`
        : `${fieldName} must be greater than zero`
    });

export const nonNegativeNumberSchema = (fieldName = "Number") =>
  priceSchema(fieldName, { min: 0, allowZero: true });

// 6. Number fields: Numbers only; show validation error for invalid text
export const integerOnlySchema = (fieldName = "Value", min = 0, max = 999999) =>
  z
    .union([z.number(), z.string()])
    .refine((val) => {
      if (val === "" || val === null || val === undefined) return false;
      const str = String(val).trim();
      return /^-?\d+$/.test(str);
    }, {
      message: `${fieldName} must contain whole numbers only; invalid text is not allowed`
    })
    .transform((val) => Number(val))
    .refine((num) => !isNaN(num), {
      message: `${fieldName} must be a valid number`
    })
    .refine((num) => num >= min, {
      message: `${fieldName} must be at least ${min}`
    })
    .refine((num) => num <= max, {
      message: `${fieldName} cannot exceed ${max}`
    });

export const positiveIntegerSchema = (fieldName = "Value", min = 1, max = 999999) =>
  integerOnlySchema(fieldName, min, max);

// 7. Dates and Times
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

export const timeSchema = z
  .string()
  .trim()
  .min(1, "Time is required")
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d(\s*(AM|PM|am|pm))?$|^([1-9]|1[0-2]):[0-5]\d\s*(AM|PM|am|pm)$/,
    "Please enter a valid time (e.g. 14:00 or 02:00 PM)"
  );

// 8. Password schema
export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(100, "Password is too long");

/**
 * Universal field-level validator for immediate live and on-blur feedback.
 * @param {string} type - 'text' | 'name' | 'city' | 'email' | 'tel' | 'phone' | 'number' | 'integer' | 'amount' | 'price'
 * @param {any} value - The input value to validate
 * @param {object} options - Configuration options (e.g. required, min, max, fieldName)
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateFieldValue(type, value, options = {}) {
  const {
    required = false,
    fieldName = "Field",
    min = 0,
    max = Infinity,
    allowZero = true
  } = options;

  const strVal = value === null || value === undefined ? "" : String(value).trim();

  if (!strVal) {
    if (required) {
      return { isValid: false, error: `${fieldName} is required` };
    }
    return { isValid: true, error: null };
  }

  switch (type) {
    case "text":
    case "text-only": {
      if (options.textOnly && /\d/.test(strVal)) {
        return {
          isValid: false,
          error: "Text fields allow text only; numbers are not allowed"
        };
      }
      return { isValid: true, error: null };
    }

    case "name": {
      if (/\d/.test(strVal)) {
        return {
          isValid: false,
          error: "Name must contain letters only; numbers are not allowed"
        };
      }
      if (!/^[a-zA-Z\s.'-]+$/.test(strVal)) {
        return {
          isValid: false,
          error: "Name can only contain alphabetic letters, spaces, and hyphens"
        };
      }
      if (strVal.length < (options.minLength || 2)) {
        return {
          isValid: false,
          error: `Name must be at least ${options.minLength || 2} characters`
        };
      }
      return { isValid: true, error: null };
    }

    case "city": {
      if (/\d/.test(strVal)) {
        return {
          isValid: false,
          error: "City must contain letters only; numbers are not allowed"
        };
      }
      if (strVal.length < 2) {
        return { isValid: false, error: "City name must be at least 2 characters" };
      }
      return { isValid: true, error: null };
    }

    case "email": {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(strVal)) {
        return {
          isValid: false,
          error: "Please enter a valid email address (e.g. user@example.com)"
        };
      }
      return { isValid: true, error: null };
    }

    case "tel":
    case "phone": {
      const digitsOnly = strVal.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
      if (!/^\d+$/.test(digitsOnly)) {
        return {
          isValid: false,
          error: "Phone number must contain numbers only; letters are not allowed"
        };
      }
      if (digitsOnly.length < 10 || digitsOnly.length > 15) {
        return {
          isValid: false,
          error: "Phone number must be between 10 and 15 digits"
        };
      }
      return { isValid: true, error: null };
    }

    case "number":
    case "integer": {
      if (!/^-?\d+$/.test(strVal)) {
        return {
          isValid: false,
          error: "Numbers only; invalid text or letters are not allowed"
        };
      }
      const num = Number(strVal);
      if (num < min) {
        return { isValid: false, error: `Value must be at least ${min}` };
      }
      if (num > max) {
        return { isValid: false, error: `Value cannot exceed ${max}` };
      }
      return { isValid: true, error: null };
    }

    case "amount":
    case "price": {
      if (!/^-?\d+(\.\d+)?$/.test(strVal)) {
        return {
          isValid: false,
          error: "Amount must be a valid number or decimal only; invalid text is not allowed"
        };
      }
      const num = Number(strVal);
      if (isNaN(num)) {
        return { isValid: false, error: "Please enter a valid number" };
      }
      if (!allowZero && num <= 0) {
        return { isValid: false, error: "Amount must be greater than zero" };
      }
      if (allowZero && num < 0) {
        return { isValid: false, error: "Amount cannot be negative" };
      }
      return { isValid: true, error: null };
    }

    default:
      return { isValid: true, error: null };
  }
}

/**
 * Helper to validate form objects against a Zod schema.
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
