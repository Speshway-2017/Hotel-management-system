# Design Document
## Hotel Management Software (PMS) — Indian Hospitality Market

**Document Version:** 1.0
**Date:** 2026-08-05

---

## 1. Design Principles

1. **Calm & Premium Hospitality Feel:** Visual language should evoke trust, warmth, and understated luxury — avoiding clutter or overly corporate/utilitarian aesthetics, especially on guest-facing surfaces.
2. **Clarity & Speed for Front Desk:** Front-desk and housekeeping interfaces prioritize scanability and minimal clicks/taps over decorative polish — every second matters during check-in rush.
3. **Trustworthy Guest Booking Experience:** The booking website/app must visually communicate security and legitimacy (clear pricing, no hidden fees, recognizable payment icons, SSL trust indicators) to convert direct bookings away from OTAs.
4. **Consistency Across Roles:** A shared design system (color, type, components) spans web dashboard, tablet console, and mobile apps so the product feels like one coherent platform, not disconnected tools.
5. **Data Legibility:** Reports and dashboards favor clear hierarchy, adequate white space, and restrained color-coding over dense, decorative charts.
6. **Accessibility by Default:** Usable by staff with varying digital literacy and guests with assistive needs.

## 2. Information Architecture per Role

### 2.1 Admin / Owner (Web + Mobile)
Dashboard Home → Occupancy/Revenue Overview → Properties (multi-property switch) → Rooms & Rates → Reservations → Staff → Reports → Settings (Channel Manager, Taxes, Branding)

### 2.2 Manager (Web + Mobile)
Dashboard Home → Today's Overview (arrivals/departures/occupancy) → Approvals (discounts/refunds) → Staff Schedule → Guest Feedback → Reports

### 2.3 Receptionist (Web/Tablet Console)
Room Status Grid (default landing) → Reservations (search/create) → Check-in/Check-out flow → Folio/Billing → Guest Lookup → Maintenance Ticket (quick-raise)

### 2.4 Housekeeping (Mobile App)
Task List (default landing, filtered "My Rooms") → Room Detail (status update buttons) → Inventory Report → Maintenance Flag

### 2.5 Guest (Mobile App + Website)
Home/Search → Room Results → Room Detail → Booking/Payment → Confirmation → My Bookings → Pre-Check-in → In-Stay Services → Folio/Invoice → Feedback

### 2.6 Accountant (Web)
Dashboard → Invoices → Payments/Reconciliation → Tax Reports → Corporate Dues

## 3. Branding

**Logo:** `logo.png` (project root) — the **Hour Stay** mark ("HOUR STAY — Stay for hours, pay for time. Hotel Booking Management"), pairing a navy building/bed glyph with a purple-to-pink gradient clock face and gold clock hands/bed accent. Use this logo as the canonical brand mark across the Admin/Manager dashboard header, Guest-facing booking site/app, front-desk console, and invoices — do not substitute a generic placeholder. Its navy/purple/pink/gold coloring is the direct source of this palette's Primary/Secondary/Tertiary/Accent hues below, so brand mark and UI stay visually unified.

## 4. Color Palette

**Chosen Direction: Deep Navy & Regal Purple, with Blush & Gold accents** — evokes premium, trustworthy hospitality branding (aligned with how upscale Indian hotels/resorts position themselves) while remaining calm and non-garish. Navy anchors trust and stability (financial/booking contexts); a regal purple secondary signals a distinctive, premium brand identity; warm gold and blush-pink accents add hospitality warmth without overwhelming the UI.

| Token | Hex | Usage |
|-------|-----|-------|
| Primary (Deep Navy) | `#0D1B2A` | Primary buttons, headers, nav bars, key brand elements |
| Primary Dark | `#081420` | Hover/active states, dark mode surfaces |
| Secondary (Regal Purple) | `#5B21B6` | Accents, highlights, premium CTAs, loyalty/VIP indicators |
| Tertiary (Blush Pink) | `#FF6B8B` | Guest-facing highlights, promo badges, favorite/heart actions |
| Accent (Warm Gold) | `#F5C06A` | Secondary CTAs, premium/VIP tags, rating stars |
| Background | `#FFF7E6` | App/page background (warm cream, softer than pure white) |
| Surface | `#E7E9EE` | Cards, panels, subtle section backgrounds |
| Surface White | `#FFFFFF` | Modals, elevated cards on cream background |
| Success | `#2E7D32` | Confirmed bookings, clean/inspected room status, resolved tickets |
| Warning | `#C77700` | Pending actions, dirty room status, low inventory alerts |
| Error | `#C62828` | Failed payments, out-of-order rooms, cancellations |
| Info | `#1565C0` | Informational banners, in-progress states |
| Neutral 900 | `#1A1D23` | Primary text |
| Neutral 700 | `#4A4F58` | Secondary text |
| Neutral 500 | `#8A8F98` | Placeholder text, disabled states |
| Neutral 300 | `#E7E9EE` | Borders, dividers |
| Neutral 100 | `#FFF7E6` | Subtle backgrounds, table stripe |

**Brand core:** `#0D1B2A` (navy), `#5B21B6` (purple), `#FF6B8B` (blush pink), `#F5C06A` (gold), `#FFF7E6` (cream), `#E7E9EE` (light neutral). Success/Warning/Error/Info retain functional green/amber/red/blue tones for status legibility, distinct from the brand core by design.

### 4.1 Room Status Color Coding
| Status | Color |
|--------|-------|
| Vacant / Clean / Inspected | Success Green `#2E7D32` |
| Occupied | Primary Navy `#0D1B2A` |
| Dirty | Warning Amber `#C77700` |
| Cleaning in Progress | Info Blue `#1565C0` |
| Out of Order | Error Red `#C62828` |
| Blocked/Maintenance Hold | Neutral 500 `#8A8F98` |

## 5. Typography

- **Headings:** *Playfair Display* (serif) — lends the premium, editorial hospitality feel to guest-facing surfaces (booking site, marketing headers, invoice titles).
- **Body / UI Text:** *Inter* (sans-serif) — highly legible at small sizes, excellent for dense admin dashboards, tables, and mobile task lists.
- **Pairing Rationale:** Playfair Display for large display headings evokes boutique-hotel elegance without sacrificing readability at small sizes, where Inter takes over for all functional UI text, forms, tables, and buttons — keeping operational screens fast to scan while guest-facing screens retain warmth.

| Style | Font | Weight | Size (Web) |
|-------|------|--------|-----------|
| H1 (Guest-facing hero) | Playfair Display | 700 | 40–48px |
| H2 (Section headers) | Playfair Display | 600 | 28–32px |
| H3 (Card/panel titles) | Inter | 600 | 20px |
| Body | Inter | 400 | 14–16px |
| Small/Caption | Inter | 400 | 12px |
| Button Label | Inter | 600 | 14–15px |

## 6. Spacing & Grid

- **Base unit:** 8px grid system (4px used sparingly for tight icon/label spacing).
- **Web Dashboard:** 12-column responsive grid, max content width ~1440px, 24px gutter.
- **Tablet Front-Desk Console:** Simplified 8-column grid optimized for landscape orientation, larger touch targets (min 44x44px).
- **Mobile Apps:** Single-column stacked layouts with 16px screen padding, 8px/16px spacing rhythm between elements.
- **Card Radius:** 8px (12px for guest-facing marketing surfaces to feel softer/more premium).
- **Elevation:** Subtle shadows (`0 2px 8px rgba(11,37,69,0.08)`) for cards; avoid heavy drop shadows to keep the calm, premium tone.

## 7. Component Notes

### 7.1 Booking Calendar
- Month-view calendar with per-date rate and availability indicators (small dot/badge under date for "limited availability").
- Selected date range highlighted with Primary Navy fill and Accent Gold border on start/end dates.
- Blocked/sold-out dates shown in Neutral 300 with strikethrough styling, non-selectable.
- Mobile: swipeable month navigation with sticky "Select Dates" CTA bar.

### 7.2 Room Status Cards / Grid
- Grid of room cards (or compact list on mobile), each color-coded per the status table above (Section 4.1).
- Card shows: Room number, type, status label, guest name (if occupied), quick-action icons (assign, clean-done, flag issue).
- Front-desk grid view supports filter by floor/wing and status; large touch targets for tablet use during rush check-in periods.

### 7.3 Invoice Layout
- Header: Hotel logo, name, GSTIN, address, invoice number, and date.
- Guest & stay details block (name, room, check-in/out dates, folio ID).
- Itemized charge table: description, quantity/nights, rate, tax rate (CGST/SGST/IGST split), amount.
- Summary block: subtotal, total tax, discounts, total due, amount paid, balance.
- Footer: payment method, terms/cancellation policy note, digital signature/QR for verification (optional).
- Generated as clean, print-ready PDF (pdfkit) using Inter for tabular data and Playfair Display only for the hotel name/header for brand consistency.

### 7.4 Buttons & CTAs
- Primary CTA: Navy fill, white text; purple used for premium/VIP-tagged actions, gold used sparingly for ratings/loyalty badges (e.g., "Upgrade to Suite").
- Destructive actions (cancel booking, delete): Error red outline/fill with confirmation modal required.
- Disabled state: Neutral 300 background, Neutral 500 text.

### 7.5 Forms & Inputs
- Clear label-above-field pattern, 8px spacing between label and input.
- Inline validation with Error red text and icon below field.
- ID document scan/upload component shows live preview thumbnail with OCR-extracted fields editable before confirmation.

## 8. Accessibility Notes

- Minimum text contrast ratio of 4.5:1 against backgrounds (validated for Navy-on-white, white-on-Navy, and text-on-Gold/Pink combinations — gold and pink accents used only for non-text decorative/status elements or paired with dark text, not as text-on-white body copy).
- All interactive elements have visible focus states (2px Info-blue outline) for keyboard navigation on web dashboard.
- Touch targets minimum 44x44px on tablet/mobile interfaces.
- Status/room-color-coding is always paired with a text label or icon, never color alone, to support color-blind users.
- Form fields include proper labels and ARIA attributes; error messages are programmatically associated with their inputs.
- Multi-language support (Section 2, features.md) extends to screen-reader-friendly localized labels, not just visual text swap.
- Booking flow and payment screens tested for screen-reader compatibility given guest-facing, transaction-critical nature.

## 9. Dark Mode Consideration (Admin Dashboard)

- Dark mode offered as an optional toggle for the Admin/Manager web dashboard (night-shift front-desk and back-office use case), not applied to the guest-facing booking site or invoices.
- Dark palette derived from Primary Dark (`#081420`) as base background, with Surface elements at `#122340`, text in Neutral 100 (`#FFF7E6`), and Gold/Purple/Pink accents retained at slightly desaturated values for reduced eye strain (`#D4B26A` gold, `#8B5CF6` purple, `#FF8FA6` pink).
- Status color-coding (Section 4.1) retains hue but shifts to slightly higher-luminance variants for adequate contrast against dark surfaces.
- Charts/reports in dark mode use a dedicated dark-optimized categorical palette rather than simply inverting light-mode chart colors, to avoid muddy or low-contrast data visualization.
