# Technology Stack Document
## Hotel Management Software (PMS) — MERN + Flutter

**Document Version:** 1.0
**Date:** 2026-08-05

---

## 1. Architecture Overview

The platform follows a layered, service-oriented architecture: a React.js web admin/front-desk dashboard, Flutter-based mobile apps for guests/housekeeping/managers, a Node.js/Express REST API backend, MongoDB as the primary datastore with Redis for caching and real-time state, and Socket.io for live updates (e.g., room status). Third-party integrations (payments, OTA channel manager, notifications, OCR) are isolated behind dedicated service modules for maintainability.

## 2. Architecture Layer Table

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Web Frontend (Admin/PMS Dashboard) | React.js, Redux Toolkit, TailwindCSS / MUI | React offers component reusability across complex dashboards (room grid, folio, reports); Redux Toolkit simplifies state management for real-time room-status and reservation data; Tailwind/MUI accelerates building a polished, consistent, responsive UI. |
| Backend API | Node.js, Express.js | JavaScript across the stack (MERN) reduces context-switching for the dev team; Express provides a lightweight, well-understood framework for REST API development with a large integration ecosystem (payment SDKs, OTA connectors). |
| Primary Database | MongoDB, Mongoose | Flexible schema suits varied hotel data models (room types, dynamic rate plans, guest profiles with evolving fields) and supports horizontal scaling for multi-property growth; Mongoose provides schema validation and modeling discipline. |
| Caching / Session / Real-time State | Redis | Low-latency caching for room availability lookups, session/token storage, and pub/sub backbone for real-time room-status broadcast to connected clients. |
| Mobile Apps (Guest, Housekeeping, Manager) | Flutter | Single codebase for Android + iOS reduces development and maintenance cost; strong performance for task-list-style housekeeping app and guest-facing booking/self-service app. |
| Real-time Communication | Socket.io | Enables instant room-status sync (housekeeping update → front desk grid), live notifications, and ticket status updates across web and mobile clients. |
| Payments | Razorpay (UPI/Cards/Netbanking/Wallets) | Razorpay offers native UPI support (dominant payment mode in India), broad card/wallet coverage, and strong developer SDKs for web and Flutter integration. |
| Channel Manager / OTA Integration | Third-party channel manager APIs (MakeMyTrip Connect, Goibibo, Booking.com XML/API, Agoda YCS) via a dedicated integration microservice | Isolating OTA integrations behind an internal service abstracts differing API formats (XML/REST) and centralizes rate-parity and inventory-sync logic. |
| Push Notifications | Firebase Cloud Messaging (FCM) | Reliable, free-tier-friendly push notification delivery to Flutter apps across Android/iOS. |
| SMS / WhatsApp Notifications | Twilio / WhatsApp Business API | Twilio provides reliable SMS delivery in India; WhatsApp Business API is critical given WhatsApp's dominance as a communication channel for Indian guests (booking confirmations, invoices). |
| Email Notifications | SendGrid | Reliable transactional email delivery for confirmations, invoices, and marketing communications with good deliverability tracking. |
| Document/ID OCR | AWS Textract (or equivalent OCR service) | Automates data extraction from Aadhaar/Passport/Driving License scans during check-in, reducing manual entry errors and speeding up front-desk workflow. |
| File Storage | AWS S3 / Cloudinary (with server-side encryption) | Scalable, durable storage for room images, guest ID document scans, and generated invoice PDFs; encryption addresses PII protection requirements. |
| Reporting & Visualization | Recharts / Chart.js (frontend), pdfkit (server-side PDF generation) | Recharts/Chart.js render occupancy, ADR, and RevPAR dashboards natively in React; pdfkit generates GST-compliant invoice and report PDFs server-side for consistency. |
| Authentication & Authorization | JWT (access + refresh tokens), RBAC, 2FA (TOTP-based) for Admin/Manager | JWT enables stateless, scalable auth across web/mobile clients; refresh-token rotation improves session security; RBAC enforces role-based module access; 2FA adds a security layer for high-privilege accounts. |
| API Architecture | REST (versioned, e.g., `/api/v1/...`) | REST remains simple, well-understood, and broadly compatible with third-party integrations (payment gateways, OTA APIs); versioning allows safe evolution without breaking existing mobile app clients. |
| Infrastructure / Hosting | AWS or GCP (EC2/Compute Engine, managed MongoDB Atlas, S3/Cloud Storage) | Mature cloud ecosystems with data centers in India (Mumbai region on AWS, Mumbai/Delhi on GCP) support data residency preferences and low-latency access for Indian users. |
| Containerization / Web Server | Docker, Nginx | Docker ensures consistent deployment across environments; Nginx serves as reverse proxy/load balancer and handles TLS termination and static asset delivery. |
| CI/CD | GitHub Actions | Automates build, test, and deployment pipelines for backend, frontend, and mobile app releases directly from the GitHub repository. |

## 3. Detailed Component Notes

### 3.1 Frontend Web (Admin/PMS Dashboard)
- **React.js** with functional components and hooks.
- **Redux Toolkit** for global state: active reservations, room-status grid, current folio session.
- **TailwindCSS** for utility-first styling and rapid iteration, or **MUI** where a structured component library (data tables, modals, date pickers) accelerates complex dashboard screens.
- Real-time room-status grid subscribes to Socket.io events for instant updates without polling.

### 3.2 Backend (Node.js / Express.js)
- Modular service structure: `reservations`, `billing`, `housekeeping`, `channel-manager`, `payments`, `notifications`, `auth`, `reporting`.
- Middleware layers for RBAC enforcement, request validation, and audit logging.
- Background job queue (e.g., Bull with Redis) for async tasks: OTA sync retries, scheduled report generation, notification dispatch.

### 3.3 Database (MongoDB + Mongoose)
- Core collections: `properties`, `rooms`, `rateplans`, `reservations`, `folios`, `guests`, `staff`, `housekeepingtasks`, `maintenancetickets`, `invoices`, `payments`, `auditlogs`.
- Mongoose schemas enforce structure while allowing flexible fields for property-specific configuration (e.g., custom room amenities).
- Compound indexes on `propertyId + date` fields for fast availability queries.

### 3.4 Redis
- Caches frequently queried data: room availability by date range, active rate plans.
- Stores session/refresh-token metadata for fast auth checks.
- Acts as pub/sub layer feeding Socket.io for multi-instance horizontal scaling (so room-status events broadcast correctly across load-balanced server instances).

### 3.5 Mobile (Flutter)
- Shared design-system package across Guest, Housekeeping, and Manager apps for consistent branding with app-specific navigation flows.
- Guest App: booking, pre-check-in, service requests, digital folio, push notifications.
- Housekeeping App: task list, status update buttons, inventory reporting, offline-tolerant local queue for spotty in-building Wi-Fi.
- Manager App: dashboards, approvals, staff schedule view, alerts.

### 3.6 Security
- All traffic over HTTPS/TLS 1.2+.
- Guest ID documents encrypted at rest (AES-256) in S3/Cloudinary with restricted signed-URL access.
- JWT access tokens short-lived (~15 min); refresh tokens rotated and stored securely (httpOnly cookies for web).
- 2FA (TOTP via authenticator app) mandatory for Admin, Super Admin, and Manager roles.
- Rate limiting and request throttling on public-facing booking API endpoints to mitigate abuse.

## 4. API Architecture Notes

- RESTful endpoints organized by resource and versioned under `/api/v1/`.
- Consistent response envelope (`{ success, data, error }`) across all endpoints.
- Webhook endpoints for payment gateway callbacks (Razorpay) and OTA channel manager push notifications, secured via signature verification.
- Pagination, filtering, and sorting standardized across list endpoints (reservations, invoices, tickets).
- OpenAPI/Swagger documentation maintained alongside the codebase for internal and future partner-integration reference.

## 5. Deployment & DevOps

- Dockerized services (API, worker/queue processor) deployed behind Nginx reverse proxy.
- Environment-based configuration (dev/staging/production) via `.env` and secrets manager.
- GitHub Actions pipeline: lint → test → build → deploy, with separate workflows for backend, web frontend, and mobile app builds.
- Managed MongoDB Atlas (or self-hosted replica set) with automated backups and point-in-time recovery.
- Monitoring/alerting via cloud-native tools (CloudWatch/GCP Monitoring) plus application-level logging (e.g., Winston) shipped to a centralized log store.
