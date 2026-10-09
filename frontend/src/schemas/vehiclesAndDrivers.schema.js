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
  vehicleNumberSchema,
  drivingLicenseSchema,
  positiveIntegerSchema,
  priceSchema,
  dateSchema,
  citySchema,
  optionalCitySchema
} from "./primitives.js";

// Vehicle Creation & Edit Schema
export const vehicleSchema = z.object({
  vehicleNumber: vehicleNumberSchema,
  plateNumber: vehicleNumberSchema.optional(),
  model: textSchema(2, "Vehicle model is required (e.g. Innova Crysta, Swift Dzire)"),
  make: optionalTextSchema(50),
  category: optionalTextSchema(50).default("Cab / SUV"),
  capacity: positiveIntegerSchema("Seating capacity", 1, 60).optional().default(4),
  seatingCapacity: positiveIntegerSchema("Seating capacity", 1, 60).optional(),
  fuelType: optionalTextSchema(50).default("Diesel"),
  rcNumber: optionalTextSchema(50),
  insuranceExpiry: dateSchema.optional().or(z.literal("")),
  fitnessExpiry: dateSchema.optional().or(z.literal("")),
  status: z.string().optional().default("Available"),
  assignedDriver: optionalNameSchema(100),
  propertyId: optionalTextSchema(100),
  notes: optionalTextSchema(500)
});

// Driver Creation & Edit Schema
export const driverSchema = z.object({
  name: nameSchema(2, "Driver full name is required"),
  phone: phoneSchema,
  mobile: phoneSchema.optional(),
  email: optionalEmailSchema,
  licenseNumber: drivingLicenseSchema,
  drivingLicense: drivingLicenseSchema.optional(),
  licenseExpiry: dateSchema.optional().or(z.literal("")),
  experienceYears: positiveIntegerSchema("Years of experience", 0, 50).optional().default(1),
  assignedVehicle: optionalTextSchema(50),
  vehicleNumber: optionalTextSchema(50),
  city: optionalCitySchema,
  address: optionalTextSchema(300),
  emergencyContact: optionalPhoneSchema,
  bloodGroup: optionalTextSchema(10),
  status: z.string().optional().default("Active"),
  propertyId: optionalTextSchema(100),
  notes: optionalTextSchema(500)
});

// Transport / Ride Dispatch Request Schema
export const rideDispatchSchema = z.object({
  bookingId: optionalTextSchema(100),
  guestName: nameSchema(2, "Guest name is required"),
  phone: phoneSchema,
  pickupLocation: textSchema(3, "Pickup location is required"),
  dropLocation: textSchema(3, "Drop destination is required"),
  pickupDate: dateSchema,
  pickupTime: optionalTextSchema(50),
  vehicleType: optionalTextSchema(50).default("Sedan"),
  driverId: optionalTextSchema(100),
  vehicleId: optionalTextSchema(100),
  fare: priceSchema("Estimated fare", { allowZero: true }).optional().default(0),
  status: optionalTextSchema(50).default("Scheduled"),
  specialRequests: optionalTextSchema(500)
});

export default {
  vehicleSchema,
  driverSchema,
  rideDispatchSchema
};
