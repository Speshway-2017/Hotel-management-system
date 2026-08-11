# Feature List
## Hotel Management Software (PMS) — Indian Hospitality Market

**Document Version:** 1.0
**Date:** 2026-08-05

This document lists all features of the platform, grouped by module and mapped to the primary user roles that use them.

---

## 1. Reservation & Booking Engine
- Direct booking engine embedded in hotel's own website (responsive, mobile-friendly)
- Real-time room availability search by date range, room type, occupancy
- Rate display with tax-inclusive/exclusive toggle
- Add-on selection (breakfast, airport transfer, early check-in, late check-out)
- OTA channel manager integration: MakeMyTrip, Goibibo, Booking.com, Agoda (2-way sync)
- Real-time inventory sync across all channels to prevent overbooking/double-booking
- Rate parity monitoring and alerts across direct + OTA channels
- Booking modification and cancellation workflows
- Waitlist management for sold-out dates
- Group/block booking support with multi-room reservation under single booking ID
- Corporate/travel agent negotiated rate plans
- Booking source tagging and commission tracking per OTA
- Advance payment / booking deposit collection at time of reservation

## 2. Front Desk Operations
- Walk-in booking creation
- Guest check-in with ID scan (Aadhaar/Passport/Voter ID/Driving License) and OCR auto-fill
- Digital guest registration card generation
- Room assignment engine (auto-suggest based on type, floor, housekeeping status)
- Manual room reassignment/override
- Real-time room status grid (vacant, occupied, dirty, clean, inspected, out-of-order, blocked)
- Check-out and folio settlement workflow
- Early check-in / late check-out charge automation
- Guest search by name, phone, booking ID, room number
- Multi-property front desk switch (for staff working across branches)
- Offline mode with local caching and background sync for low-connectivity properties

## 3. Housekeeping Management
- Mobile task list app for housekeeping staff
- Room status lifecycle: Dirty → Cleaning → Clean → Inspected
- Task assignment by supervisor (manual or auto-assigned by floor/zone)
- Real-time status sync to front desk room grid
- Linen and amenity inventory tracking with low-stock alerts
- Lost & found logging
- Deep-cleaning / maintenance-flagged room scheduling
- Housekeeping performance tracking (rooms cleaned/day, average turnaround time)

## 4. Room & Rate Management
- Room type configuration (Standard, Deluxe, Suite, etc.) with amenities and images
- Dynamic/demand-based pricing engine
- Seasonal rate calendars (peak season, festival season, off-season)
- Day-of-week and length-of-stay based pricing rules
- Rate plans (refundable, non-refundable, corporate, package/promo rates)
- Room inventory blocking (maintenance holds, owner-use blocks)
- Bulk rate update tools across date ranges and room types

## 5. Billing & Invoicing
- GST-compliant invoice generation (CGST/SGST/IGST breakup, GSTIN, HSN/SAC codes)
- Automated tax-slab mapping based on room tariff
- Master folio per reservation with itemized real-time charge tracking
- Split billing across guests, rooms, or corporate accounts
- Advance/security deposit collection and adjustment against final bill
- Discount and complimentary charge workflows with approval hierarchy
- Credit note / refund invoice generation
- Multi-currency billing display for international guests
- Invoice delivery via Email/WhatsApp/SMS with PDF attachment
- Outstanding dues and accounts receivable tracking (corporate/travel agent credit)

## 6. Payments
- UPI payment collection (QR code / UPI collect request)
- Card payments (debit/credit) via integrated payment gateway
- Digital wallets (Paytm, PhonePe, etc.)
- Net banking support
- Corporate billing / credit account settlement
- Partial payment and installment tracking
- Automatic payment reconciliation with bank/gateway settlement reports
- Refund processing to original payment method

## 7. POS Integration
- In-house restaurant billing integration with guest folio posting
- Bar/lounge POS integration
- Spa/wellness service billing integration
- Laundry service charge posting
- Room service order-to-folio posting
- Unified POS reporting across outlets

## 8. Guest Management (CRM)
- Centralized guest profile with stay history across visits
- Guest preferences tracking (room type, floor, dietary, pillow type, etc.)
- Repeat-guest recognition and personalized offers
- Loyalty program (points accrual, redemption, membership tiers)
- Guest segmentation for targeted marketing (corporate, leisure, family, solo)
- Birthday/anniversary/special-occasion tracking for personalized service
- Blacklist/flag management for problematic guests

## 9. Housekeeping & Maintenance Requests
- Guest-initiated service requests via mobile app (housekeeping, room service, maintenance)
- Maintenance ticketing system with priority levels
- Ticket assignment and status tracking (open, in-progress, resolved)
- Photo/note attachment for issue documentation
- Room out-of-order flagging with automatic inventory exclusion
- Preventive maintenance scheduling (AC servicing, pest control, etc.)
- SLA tracking for issue resolution time

## 10. Staff Management
- Role-based staff accounts (Admin, Manager, Receptionist, Housekeeping, Maintenance, Accountant)
- Shift scheduling and roster management
- Attendance tracking (check-in/out, mobile geo-tagged attendance optional)
- Basic payroll computation (based on attendance/shift data)
- Staff performance metrics (tasks completed, guest ratings tied to service)
- Department-wise staff directory

## 11. Reporting & Analytics
- Occupancy rate dashboard (daily, weekly, monthly, YoY)
- Average Daily Rate (ADR) tracking
- Revenue per Available Room (RevPAR) tracking
- Revenue reports by channel (direct vs. OTA), room type, and outlet (POS)
- GST/tax summary reports for filing periods
- Staff productivity and attendance reports
- Guest demographics and repeat-guest ratio reports
- Cancellation and no-show trend reports
- Custom report builder with export (PDF/Excel/CSV)
- Multi-property comparative dashboards for chain owners

## 12. Channel Manager & Rate Parity
- Two-way integration with MakeMyTrip, Goibibo, Booking.com, Agoda
- Centralized inventory and rate push across all connected OTAs
- Rate parity conflict detection and alerting
- Commission tracking per OTA booking
- Channel performance comparison (bookings, revenue, ADR by channel)
- Stop-sell / close-out controls pushed across channels simultaneously

## 13. Multi-Property / Multi-Branch Support
- Super Admin console for centralized management across properties
- Property-level configuration (rates, taxes, staff) with group-level oversight
- Consolidated multi-property dashboards and reporting
- Cross-property guest profile recognition (loyalty continuity)
- Centralized channel manager and rate management across branches

## 14. Notifications
- SMS booking confirmations and reminders
- WhatsApp Business API integration for confirmations, pre-arrival messages, invoices
- Email confirmations, invoices, and marketing communications
- In-app push notifications for guest app (booking status, offers, service updates)
- Internal staff notifications (task assignments, ticket alerts) via mobile app

## 15. Guest Self-Service
- Mobile pre-check-in with ID upload
- Digital/contactless check-in option
- Optional digital room key (mobile-based, where hardware supports it)
- In-app service requests (housekeeping, room service, maintenance, late checkout)
- Digital folio/invoice access and download
- In-app chat/support with front desk

## 16. Reviews & Feedback
- Post-stay automated feedback request (SMS/WhatsApp/Email)
- In-app rating and review submission
- Review dashboard for management with response workflow
- Integration hooks for publishing/syncing reviews to Google/OTA review pages (future phase)
- Sentiment/trend analysis on recurring feedback themes

## 17. Travel Agent / Corporate Booking Portal
- Dedicated portal login for travel agents and corporate clients
- Negotiated rate plan visibility and booking creation
- Credit billing with defined payment terms
- Booking history and invoice download for agents/corporates
- Commission tracking for travel agent bookings

## 18. Security & Audit Logs
- Role-based access control (RBAC) with granular permissions
- Two-factor authentication (2FA) for admin/manager accounts
- Encrypted storage of guest ID documents and sensitive PII
- Full audit trail: rate changes, discounts, refunds, cancellations, user logins
- Session management and forced logout on suspicious activity
- Data access logs for compliance review

## 19. Multi-Language & Multi-Currency Support
- UI localization: English + major Indian regional languages (Hindi, and others as prioritized)
- Multi-currency rate display and billing for international guests
- Currency conversion using live/periodically updated exchange rates
- Language preference per staff user and per guest-facing booking site visitor
