# Product Requirements Document (PRD)
## Hotel Management Software (PMS) — Indian Hospitality Market

**Document Version:** 1.0
**Date:** 2026-08-05

---

## 1. Product Overview

The product is a cloud-based Hotel Management Software (Property Management System) tailored for Indian hotels, resorts, and lodges — spanning independent budget properties to multi-branch chains. It unifies reservations (direct + OTA), front desk operations, housekeeping, billing/GST invoicing, payments (UPI-first), guest CRM, staff management, and reporting, accessible via a web admin dashboard, tablet-based front-desk console, and mobile apps for guests, housekeeping, and managers.

**Core Value Proposition:** One platform to run daily hotel operations, maximize direct bookings, stay OTA-synced, and remain fully GST-compliant — built for how Indian hotels actually operate.

## 2. Personas

### 2.1 Hotel Owner / Admin
Owns the property/business. Wants visibility into revenue, occupancy, and staff performance without being on-site daily. Cares about ROI, compliance, and brand control.

### 2.2 Front Desk / Receptionist
Handles walk-ins, reservations, check-in/out, billing, and guest queries. Needs a fast, error-free, keyboard/touch-friendly interface usable during peak rush hours.

### 2.3 Housekeeping Staff
Cleans and prepares rooms. Needs a simple mobile task list showing assigned rooms, status updates (dirty → cleaning → clean → inspected), and inventory alerts.

### 2.4 Manager
Oversees daily operations across departments, approves discounts/refunds, monitors KPIs, and manages staff schedules. Often mobile, checking dashboards remotely.

### 2.5 Guest / Customer
Books rooms directly or via OTA, checks in/out, requests services, and pays bills. Wants a smooth, low-friction, trustworthy experience.

### 2.6 Accountant
Manages invoicing, tax reports, reconciliation with payment gateways/OTAs, and exports data for GST filing and CA review.

### 2.7 Maintenance Staff
Resolves reported issues (AC not working, plumbing, electrical) via ticketed work orders, updates status, and logs resolution time.

## 3. Functional Requirements by Role

### 3.1 Admin / Owner
- FR-A1: View consolidated dashboard (occupancy %, revenue, ADR, RevPAR) across single or multiple properties.
- FR-A2: Configure room types, rate plans, seasonal pricing, and tax slabs.
- FR-A3: Manage staff accounts, roles, and permissions (RBAC).
- FR-A4: Approve/reject discount and refund requests above manager-defined thresholds.
- FR-A5: Access audit logs of all critical actions (rate changes, refunds, cancellations).
- FR-A6: Configure OTA channel manager connections and monitor rate parity.
- FR-A7: Export financial and statutory reports (GST summary, occupancy reports).

### 3.2 Receptionist / Front Desk
- FR-R1: Search and create new reservations (walk-in, phone, direct web, OTA-synced).
- FR-R2: Check guest in — capture/scan ID document (Aadhaar/Passport/DL), assign room, generate registration card.
- FR-R3: Check guest out — generate final folio, settle payment, close room for housekeeping.
- FR-R4: View real-time room status grid (vacant/occupied/dirty/clean/inspected/out-of-order).
- FR-R5: Apply early check-in / late check-out charges as configured.
- FR-R6: Split billing across multiple guests/rooms or corporate account.
- FR-R7: Add POS charges (restaurant, laundry, minibar) to guest folio.
- FR-R8: Process cancellations and refunds per configured policy.
- FR-R9: Handle overbooking scenarios with waitlist/alternate-room suggestions.

### 3.3 Housekeeping Staff
- FR-H1: View assigned room cleaning task list on mobile app.
- FR-H2: Update room status (dirty → in-progress → clean → inspected).
- FR-H3: Report low linen/amenity inventory.
- FR-H4: Flag maintenance issues found during cleaning directly to maintenance queue.

### 3.4 Manager
- FR-M1: View real-time occupancy, revenue, and staff attendance dashboards on mobile/web.
- FR-M2: Approve discounts, refunds, and complimentary upgrades.
- FR-M3: Assign/reassign staff shifts.
- FR-M4: Review and respond to guest complaints/feedback.
- FR-M5: Generate and export daily/weekly/monthly performance reports.

### 3.5 Guest / Customer
- FR-G1: Search room availability and book directly via responsive website or mobile app.
- FR-G2: Complete booking with UPI/card/wallet payment and receive confirmation via SMS/WhatsApp/Email.
- FR-G3: Optionally complete mobile pre-check-in with ID upload before arrival.
- FR-G4: Raise in-stay service requests (housekeeping, maintenance, room service) via app.
- FR-G5: View and download GST-compliant invoice/folio.
- FR-G6: Submit review/feedback post-stay.
- FR-G7: Access loyalty points/repeat-guest benefits if enrolled.

### 3.6 Accountant
- FR-AC1: View and reconcile all payment transactions (UPI, card, OTA-settled, corporate credit).
- FR-AC2: Generate GST invoices with CGST/SGST/IGST breakup and HSN/SAC codes.
- FR-AC3: Export tax reports for GST filing periods.
- FR-AC4: Manage corporate/travel-agent billing and outstanding dues.

### 3.7 Maintenance Staff
- FR-MT1: Receive maintenance tickets (from front desk, housekeeping, or guest self-service).
- FR-MT2: Update ticket status (open → in-progress → resolved) with notes/photos.
- FR-MT3: Mark room out-of-order/back-in-service, syncing with room availability.

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Front desk actions (check-in/out, room search) must respond within 2 seconds under normal load. |
| Scalability | Must support single-property (10–20 rooms) up to multi-branch chains (500+ rooms across properties) without architecture change. |
| Security | Role-based access control, encrypted storage of guest ID documents, TLS for all data in transit, audit logging of sensitive actions. |
| Availability | 99.5% uptime SLA for cloud services; offline-capable front desk mode for connectivity outages with background sync. |
| Data Privacy | Guest ID documents and PII stored encrypted at rest; access restricted to authorized roles; compliant with IT Act 2000 and India's Digital Personal Data Protection (DPDP) Act. |
| Localization | Multi-language UI (English + major Indian regional languages) and multi-currency display for international guests. |
| Auditability | All rate changes, discounts, refunds, and cancellations logged with user, timestamp, and reason. |
| Interoperability | REST APIs for OTA channel manager, payment gateway, and accounting software (Tally/Zoho Books) integration. |
| Mobile Responsiveness | Guest booking site and apps must be fully responsive/native across common Android/iOS device sizes. |

## 5. User Flows

### 5.1 Guest Booking — Direct Channel
1. Guest visits hotel's booking website or app.
2. Guest selects check-in/check-out dates and number of guests.
3. System displays available room types with live rates (including applicable taxes).
4. Guest selects room type and add-ons (breakfast, airport pickup, etc.).
5. Guest enters personal details and (optionally) pre-uploads ID document.
6. Guest selects payment method (UPI/card/wallet) and pays advance/full amount.
7. System confirms booking, generates booking ID, and sends confirmation via SMS/WhatsApp/Email.
8. Reservation appears in front desk system and is synced to room inventory (blocking availability across other channels).

### 5.2 Guest Booking — OTA Channel (MakeMyTrip/Goibibo/Booking.com)
1. Guest books room on OTA platform.
2. OTA sends booking notification via channel manager API/XML feed.
3. System's channel manager module ingests booking and creates reservation record.
4. System auto-updates room inventory across all connected channels to prevent overbooking.
5. Front desk receives reservation in the system dashboard, tagged with OTA source.
6. Guest arrival triggers standard check-in flow; OTA commission is tracked against the booking for reconciliation.

### 5.3 Check-in / Check-out
1. Receptionist searches reservation by guest name/booking ID/phone number.
2. Receptionist verifies guest identity — scans ID document (OCR auto-fills name/DOB/address).
3. System validates ID against booking details; flags mismatches for manual review.
4. Receptionist assigns/confirms room number based on housekeeping status (must be "Clean/Inspected").
5. Receptionist collects any pending advance payment or security deposit.
6. System generates digital registration card/guest folio; room status changes to "Occupied."
7. At checkout, receptionist reviews folio (room charges + POS charges + taxes).
8. Guest settles final payment (or corporate billing is invoiced).
9. System generates GST-compliant invoice, closes folio, and marks room status as "Dirty" for housekeeping.
10. Guest receives invoice copy via email/WhatsApp; feedback request is triggered post-checkout.

### 5.4 Room Assignment & Housekeeping Status Sync
1. Reservation is confirmed; system suggests available room based on room type, floor preference, and housekeeping readiness.
2. Front desk confirms room assignment (manual override allowed).
3. On checkout, room status auto-flips to "Dirty" in real time (via WebSocket/real-time sync).
4. Housekeeping supervisor assigns cleaning task to staff via mobile app.
5. Housekeeping staff updates status: Dirty → Cleaning → Clean.
6. Supervisor/inspector marks room "Inspected," making it available for new check-in.
7. Front desk room-status grid reflects changes instantly across all connected devices.

### 5.5 Billing & Folio
1. System creates a master folio at check-in, linked to reservation.
2. All charges during stay (room, POS — restaurant/spa/laundry, service fees) are appended to folio in real time.
3. Receptionist/guest can view running folio balance at any time.
4. At checkout, system calculates applicable GST per room tariff slab and generates itemized invoice.
5. Folio can be split across multiple guests or billed to a corporate account/travel agent.
6. Payment is recorded against folio; partial payments and outstanding balances are tracked.
7. Invoice is archived and available for accountant reconciliation and reporting.

### 5.6 Complaint / Maintenance Request
1. Issue is reported by guest (via app), housekeeping staff, or front desk on guest's behalf.
2. System creates a maintenance ticket with room number, issue category, and priority.
3. Ticket is auto-assigned or manually assigned to maintenance staff.
4. Maintenance staff updates ticket status and adds resolution notes/photos.
5. On resolution, ticket is closed; guest (if reporter) receives a resolution notification.
6. If issue requires room to be taken out of service, room status is set to "Out of Order" and excluded from availability until resolved.

## 6. Edge Cases

| Scenario | Handling |
|----------|----------|
| **Overbooking** | System maintains buffer/waitlist logic; if room unavailable at check-in, front desk can offer upgrade, alternate property (multi-property), or compensation per policy; all overbooking instances logged for review. |
| **No-show** | Reservation auto-flagged as "No-show" after configurable grace period past check-in date; no-show charge (per policy) applied to advance payment; room released back to inventory. |
| **Early check-in** | If room is ready, early check-in allowed with configurable surcharge; if not ready, guest is queued with baggage storage option noted. |
| **Late check-out** | System calculates late fee based on configured slabs (e.g., grace period, half-day charge, full-day charge) and adds to folio automatically. |
| **Group bookings** | Support booking multiple rooms under one reservation/group ID with a single or split billing option; group-level rate negotiation supported. |
| **Room upgrade/downgrade** | Front desk can modify room type mid-stay; system recalculates pro-rated charges and updates folio and room-status records accordingly. |
| **Cancellation & refund** | Configurable cancellation policy (free cancellation window, partial/full penalty slabs); refund processed to original payment method or as credit; audit-logged with reason. |
| **Partial payments/outstanding dues** | System tracks partial settlements against folio and flags outstanding balance at checkout, escalated to manager if unresolved. |
| **OTA rate mismatch** | Channel manager flags parity conflicts between direct and OTA rates for admin review. |
| **Foreign national guest** | Additional ID fields (passport/visa) captured; system supports generating Form C data export for FRRO reporting where applicable. |
