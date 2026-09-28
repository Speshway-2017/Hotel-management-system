import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { 
  Scale, FileText, CheckCircle2, ShieldAlert, CreditCard, 
  Hotel, RefreshCw, Clock, ArrowRight, UserCheck, 
  Tag, Ban, AlertCircle, HelpCircle, KeyRound, 
  DoorOpen, LogOut, PhoneCall
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Hour Stay" },
      {
        name: "description",
        content: "Review terms of service, reservation guidelines, booking policies, check-in rules, and platform conditions for Hour Stay."
      },
      { property: "og:title", content: "Terms & Conditions — Hour Stay" },
      { property: "og:description", content: "Review terms of service and reservation conditions for Hour Stay." }
    ]
  }),
  component: TermsPage
});

const TERMS_SECTIONS = [
  {
    id: "account-usage",
    icon: UserCheck,
    title: "1. Account Usage & User Eligibility",
    shortTitle: "Account Usage",
    summary: "Registration requirements and user access responsibilities.",
    content: [
      {
        subtitle: "A. Account Creation & Eligibility",
        text: "You must be at least 18 years old to create an account or book accommodations through Hour Stay. Users agree to provide true, accurate, and current information during registration."
      },
      {
        subtitle: "B. Credential Confidentiality",
        text: "You are solely responsible for maintaining the confidentiality of your account credentials, passwords, and multi-factor authentication codes. Any activity conducted under your account is deemed your responsibility."
      },
      {
        subtitle: "C. Hotel Staff Delegation",
        text: "Subscribing hoteliers must ensure staff members operate strictly within their assigned role boundaries (Super Admin, Manager, Receptionist) and revoke access promptly when staff depart."
      }
    ]
  },
  {
    id: "bookings-reservations",
    icon: Hotel,
    title: "2. Bookings & Reservations",
    shortTitle: "Bookings & Stays",
    summary: "Reservation contracts, confirmations, and stay allocations.",
    content: [
      {
        subtitle: "A. Reservation Confirmation",
        text: "A booking is considered confirmed only upon generation of a valid confirmation number and voucher issued via SMS, Email, or WhatsApp following successful verification or payment deposit."
      },
      {
        subtitle: "B. Hourly & Overnight Stays",
        text: "Hour Stay accommodates both flexible micro-stay / hourly intervals and conventional overnight bookings. Room access is granted strictly for the reserved time slot indicated on your booking voucher."
      },
      {
        subtitle: "C. Room Inventory Availability",
        text: "While properties strive to guarantee exact room numbers, hotels reserve the right to upgrade or assign equivalent or superior room categories within the same property tier."
      }
    ]
  },
  {
    id: "payments-invoicing",
    icon: CreditCard,
    title: "3. Payments, Currency & Invoicing",
    shortTitle: "Payments & Invoicing",
    summary: "Payment methods, tax breakdown, and invoicing terms.",
    content: [
      {
        subtitle: "A. Accepted Payment Methods",
        text: "Payments may be made via UPI QR codes, Debit/Credit Cards, Net Banking, authenticated digital wallets, or cash at property front desks where accepted by the hotel."
      },
      {
        subtitle: "B. Currency & GST Breakdown",
        text: "All tariffs are quoted in Indian National Rupees (INR) and are subject to statutory Goods and Services Tax (GST) in accordance with government tax brackets based on declared room tariffs."
      },
      {
        subtitle: "C. Incidental Charges",
        text: "Additional room service, laundry, restaurant dining, mini-bar consumption, or extended stay charges will be billed directly to the guest folio and must be settled prior to departure."
      }
    ]
  },
  {
    id: "cancellations-modifications",
    icon: RefreshCw,
    title: "4. Cancellations & Booking Modifications",
    shortTitle: "Cancellations",
    summary: "Rules governing stay modifications, notice periods, and fees.",
    content: [
      {
        subtitle: "A. Free Cancellation Windows",
        text: "Cancellation rules vary by rate plan. Standard refundable bookings permit free cancellation up to 24 to 48 hours prior to the standard check-in time, as specified on the reservation voucher."
      },
      {
        subtitle: "B. Late Cancellations & No-Shows",
        text: "Cancellations made within the non-refundable window or failure to arrive on the scheduled date (No-Show) may incur a retention charge up to the value of the first night or full stay amount."
      },
      {
        subtitle: "C. Date & Time Slot Amendments",
        text: "Modification of stay dates or hourly time slots is subject to real-time room availability and applicable tariff adjustments."
      }
    ]
  },
  {
    id: "refunds-chargebacks",
    icon: Scale,
    title: "5. Refunds & Reimbursement Policies",
    shortTitle: "Refunds",
    summary: "Processing timelines, reversal channels, and disputed charges.",
    content: [
      {
        subtitle: "A. Refund Processing Timeframe",
        text: "Eligible refunds are initiated within 48 business hours of cancellation and typically reflect in the original source payment method (bank account / UPI / card) within 5 to 7 banking working days."
      },
      {
        subtitle: "B. Non-Refundable Tariffs",
        text: "Promotional rates, early-bird specials, and peak holiday flash sales explicitly designated as non-refundable are ineligible for refunds upon cancellation."
      },
      {
        subtitle: "C. Dispute Resolution",
        text: "For billing discrepancies or double debits, guests and hoteliers are encouraged to contact our support desk directly before initiating external payment gateway disputes."
      }
    ]
  },
  {
    id: "checkin-checkout",
    icon: DoorOpen,
    title: "6. Check-in & Check-out Policies",
    shortTitle: "Check-in / Check-out",
    summary: "Standard operational timings, early check-in, and late departure.",
    content: [
      {
        subtitle: "A. Standard Timings",
        text: "Standard overnight check-in commences from 12:00 PM / 2:00 PM and check-out is required by 11:00 AM, unless alternative hourly slots were selected during reservation."
      },
      {
        subtitle: "B. Early Check-in & Late Departure",
        text: "Early arrival and late checkout are subject to room readiness and property availability. Properties may apply nominal hourly surcharges."
      },
      {
        subtitle: "C. Key Return & Folio Settlement",
        text: "Guests must surrender physical or digital room keys and settle all outstanding folio balances upon departure."
      }
    ]
  },
  {
    id: "guest-id-verification",
    icon: KeyRound,
    title: "7. Guest ID Verification & Statutory Compliance",
    shortTitle: "Guest ID Verification",
    summary: "Mandatory statutory verification required by Indian hospitality laws.",
    content: [
      {
        subtitle: "A. Mandatory Photo Identification",
        text: "Every adult guest (18+ years) checking into any property must present an original, valid government-issued photo ID (Aadhaar Card, Passport, Voter ID, or Driving License). PAN Cards are generally not accepted as address proof under local hotel rules."
      },
      {
        subtitle: "B. Foreign National Requirements",
        text: "Non-Indian travelers must produce a valid original Passport and Indian Visa / OCI card to facilitate mandatory Form C submission."
      },
      {
        subtitle: "C. Right of Admission Refusal",
        text: "Hotels reserve the statutory right to refuse check-in to guests who fail to furnish valid identification documents without refund entitlement."
      }
    ]
  },
  {
    id: "room-service-policies",
    icon: Hotel,
    title: "8. Room & Property Conduct Policies",
    shortTitle: "Property Policies",
    summary: "Occupancy limits, guest conduct, damages, and amenity usage.",
    content: [
      {
        subtitle: "A. Maximum Room Occupancy",
        text: "Guests must not exceed the maximum permitted occupancy stated for the room tier. Extra adult or child rollaway beds must be registered with the front desk."
      },
      {
        subtitle: "B. Property Damage & Missing Inventory",
        text: "Guests are responsible for any intentional or negligent damage to hotel furnishings, fixtures, appliances, or linens, and will be assessed replacement costs."
      },
      {
        subtitle: "C. Noise, Smoking & Pets",
        text: "Guests must observe quiet hours (typically 10:00 PM to 7:00 AM). Smoking in designated non-smoking rooms or bringing pets without prior authorization may result in deep-cleaning surcharges."
      }
    ]
  },
  {
    id: "coupons-discounts",
    icon: Tag,
    title: "9. Coupons, Discounts & Promotional Offers",
    shortTitle: "Coupons & Discounts",
    summary: "Terms governing coupon codes, reward vouchers, and seasonal deals.",
    content: [
      {
        subtitle: "A. Coupon Validity & Limits",
        text: "Coupon codes and promotional discounts apply strictly during specified validity periods and cannot be combined with conflicting offers unless explicitly permitted."
      },
      {
        subtitle: "B. Non-Cash Value",
        text: "Promotional credits, coupon deductions, and reward vouchers hold no standalone cash surrender value and are non-transferable."
      },
      {
        subtitle: "C. Right of Revocation",
        text: "Hour Stay and member properties reserve the right to void coupons in cases of suspected manipulation, fraudulent multi-accounting, or system pricing errors."
      }
    ]
  },
  {
    id: "prohibited-use",
    icon: Ban,
    title: "10. Prohibited Use & Conduct",
    shortTitle: "Prohibited Use",
    summary: "Restricted activities, abusive behavior, and system violations.",
    content: [
      {
        subtitle: "A. Unlawful Activities",
        text: "The platform and property premises must not be used for illegal commercial transactions, unauthorized subletting, cyber-attacks, or hazardous activities."
      },
      {
        subtitle: "B. Respectful Conduct",
        text: "Harassment, abuse, or threatening behavior toward hotel staff, fellow guests, or support personnel will result in immediate termination of the stay and potential law enforcement referral."
      },
      {
        subtitle: "C. Technical Interference",
        text: "Users must not attempt automated scraping, database penetration testing, reverse engineering, or denial-of-service operations against the software."
      }
    ]
  },
  {
    id: "limitation-liability",
    icon: ShieldAlert,
    title: "11. Limitation of Liability & Disclaimers",
    shortTitle: "Liability & Disclaimers",
    summary: "Scope of platform warranty, service availability, and limitations.",
    content: [
      {
        subtitle: "A. Platform As-Is Provision",
        text: "Hour Stay provides its software and booking network on an 'as-is' and 'as-available' basis. We strive for high platform availability but cannot guarantee uninterrupted service during scheduled maintenance."
      },
      {
        subtitle: "B. Third-Party Property Services",
        text: "While Hour Stay facilitates seamless booking and property management tools, direct hospitality services (room upkeep, meals, amenities) are the direct operational responsibility of the respective hotelier."
      },
      {
        subtitle: "C. Force Majeure",
        text: "Neither party shall be held liable for failure or delay in performance resulting from acts of God, severe weather crises, power grid failures, governmental lockdowns, or telecommunications outages."
      }
    ]
  },
  {
    id: "modifications-terms",
    icon: Clock,
    title: "12. Modifications to Terms",
    shortTitle: "Modifications",
    summary: "How and when policy updates and revisions are communicated.",
    content: [
      {
        subtitle: "A. Periodic Updates",
        text: "Hour Stay may update these Terms & Conditions periodically to reflect regulatory adjustments, new features, or changing business practices."
      },
      {
        subtitle: "B. Notification of Material Changes",
        text: "Significant policy changes will be highlighted via notice banners on our public website or communicated to registered property administrators."
      }
    ]
  },
  {
    id: "termination-closure",
    icon: LogOut,
    title: "13. Account Termination & Suspension",
    shortTitle: "Account Termination",
    summary: "Conditions under which accounts or access rights may be closed.",
    content: [
      {
        subtitle: "A. Termination by User",
        text: "Users and property subscribers may discontinue platform usage at any time by closing their account or settling active billing subscriptions."
      },
      {
        subtitle: "B. Termination for Cause",
        text: "Hour Stay may suspend or terminate access immediately without prior notice in cases of repeated policy violations, payment defaults, or fraudulent behavior."
      }
    ]
  },
  {
    id: "governing-law-contact",
    icon: AlertCircle,
    title: "14. Governing Law & Contact",
    shortTitle: "Governing Law",
    summary: "Jurisdiction, legal arbitration, and support inquiries.",
    content: [
      {
        subtitle: "A. Jurisdiction",
        text: "These Terms are governed by and construed in accordance with the substantive laws of India. Any legal dispute or claim arising out of these terms shall be subject to the exclusive jurisdiction of the competent courts in India."
      },
      {
        subtitle: "B. Contact & Inquiries",
        text: "For questions, clarifications, or feedback regarding these Terms & Conditions, please contact our support team through our official contact portal."
      }
    ]
  }
];

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState(TERMS_SECTIONS[0].id);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let i = TERMS_SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(TERMS_SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(TERMS_SECTIONS[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <SiteLayout>
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-navy text-white pt-24 pb-16 lg:pt-32 lg:pb-20">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 right-10 size-[420px] rounded-full bg-purple/20 blur-[100px]" />
          <div className="absolute -bottom-40 left-10 size-[350px] rounded-full bg-gold/10 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-gold text-xs font-semibold uppercase tracking-wider mb-6">
            <Scale className="size-4" />
            <span>Legal Agreement & Policies</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Terms & Conditions
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-300 font-ui leading-relaxed">
            Please review the terms and policies governing hotel reservations, property management software usage, and guest stays on Hour Stay.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-gold" />
              <span>Last Updated: September 2026</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Indian Hospitality Standards</span>
            <span className="hidden sm:inline">•</span>
            <span>Version 3.0</span>
          </div>
        </div>
      </section>

      {/* Main Content Layout with Sticky Sidebar */}
      <section className="py-12 sm:py-20 bg-cream/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          
          {/* Quick Summary Highlights Banner */}
          <div className="mb-12 rounded-2xl border border-purple/20 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="font-display text-xl font-bold text-navy flex items-center gap-2.5 mb-2">
                  <CheckCircle2 className="size-5 text-purple" />
                  Key Highlights of Our Agreement
                </h2>
                <p className="text-sm text-gray-600 font-ui leading-relaxed max-w-3xl">
                  These terms establish fair, transparent operational ground rules for guest stays, verified ID check-ins, transparent GST tax invoices, and hotelier SaaS accounts.
                </p>
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-navy text-cream hover:bg-purple text-xs font-bold transition-colors shrink-0 shadow-sm"
              >
                <span>Need Assistance?</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 mt-6 border-t border-navy/5 text-xs font-medium text-navy">
              <div className="flex items-center gap-2.5 bg-[#F3E8FF]/60 px-4 py-3 rounded-xl border border-purple/10">
                <Hotel className="size-4 text-purple shrink-0" />
                <span>Fair Reservation Policies</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#E0F2FE]/60 px-4 py-3 rounded-xl border border-sky-200">
                <CreditCard className="size-4 text-sky-600 shrink-0" />
                <span>Transparent Invoicing & GST</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#DCFCE7]/60 px-4 py-3 rounded-xl border border-emerald-200">
                <Scale className="size-4 text-emerald-600 shrink-0" />
                <span>Statutory Guest Verification</span>
              </div>
            </div>
          </div>

          {/* Grid Layout: Sidebar Navigation + Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            
            {/* Sticky Table of Contents Sidebar (Desktop) */}
            <aside className="lg:col-span-4 sticky top-24 hidden lg:block">
              <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 pb-3 mb-3 border-b border-navy/5 text-navy font-display font-bold text-sm">
                  <FileText className="size-4 text-purple" />
                  <span>Section Navigation</span>
                </div>
                <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 text-xs font-ui">
                  {TERMS_SECTIONS.map((sec) => (
                    <button
                      key={sec.id}
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between group ${
                        activeSection === sec.id
                          ? "bg-purple text-white font-semibold shadow-sm"
                          : "text-gray-600 hover:bg-navy/5 hover:text-navy"
                      }`}
                    >
                      <span className="truncate">{sec.shortTitle || sec.title}</span>
                      <ArrowRight className={`size-3 shrink-0 transition-transform ${activeSection === sec.id ? "opacity-100 translate-x-0.5" : "opacity-0 group-hover:opacity-100"}`} />
                    </button>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Terms Content Column */}
            <main className="lg:col-span-8 space-y-8">
              {TERMS_SECTIONS.map((sec) => {
                const Icon = sec.icon;
                return (
                  <article
                    key={sec.id}
                    id={sec.id}
                    className="scroll-mt-24 rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-purple/30 text-left"
                  >
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-4 pb-4 border-b border-navy/5">
                      <div className="size-11 rounded-xl bg-gradient-to-br from-navy to-purple text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                        <Icon className="size-5 text-gold" />
                      </div>
                      <div>
                        <h2 className="font-display text-lg sm:text-xl font-bold text-navy">
                          {sec.title}
                        </h2>
                        {sec.summary && (
                          <p className="text-xs sm:text-sm text-purple font-medium mt-1">
                            {sec.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="space-y-5 text-sm sm:text-[15px] text-gray-700 font-ui leading-relaxed">
                      {sec.content.map((block, idx) => (
                        <div key={idx} className="space-y-1.5">
                          {block.subtitle && (
                            <h3 className="font-semibold text-navy text-sm">
                              {block.subtitle}
                            </h3>
                          )}
                          <p className="text-gray-600 leading-relaxed">
                            {block.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}

              {/* Bottom Callout Banner */}
              <div className="rounded-3xl bg-gradient-to-r from-navy via-navy-deep to-purple p-8 sm:p-10 text-white text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2">
                  <h3 className="font-display text-xl sm:text-2xl font-bold text-cream">
                    Questions regarding these terms?
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 font-ui max-w-xl">
                    For corporate accounts, hotel group onboarding agreements, or guest reservation queries, contact our support team.
                  </p>
                </div>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gold text-navy font-bold text-xs sm:text-sm hover:bg-gold/90 transition-all duration-300 hover:scale-[1.03] shadow-lg shrink-0"
                >
                  <span>Contact Support</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>

            </main>
          </div>

        </div>
      </section>
    </SiteLayout>
  );
}
