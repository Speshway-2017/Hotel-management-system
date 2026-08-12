# Hour Stay PMS — Technical Knowledge Base & Developer Manual

Welcome to the **Hour Stay Property Management System (PMS)** developer manual. This document compiles the system architecture, directory layouts, role-based workflows, tax/payment business rules, and setup instructions.

---

## 1. System Architecture Overview

Hour Stay is built on a decoupled, modern web architecture:
- **Frontend Layer**: Client application powered by **React (v19)**, **Vite (v8)**, and **Tailwind CSS (v4)**.
- **Backend Layer**: RESTful API server powered by **Node.js**, **Express**, and **MongoDB** with Mongoose.
- **Role-Based Access Control (RBAC)**: Supports distinct operational portals for:
  - **Super-Admin**: Multi-property management, Super Audits, global Channel Manager.
  - **Admin**: Property configuration, staff management, tax configs, rate plans.
  - **Manager**: Today's arrivals/departures, discount/refund approvals, shift rosters.
  - **Receptionist**: Visual room status grid, express OCR check-in, walk-ins, split-billing folios.
  - **Guest**: Direct booking engine, pre-check-in ID upload, in-stay QR service requests.
  - **Accountant**: Invoice reconciliation, statutory tax reports, accounts receivable.

---

## 2. Frontend Layer (`frontend/`)

### 2.1 Technology Stack & Configurations
- **Framework**: React 19 + JavaScript (ES Modules).
- **Build Tool**: Vite 8.
- **Styles**: Tailwind CSS v4 (configured via `@import "tailwindcss" source(none);` in `src/index.css` with semantic color mappings).
- **Icons**: Lucide React.
- **State & Queries**: React Context + `@tanstack/react-query` (v5) for API caching.
- **Routing System**: 
  - Standard `react-router-dom` (v7) serves as the core browser history router mounted in `App.jsx`.
  - To maintain clean modular page definitions, a custom **routing alias/mock** is configured in `vite.config.js` pointing `@tanstack/react-router` to `src/utils/tanstack-router-mock.jsx`.
  - This allows page files to export route definitions (e.g., `export const Route = createFileRoute("/about")({ component: About })`) which are wrapped dynamically by `<RouteWrapper>` in `App.jsx`.

### 2.2 Branding & Aesthetics
The frontend strictly enforces the **Hour Stay Brand Identity** (derived from the building/clock mark in `logo.png`):
- **Colors**:
  - Primary (Deep Navy): `#0D1B2A` (anchors trust in billing, navigation, and primary text).
  - Secondary (Regal Purple): `#5B21B6` (used for VIP markers, loyalty features, and highlights).
  - Tertiary (Blush Pink): `#FF6B8B` (used for highlight tags, alerts, and customer interactions).
  - Accent (Warm Gold): `#F5C06A` (used for primary CTAs, rating stars, and premium flags).
  - Background (Warm Cream): `#FFF7E6` (softer, premium page backdrop).
  - Surface (Light Neutral): `#E7E9EE` (used for panels, table stripes, and card backgrounds).
- **Typography**:
  - Headings: **Playfair Display** (serif) — provides a premium, boutique hotel editorial style.
  - UI/Body: **Inter** (sans-serif) — highly legible at small sizes, optimized for fast-scanning tables and grids.

### 2.3 Directory Structure
```
frontend/
├── dist/                   # Compiled static production bundle
├── public/                 # Static assets served at root
└── src/
    ├── assets/             # Images, logos, and illustrations
    ├── components/
    │   └── ui/             # Radix UI primitive wrappers (buttons, calendars, etc.)
    ├── data/               # Mock data collections (hs-data.js)
    ├── layouts/            # Shared layouts (SiteLayout.jsx, DashShell.jsx, Logo.jsx)
    ├── pages/              # Public-facing views (Home, About, Features, Search, Blog)
    ├── roles/              # Role-specific operational interfaces
    │   ├── admin/
    │   ├── manager/
    │   ├── receptionist/
    │   ├── guest/
    │   └── super-admin/
    ├── utils/              # Utility helpers, styling merges (cn), and router mocks
    ├── App.jsx             # Main router declaration and route wrappers
    ├── index.css           # Global stylesheet with Tailwind v4 variables
    └── main.jsx            # React root mount entrypoint
```

---

## 3. Backend Layer (`backend/`)

### 3.1 Architecture Patterns
The backend follows a clean MVC / Service-Repository pattern:
- **Server Mount (`server.js`)**: Loads environment variables, connects to the database via Mongoose, creates the Node HTTP server, and mounts the Express app.
- **Express Config (`app.js`)**: Applies CORS configuration, sets JSON payload limits, serves static files from `/uploads`, mounts health-check routes, and maps modular router groups.
- **Middleware Layer**: Handles auth guards (JWT), role verification (RBAC), and centralized error handling.

### 3.2 Key REST API Endpoints
- **Authentication (`/api/auth`)**: Handles `/login`, `/register`, and `/forgot-password`.
- **Admin Configuration (`/api/admin`)**: Operations for configuring rooms, seasonal rate calendars, staff profiles, and property parameters.
- **Management Console (`/api/manager`)**: Approving manager discounts, assigning shifts, and viewing occupancy analytical feeds.
- **Front Desk Operations (`/api/receptionist`)**: Ingesting check-ins, scanning Aadhaar/Passport attachments, managing waitlists, splitting folios, and checked-out settlements.
- **Guest self-service (`/api/guest`)**: Uploading IDs during pre-check-in, submitting post-stay reviews, and raising housekeeping/amenity requests.
- **Super-Admin Hub (`/api/super-admin`)**: Global audits, property onboarding, and OTA channel managers.

---

## 4. Key Business Rules & Compliance

### 4.1 India-First GST Compliance
- **SAC Codes**: The system uses SAC code `9963` for room accommodations and food & beverage services.
- **Dynamic Slab Mapping**:
  - Accommodation tariff under **₹7,500/night** attracts **12% GST** (split as 6% CGST + 6% SGST, or 12% IGST for out-of-state guests).
  - Accommodation tariff at or above **₹7,500/night** attracts **18% GST** (split as 9% CGST + 9% SGST, or 18% IGST).
- **Split Billing**: Allows billing to be split between a personal guest (e.g. F&B POS charges) and a corporate entity (e.g. room charges with the corporate's GSTIN).

### 4.2 UPI-First Settlement
- Generates instant dynamic QR codes embedded with the correct UPI parameters (VPA address, amount, reference billing ID).
- Senders can pay via Google Pay, PhonePe, Paytm, or BHIM apps, bypass credit card gateway processing commissions (often saving 1.8% to 3.0%), and complete transaction reconciliation instantly.

### 4.3 2-Way OTA Synchronization
- Links PMS inventory count with channel managers (MakeMyTrip, Booking.com, Agoda, Goibibo).
- When a room is booked on one channel (or offline walk-in), available stock decrements by `1` and a multicast request updates all connected networks in under 2 seconds. This prevents overbookings and manages rate parity.

### 4.4 Housekeeping Room Lifecycle
- Room grid statuses are tracked in real-time:
  - **Vacant / Clean / Inspected** (Success Green): Ready for walk-in check-in.
  - **Occupied** (Navy): Guest currently in-house.
  - **Dirty** (Warning Amber): Triggers on checkout, flags for cleaning.
  - **Cleaning in Progress** (Info Blue): Housekeeper actively cleaning the room.
  - **Out of Order** (Error Red): Undergoing maintenance; excluded from booking inventories.
  - **Blocked/Hold** (Neutral Gray): Kept for manager blocks, owner use, or VIP holds.

---

## 5. Installation & Developer Setup

### 5.1 Prerequisites
- Node.js (v18 or higher recommended).
- MongoDB (running locally or a connection string to MongoDB Atlas).

### 5.2 Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd Hotel-management-system/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/hourstay_hms
   JWT_SECRET=your_jwt_secret_key_here
   CLIENT_URL=http://localhost:5173
   NODE_ENV=development
   ```
4. Start the server:
   ```bash
   npm start
   ```
   *The console will print `🏨 Hour Stay HMS Backend Server running on port 5000`.*

### 5.3 Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd Hotel-management-system/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The page will be served locally at `http://localhost:5173`.*

### 5.4 Production Build
To compile the frontend for production, run:
```bash
npm run build
```
This outputs minified, static HTML, CSS, and JS assets in the `frontend/dist/` directory, optimized for deployment.
