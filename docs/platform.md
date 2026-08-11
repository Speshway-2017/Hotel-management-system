# Platform & Roles Document
## Hotel Management Software (PMS) — Indian Hospitality Market

**Document Version:** 1.0
**Date:** 2026-08-05

---

## 1. Purpose

This document defines all user roles in the system, their purpose and permission scope, and the target platform(s)/devices each role is expected to use in real-world hotel operations.

## 2. Roles

### 2.1 Super Admin (Multi-Property)
**Purpose:** For hotel groups/chains operating multiple properties. Has visibility and control across all properties from a single account.
**Permissions:** Create/manage properties, assign property-level admins, view consolidated reports, configure group-wide policies (branding, loyalty program, channel manager master settings), manage billing/subscription for the group.

### 2.2 Admin / Owner (Single Property)
**Purpose:** Owns or manages a single property end-to-end. Primary decision-maker on pricing, staff, and policy.
**Permissions:** Full access to property configuration (rooms, rates, taxes), staff account management, financial reports, approval authority for discounts/refunds beyond manager threshold, OTA channel manager setup.

### 2.3 Manager
**Purpose:** Day-to-day operational oversight delegated by the owner. Bridges front-line staff and ownership.
**Permissions:** View dashboards and reports, approve discounts/refunds within limits, manage staff shifts, respond to guest complaints, override room assignments, access most modules except sensitive financial/subscription settings.

### 2.4 Receptionist / Front Desk
**Purpose:** Executes reservations, check-in/out, and billing at the property.
**Permissions:** Create/modify reservations, check-in/out guests, ID capture, assign rooms, generate and settle folios/invoices, apply configured charges (early check-in/late checkout), raise maintenance tickets. No access to rate configuration or staff management.

### 2.5 Housekeeping Staff
**Purpose:** Maintains room readiness and cleanliness per assigned tasks.
**Permissions:** View assigned task list, update room status (dirty/cleaning/clean/inspected), report inventory shortages, flag maintenance issues. No access to billing, reservations, or guest financial data.

### 2.6 Maintenance Staff
**Purpose:** Resolves technical/facility issues reported for rooms or common areas.
**Permissions:** View/accept assigned tickets, update ticket status with notes/photos, mark rooms out-of-order/back-in-service. No access to reservations or billing.

### 2.7 Accountant
**Purpose:** Manages financial records, GST compliance, and reconciliation.
**Permissions:** View/export all invoices and payment records, generate GST/tax reports, manage corporate/travel-agent outstanding dues, reconcile payment gateway settlements. Typically read-only on reservations, no room/rate configuration access.

### 2.8 Guest / Customer
**Purpose:** End consumer booking and staying at the property.
**Permissions:** Search and book rooms, make payments, complete pre-check-in, raise service requests during stay, view/download own invoices, submit reviews. Access limited strictly to own booking/profile data.

### 2.9 Travel Agent / Corporate User (Portal Access)
**Purpose:** External partner booking on behalf of clients or employees under negotiated terms.
**Permissions:** View negotiated rates, create bookings under agreed credit terms, view own booking history and invoices. No access to internal hotel operations data.

## 3. Platform Targets by Role

| Role | Platform(s) | Primary Device |
|------|-------------|-----------------|
| Super Admin | Web dashboard + Mobile app | Desktop/Laptop (primary), Mobile for on-the-go monitoring |
| Admin / Owner | Web dashboard + Mobile app | Desktop/Laptop (primary), Mobile for monitoring & approvals |
| Manager | Web dashboard + Mobile app | Mobile (frequent, for reports/approvals on the go), Desktop for detailed reporting |
| Receptionist / Front Desk | Web / Tablet (PMS front desk console) | Tablet or desktop at front desk counter |
| Housekeeping Staff | Mobile app (Android, task-list style) | Android smartphone |
| Maintenance Staff | Mobile app (Android, task-list style) | Android smartphone |
| Accountant | Web dashboard | Desktop/Laptop |
| Guest / Customer | Mobile app + Responsive booking website | Smartphone (primary), Desktop/Laptop for website booking |
| Travel Agent / Corporate | Web portal (responsive) | Desktop/Laptop, occasionally mobile browser |

## 4. Platform Design Rationale

- **Admin/Owner & Manager (Web + Mobile):** These roles need deep reporting and configuration (best on web/desktop) but also require real-time visibility while away from the property (mobile app for KPIs, approvals, alerts).
- **Receptionist (Web/Tablet console):** Front desk work happens at a fixed counter station; a tablet or desktop browser-based console balances screen real estate (for room grids, folios) with touch-friendly speed for high-volume, repetitive tasks (check-in/out).
- **Housekeeping & Maintenance (Mobile-only, Android-first):** These staff are mobile throughout the property and need a lightweight, task-list-style app optimized for quick status updates — Android is prioritized given its dominant market share among frontline/blue-collar workers in India.
- **Guest (Mobile app + Responsive website):** Guests discover and book primarily via mobile browsers/apps; a responsive website ensures broad reach (including desktop users, corporate travel bookers) while the native app supports self-service during stay (push notifications, service requests, digital folio).
- **Accountant (Web-only):** Financial reconciliation and report generation are desk-based, detail-heavy tasks better suited to larger screens; mobile access is not a priority for this role.
- **Travel Agent/Corporate (Web portal):** External partners typically manage bookings from office environments; a responsive web portal (no native app required) keeps onboarding friction low.

## 5. Access Control Summary

| Role | Can Configure Rates/Rooms | Can Manage Staff | Can Approve Refunds/Discounts | Can View Financial Reports | Can Update Room Status |
|------|:---:|:---:|:---:|:---:|:---:|
| Super Admin | Yes (all properties) | Yes (all properties) | Yes | Yes (all properties) | No (operational, delegated) |
| Admin/Owner | Yes | Yes | Yes | Yes | No (operational, delegated) |
| Manager | Limited (seasonal/promo rates) | Limited (shifts/attendance) | Yes (within threshold) | Yes | No |
| Receptionist | No | No | No (raises requests only) | No | No (views only) |
| Housekeeping | No | No | No | No | Yes |
| Maintenance | No | No | No | No | Yes (out-of-order status only) |
| Accountant | No | No | No | Yes | No |
| Guest | No | No | No | No (own invoice only) | No |
| Travel Agent/Corporate | No | No | No | No (own bookings only) | No |
