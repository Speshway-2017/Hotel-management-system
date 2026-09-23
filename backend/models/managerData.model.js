import mongoose from 'mongoose';

// ==========================================
// ROOM MODEL
// ==========================================
const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true },
  category: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Occupied', 'Blocked'], default: 'Available' },
  ratePlan: { type: String, default: 'Standard Plan' },
  baseRate: { type: Number, default: 3500 },
  currentRate: { type: Number, default: 3500 },
  dailyRate: { type: Number, default: 3500 },
  floor: { type: String, default: 'Floor 1' },
  capacity: { type: String, default: '2 Adults' },
  bedType: { type: String, default: 'King Bed' },
  amenities: { type: mongoose.Schema.Types.Mixed },
  description: { type: String, default: '' },
  images: [{ type: String }],
  propertyId: { type: String, required: true }
}, { timestamps: true });

// Ensure unique index per property
roomSchema.index({ roomNumber: 1, propertyId: 1 }, { unique: true });

export const Room = mongoose.models.Room || mongoose.model('Room', roomSchema);

// ==========================================
// STAFF SHIFT ROSTER MODEL
// ==========================================
const shiftSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  shiftType: { type: String, default: 'Off' }, // Morning, Evening, Night, Off
  propertyId: { type: String, required: true }
}, { timestamps: true });

shiftSchema.index({ propertyId: 1 });
export const Shift = mongoose.models.Shift || mongoose.model('Shift', shiftSchema);

// ==========================================
// ATTENDANCE LOG MODEL
// ==========================================
const attendanceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkIn: { type: String, default: '--:--' },
  checkOut: { type: String, default: '--:--' },
  workingHours: { type: Number, default: 0 },
  status: { type: String, enum: ['Present', 'Absent', 'Late', 'Half Day', 'On Leave'], default: 'Absent' },
  propertyId: { type: String, required: true }
}, { timestamps: true });

attendanceSchema.index({ propertyId: 1, date: -1 });
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

// ==========================================
// APPROVAL REQUEST MODEL
// ==========================================
const approvalSchema = new mongoose.Schema({
  id: { type: String },
  category: { type: String, required: true },
  requestedBy: { type: String, required: true },
  guest: { type: String, default: '' },
  bookingId: { type: String, default: '' },
  room: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  value: { type: String, default: '' },
  reason: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  propertyId: { type: String, required: true },
  decisionReason: { type: String, default: '' },
  decidedBy: { type: String, default: '' },
  decidedAt: { type: Date, default: null }
}, { timestamps: true });

approvalSchema.index({ propertyId: 1, status: 1 });
export const Approval = mongoose.models.Approval || mongoose.model('Approval', approvalSchema);

// ==========================================
// GUEST FEEDBACK / REVIEWS MODEL
// ==========================================
const feedbackSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  guestName: { type: String, required: true },
  guestEmail: { type: String, default: '' },
  guestPhone: { type: String, default: '' },
  userId: { type: String, default: null },
  room: { type: String, default: '' },
  roomType: { type: String, default: '' },
  rating: { type: Number, default: 5 },
  ratings: {
    cleanliness: { type: Number, default: 5 },
    service: { type: Number, default: 5 },
    room: { type: Number, default: 5 },
    food: { type: Number, default: 5 },
    overall: { type: Number, default: 5 }
  },
  category: { type: String, default: 'General' },
  sentiment: { type: String, default: 'Positive' },
  status: { type: String, default: 'Published' }, // Published, Pending, Resolved, Archived
  comment: { type: String, default: '' },
  comments: { type: String, default: '' },
  response: { type: String, default: '' },
  respondedBy: { type: String, default: '' },
  respondedAt: { type: Date, default: null },
  propertyId: { type: String, required: true, default: 'HS-JAI' },
  propertyName: { type: String, default: 'Hour Stay Resort' }
}, { timestamps: true });

feedbackSchema.index({ propertyId: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, createdAt: -1 });
export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);

// ==========================================
// MANAGER NOTIFICATIONS MODEL
// ==========================================
const managerNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  category: { type: String, default: 'General' },
  isRead: { type: Boolean, default: false },
  propertyId: { type: String, required: true }
}, { timestamps: true });

managerNotificationSchema.index({ propertyId: 1, isRead: 1 });
export const ManagerNotification = mongoose.models.ManagerNotification || mongoose.model('ManagerNotification', managerNotificationSchema);
export const ReceptionistNotification = mongoose.models.ReceptionistNotification || mongoose.model('ReceptionistNotification', managerNotificationSchema);

// ==========================================
// PAYMENTS MODEL
// ==========================================
const paymentSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  guestName: { type: String, required: true },
  roomNumber: { type: String, default: '101' },
  amount: { type: Number, required: true },
  originalAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  couponCode: { type: String, default: null },
  paidAmount: { type: Number, default: 0 },
  paymentMethod: { type: String, default: 'UPI' },
  status: { type: String, default: 'Settled' }, // Settled, Refunded, Pending
  propertyId: { type: String, required: true }
}, { timestamps: true, strict: false });

paymentSchema.index({ propertyId: 1, createdAt: -1 });
export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

// ==========================================
// CONTACT / INQUIRY MESSAGES MODEL
// ==========================================
const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  propertyId: { type: String, default: 'HS-9HQ8P' },
  status: { type: String, enum: ['New', 'In Progress', 'Resolved', 'Read', 'Replied'], default: 'New' },
  replyMessage: { type: String, default: '' },
  repliedAt: { type: Date }
}, { timestamps: true });

export const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema);
