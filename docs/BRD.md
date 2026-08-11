# Business Requirements Document (BRD)
## Hotel Management Software — Indian Hospitality Market

**Document Version:** 1.0
**Date:** 2026-08-05
**Status:** Draft for Stakeholder Review

---

## 1. Executive Summary

This document defines the business requirements for a full-scale Hotel Management Software (Property Management System, "PMS") designed specifically for the Indian hospitality market — independent hotels, resorts, lodges, and boutique/heritage properties, as well as small multi-property chains. The system will digitize and unify front-desk operations, reservations, billing, housekeeping, guest relationships, and OTA (Online Travel Agency) distribution, while natively complying with Indian regulatory and tax requirements (GST invoicing, guest ID verification norms) and Indian payment preferences (UPI-first).

## 2. Business Objectives

| # | Objective | Description |
|---|-----------|-------------|
| 1 | Digitize operations | Replace manual registers/Excel-based front desk and billing with a unified digital PMS. |
| 2 | Increase direct bookings | Reduce OTA commission dependency (typically 15–25% per booking) via a branded booking engine. |
| 3 | GST & statutory compliance | Automate GST-compliant invoicing, tax slabs by room tariff, and statutory guest registers. |
| 4 | Improve RevPAR/ADR | Enable dynamic pricing and channel parity to maximize Revenue per Available Room and Average Daily Rate. |
| 5 | Operational efficiency | Real-time sync between front desk, housekeeping, and maintenance to cut room-turnaround time. |
| 6 | Guest experience | Faster check-in/out, digital ID verification, self-service options, and personalized service via CRM. |
| 7 | Multi-property scalability | Support single-property lodges up to multi-branch hotel groups from one platform. |
| 8 | Data-driven decisions | Provide owners/managers real-time dashboards and analytics for occupancy, revenue, and staff performance. |

## 3. Stakeholders

| Stakeholder | Interest / Role |
|-------------|------------------|
| Hotel Owner / Promoter | ROI, revenue growth, brand control, compliance, reduced OTA commission leakage |
| General Manager / Hotel Manager | Operational oversight, staff performance, reporting, guest satisfaction |
| Front Desk / Receptionist | Fast check-in/out, accurate billing, ID verification, room assignment |
| Housekeeping Supervisor & Staff | Room status updates, task assignment, linen/inventory tracking |
| Maintenance/Engineering Staff | Complaint ticketing, work order tracking |
| Accountant / Finance Team | GST-compliant invoicing, reconciliation, reporting to auditors/CA |
| Guests (Domestic & International) | Easy booking, transparent pricing, fast service, secure data handling |
| Travel Agents / Corporate Clients | Bulk/negotiated bookings, credit billing, reporting |
| OTA Partners (MakeMyTrip, Goibibo, Booking.com, Agoda) | Channel/rate/inventory sync via channel manager |
| Regulatory Bodies | Compliance with GST law, Foreigner Registration (C-Form), local police verification norms where applicable |
| Software Vendor / Implementation Team | Delivery, support, SLAs |

## 4. Scope

### 4.1 In-Scope
- Reservation management (direct website + OTA channel manager integration)
- Front desk operations: check-in, check-out, walk-ins, room assignment
- Guest ID capture & verification (Aadhaar/Passport/Driving License scan with OCR)
- Housekeeping management (room status, task assignment, inventory)
- Room & rate management including seasonal/dynamic pricing
- GST-compliant billing, invoicing, and folio management
- Payment collection (UPI, cards, net banking, wallets, corporate billing)
- POS integration for in-house restaurant, bar, spa, laundry
- Guest CRM, preferences, loyalty program
- Staff management: shifts, attendance, roles, basic payroll
- Reporting & analytics: occupancy, ADR, RevPAR, revenue, tax reports
- Multi-property/multi-branch support with centralized Super Admin
- SMS/WhatsApp/Email notifications
- Guest self-service (mobile check-in, service requests, digital key optional)
- Reviews & feedback capture
- Travel agent/corporate booking portal
- Multi-language (regional Indian languages + English) and multi-currency support
- Security, audit logs, and role-based access control

### 4.2 Out-of-Scope (Phase 1)
- Full-fledged accounting/ERP (Tally/Zoho Books integration only, not replacement)
- Full HR/payroll suite (statutory PF/ESI filing) — only basic attendance & shift tracking
- IoT-based smart room automation (lighting, HVAC control) — future phase
- In-house restaurant kitchen order/inventory management beyond POS billing hooks
- Physical hardware (door lock devices, biometric devices) procurement — software integration only
- Global Distribution System (GDS) integration for airline-linked bookings — future phase

## 5. Assumptions

1. Hotels have (or will procure) stable internet connectivity for cloud-based PMS access; an offline-fallback mode is desirable for front desk.
2. Staff have basic digital literacy or will be trained during onboarding.
3. OTA partners provide API/channel manager access (MakeMyTrip Connect, Goibibo, Booking.com XML/API, Agoda YCS).
4. Guests are willing to share ID documents digitally as per government norms.
5. Hotels possess a valid GSTIN where applicable (mandatory above threshold turnover).
6. Payment gateway (e.g., Razorpay) accounts will be set up by each property for settlement.
7. Properties operate under India's hotel classification norms (star category) but the system supports non-classified/budget properties too.

## 6. Constraints

| Constraint | Detail |
|------------|--------|
| Regulatory | Must comply with GST Act invoicing rules, IT Act data protection norms, and (where applicable) Foreigners Act registration (Form C) for foreign nationals. |
| Data Residency | Guest PII (ID documents) should ideally be hosted on servers within India or compliant cloud regions. |
| Budget | Solution must remain affordable for small/mid-size independent hotels (SaaS pricing model expected). |
| Connectivity | Many lodges/resorts operate in low-bandwidth regions (hill stations, rural tourist belts) — needs lightweight UI and offline resilience. |
| OTA API limits | Rate-limits and data-sync latency imposed by third-party OTA APIs are outside project control. |
| Timeline | Phase 1 (Core PMS + Billing + Basic OTA sync) targeted within 6 months; subsequent modules phased. |

## 7. Success Metrics (KPIs)

| KPI | Target |
|-----|--------|
| Reduction in check-in time | From ~8–10 min (manual) to under 3 min |
| Increase in direct bookings | 20% increase within 12 months of go-live |
| OTA commission savings | 5–10% reduction in effective commission cost via rate parity & direct channel push |
| Billing error rate | Less than 0.5% invoice correction rate |
| Room turnaround time (housekeeping) | Reduced by 30% via real-time status sync |
| System uptime | 99.5% or higher |
| GST invoice compliance | 100% invoices auto-generated with correct tax slab |
| Guest satisfaction (via feedback module) | Average rating improvement of 0.5+ stars within 6 months |
| Staff adoption rate | 90%+ active daily usage by front office & housekeeping within 60 days of rollout |

## 8. Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low staff digital literacy leading to poor adoption | Medium-High | Simple UI, regional language support, on-site training, video tutorials |
| OTA API changes/downtime breaking channel sync | Medium | Build resilient channel manager with retry/reconciliation logic and manual override |
| Internet connectivity issues at property | High | Offline-capable front desk module with local caching and background sync |
| Data breach of guest ID documents | High | Encryption at rest/in transit, access controls, compliance with IT Act & upcoming DPDP Act 2023 |
| Resistance from owners fearing loss of OTA relationships | Medium | Position system as complementary to OTAs, not a replacement — parity-based coexistence |
| Seasonal revenue variability affecting SaaS payment continuity | Medium | Flexible/tiered pricing plans, seasonal discount options |
| Incorrect GST slab application (tariff-based tax rates) | High | Automated tax engine mapped to current GST hotel tariff slabs, configurable by admin |

## 9. ROI Rationale

- **Commission Savings:** OTAs typically charge 15–25% commission per booking. Even a 15–20% shift of bookings from OTA to direct channel (via the branded booking engine) can yield significant margin recovery for a mid-size hotel (e.g., a 50-room hotel with 70% occupancy could save several lakhs INR annually).
- **Operational Cost Reduction:** Digitizing housekeeping and front-desk workflows reduces manual coordination overhead (phone calls, physical registers), enabling leaner staffing per shift.
- **Revenue Uplift via Dynamic Pricing:** Seasonal and demand-based rate management typically improves ADR by 5–15% compared to static pricing.
- **Reduced Revenue Leakage:** Centralized billing with audit trails minimizes under-billing, missed charges (minibar, laundry, late checkout), and cash-handling discrepancies.
- **Compliance Cost Avoidance:** Automated GST-compliant invoicing reduces risk of penalties from incorrect tax filing and simplifies CA/auditor reconciliation.
- **Guest Retention & Loyalty:** CRM-driven repeat-guest recognition and loyalty programs increase repeat bookings, which carry near-zero acquisition cost compared to OTA-sourced bookings.
- **Multi-Property Scalability:** For hotel groups, a single platform reduces per-property software licensing and training costs versus disparate systems.

## 10. Indian Market–Specific Considerations

- **GST Invoicing:** Room tariff-based GST slabs (as per prevailing government rate structure) must be configurable and auto-applied; invoices must include GSTIN, HSN/SAC codes, and CGST/SGST/IGST breakup as applicable.
- **UPI Payments:** UPI is the dominant payment mode in India (P2M transactions); the system must support UPI QR/collect requests as a first-class payment method, alongside cards and wallets.
- **ID Verification:** Front desk must support Aadhaar, Passport, Voter ID, Driving License capture with OCR-assisted data entry, and where mandated, digital storage/reporting compliant with local police/FRRO (Foreigners Regional Registration Office) norms for foreign nationals (Form C).
- **Star-Category Considerations:** Star-classified hotels (as per Ministry of Tourism / hotel classification norms) may have additional statutory reporting and service-standard requirements (e.g., mandatory guest register formats) — the system should offer configurable compliance templates for classified vs. non-classified/budget properties.
- **OTA Dependency:** Indian hotels, especially budget and mid-scale segments, derive a significant share of bookings from MakeMyTrip, Goibibo, and Booking.com. Channel manager integration and rate-parity monitoring are business-critical, not optional.
- **Regional Language Support:** Staff in tier-2/tier-3 city properties may be more comfortable in Hindi or regional languages; UI localization improves adoption.
