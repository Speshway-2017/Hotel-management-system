import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { 
  ShieldCheck, Lock, Eye, Database, Share2, 
  UserCheck, Bell, Mail, ArrowRight, CheckCircle2, 
  Clock, FileText, Trash2, KeyRound, Smartphone, 
  AlertTriangle, HelpCircle, HardDrive, Cookie
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hour Stay" },
      {
        name: "description",
        content: "Learn how Hour Stay collects, uses, protects, and handles your booking, guest, and property data."
      },
      { property: "og:title", content: "Privacy Policy — Hour Stay" },
      { property: "og:description", content: "Learn how Hour Stay collects, uses, and protects your data." }
    ]
  }),
  component: PrivacyPolicy
});

const SECTIONS = [
  {
    id: "info-collected",
    icon: Database,
    title: "1. Information We Collect",
    shortTitle: "Information Collected",
    summary: "Personal and property details gathered to operate hotel workflows and process reservations.",
    content: [
      {
        subtitle: "A. Guest Personal Information",
        text: "When you book a stay or complete pre-check-in, we collect identifying details including full legal name, email address, phone number, nationality, residential address, and emergency contact details."
      },
      {
        subtitle: "B. Property & Staff Account Details",
        text: "For subscribing hoteliers and property teams, we gather property legal name, business contact details, authorized staff roles (Super Admin, Manager, Receptionist), shift logs, and room inventory configurations."
      },
      {
        subtitle: "C. Technical & Device Data",
        text: "When accessing our web portals or mobile applications, we automatically log IP addresses, browser specifications, device operating system versions, and interaction timestamps for system security and audit logging."
      }
    ]
  },
  {
    id: "booking-payment-data",
    icon: HardDrive,
    title: "2. Booking & Payment Data",
    shortTitle: "Booking & Payments",
    summary: "How transaction records, room reservations, and billing details are processed securely.",
    content: [
      {
        subtitle: "A. Reservation Records & Folios",
        text: "We record check-in/check-out dates, room tier allocations, hourly stay intervals, guest special requests, and room service add-ons linked to your guest folio."
      },
      {
        subtitle: "B. Payment Processing Compliance",
        text: "All payment transactions (UPI, Credit/Debit Cards, Net Banking, and Wallet transfers) are tokenized and processed directly through Reserve Bank of India (RBI) authorized payment gateway partners. Hour Stay does not store raw credit card CVV codes or banking PINs on its application servers."
      },
      {
        subtitle: "C. GST & Billing Compliance",
        text: "We generate itemized tax invoices featuring statutory Goods and Services Tax (GST) breakdowns (CGST, SGST, IGST) required for financial accounting and tax compliance."
      }
    ]
  },
  {
    id: "id-documents",
    icon: KeyRound,
    title: "3. ID Documents & Statutory Hotel Compliance",
    shortTitle: "ID Verification",
    summary: "Mandatory guest identification handling as required by hospitality regulations.",
    content: [
      {
        subtitle: "A. Government-Issued Identification",
        text: "In accordance with Indian hospitality and local law enforcement regulations, all adult guests must present valid government photo identification (such as Aadhaar Card, Passport, Voter ID, or Driving License) at front desk check-in or through digital pre-verification."
      },
      {
        subtitle: "B. Foreign National Form C Registration",
        text: "For non-Indian passport holders, properties record passport numbers, visa details, and arrival dates to satisfy mandatory statutory reporting obligations (Form C / Bureau of Immigration)."
      },
      {
        subtitle: "C. Document Storage & Access Control",
        text: "Digital copies of identification documents are encrypted at rest with strict role-based access restricted exclusively to authorized hotel management and audit staff."
      }
    ]
  },
  {
    id: "cookies-tracking",
    icon: Cookie,
    title: "4. Cookies & Tracking Technologies",
    shortTitle: "Cookies & Sessions",
    summary: "Session tokens, preferences, and performance analytics.",
    content: [
      {
        subtitle: "A. Essential Session Cookies",
        text: "We utilize secure HTTP-only cookies and local storage tokens to preserve authenticated login sessions for staff and guests across property switching and navigation."
      },
      {
        subtitle: "B. Operational Preference Cookies",
        text: "These cookies remember your selected property ID, interface language, and dark/light display settings to enhance navigation speed."
      },
      {
        subtitle: "C. Performance Analytics",
        text: "Aggregated, non-personally identifiable diagnostic cookies help us evaluate page load speeds, reservation funnel drop-offs, and error rates."
      }
    ]
  },
  {
    id: "notifications-comms",
    icon: Bell,
    title: "5. Notifications & Communications",
    shortTitle: "Notifications",
    summary: "Transactional messages, OTP verification, and booking updates.",
    content: [
      {
        subtitle: "A. Transactional Alerts",
        text: "We send real-time SMS, Email, and WhatsApp notifications containing booking confirmation vouchers, OTP verification codes, check-in instructions, and digital checkout folios."
      },
      {
        subtitle: "B. Staff Operational Alerts",
        text: "Hotel staff receive push and dashboard notifications regarding instant reservations, shift handovers, and housekeeping room readiness."
      },
      {
        subtitle: "C. Opt-Out Guidelines",
        text: "Critical security notices and reservation confirmations cannot be disabled. You may opt out of non-essential promotional communications at any time."
      }
    ]
  },
  {
    id: "data-usage",
    icon: Eye,
    title: "6. How We Use Your Data",
    shortTitle: "Data Usage",
    summary: "Primary operational purposes for which collected information is utilized.",
    content: [
      {
        subtitle: "A. Core Property Management",
        text: "Delivering real-time room status grids, managing reservations, executing front desk check-ins, and automating housekeeping assignments."
      },
      {
        subtitle: "B. Invoicing & Financial Accounting",
        text: "Calculating applicable tariff rates, seasonal discounts, coupon redemptions, split billing folios, and generating compliant GST tax invoices."
      },
      {
        subtitle: "C. Security & Fraud Prevention",
        text: "Detecting invalid credentials, preventing double-bookings, preventing payment fraud, and ensuring system reliability."
      }
    ]
  },
  {
    id: "data-sharing",
    icon: Share2,
    title: "7. Information Sharing & Third Parties",
    shortTitle: "Data Sharing",
    summary: "Strict confidentiality standards for third-party integrations.",
    content: [
      {
        subtitle: "A. Zero Data Monetization",
        text: "Hour Stay does NOT sell, rent, or trade your personal or business data to data brokers or third-party advertisers."
      },
      {
        subtitle: "B. Authorized Service Partners",
        text: "We share data only with vetted infrastructure partners (secure cloud hosting, payment gateways, SMS/WhatsApp delivery networks) bound by strict confidentiality agreements."
      },
      {
        subtitle: "C. Legal & Statutory Disclosures",
        text: "We may disclose records when required by law, subpoena, or government authority to comply with national security or statutory obligations."
      }
    ]
  },
  {
    id: "security-measures",
    icon: Lock,
    title: "8. Data Security & Encryption",
    shortTitle: "Security Measures",
    summary: "Protective technical controls, cryptographic protocols, and safeguards.",
    content: [
      {
        subtitle: "A. Encryption in Transit and at Rest",
        text: "All traffic between your browser/app and our servers is secured using 256-bit TLS encryption. Sensitive database fields are stored with industry-standard cryptographic protection."
      },
      {
        subtitle: "B. Role-Based Access Control (RBAC)",
        text: "Hotel staff accounts operate under strict permission boundaries preventing unauthorized viewing or exporting of sensitive guest databases."
      },
      {
        subtitle: "C. Continuous Monitoring",
        text: "Our infrastructure is protected by automated rate limiting, vulnerability testing, and secure daily automated cloud backups."
      }
    ]
  },
  {
    id: "data-retention",
    icon: Clock,
    title: "9. Data Retention Practices",
    shortTitle: "Data Retention",
    summary: "How long property, booking, and guest records are preserved.",
    content: [
      {
        subtitle: "A. Statutory Tax Retention",
        text: "Reservation folios, financial transaction logs, and tax invoices are retained for the statutory period required under Indian financial and commercial tax laws (typically up to 7 financial years)."
      },
      {
        subtitle: "B. Guest Identity Records",
        text: "Guest register information is preserved in accordance with state hotel registration bylaws, after which it is archived securely or scrubbed upon valid request."
      }
    ]
  },
  {
    id: "user-rights",
    icon: UserCheck,
    title: "10. User Rights & Choices",
    shortTitle: "User Rights",
    summary: "Your control over personal records and data portability.",
    content: [
      {
        subtitle: "A. Right to Access & Inspect",
        text: "You may request an overview of personal information stored about your profile and past stays."
      },
      {
        subtitle: "B. Right to Rectification",
        text: "You may update or correct outdated contact information, guest names, or property settings via your account dashboard or front desk staff."
      },
      {
        subtitle: "C. Data Portability",
        text: "Subscribing hoteliers have the right to export customer lists, folios, and reservation histories in standard machine-readable formats."
      }
    ]
  },
  {
    id: "account-deletion",
    icon: Trash2,
    title: "11. Account Deletion & Data Purge",
    shortTitle: "Account Deletion",
    summary: "Procedures for closing accounts and requesting data erasure.",
    content: [
      {
        subtitle: "A. Initiating Deletion Requests",
        text: "Property administrators and individual users may submit an account deletion request through their account settings or via our contact portal."
      },
      {
        subtitle: "B. Deletion Timeline",
        text: "Upon verification, active user credentials, session tokens, and personal profiles will be removed from active production systems within thirty (30) business days, excluding records mandated by statutory legal/tax retention rules."
      }
    ]
  },
  {
    id: "contact-privacy",
    icon: Mail,
    title: "12. Contact & Privacy Inquiries",
    shortTitle: "Contact Information",
    summary: "How to connect with our privacy support and compliance team.",
    content: [
      {
        subtitle: "A. Grievance & Data Requests",
        text: "If you have questions regarding this Privacy Policy, wish to exercise your data rights, or need assistance with privacy settings, please reach out directly through our dedicated contact portal."
      },
      {
        subtitle: "B. Response Timeline",
        text: "Our data protection and privacy desk acknowledges all written requests promptly within 48 to 72 business hours."
      }
    ]
  }
];

export default function PrivacyPolicy() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(SECTIONS[i].id);
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
            <ShieldCheck className="size-4" />
            <span>Privacy & Data Protection</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Privacy Policy
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-300 font-ui leading-relaxed">
            At Hour Stay, we treat your hospitality and guest data with the highest standards of security, privacy, and integrity.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-gold" />
              <span>Last Updated: September 2026</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Indian Hospitality Context</span>
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
                  Hour Stay Privacy Commitment
                </h2>
                <p className="text-sm text-gray-600 font-ui leading-relaxed max-w-3xl">
                  We are committed to transparent, secure data management for hotels, resorts, and travelers across India. We never sell your personal data or guest registers to third-party brokers.
                </p>
              </div>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-navy text-cream hover:bg-purple text-xs font-bold transition-colors shrink-0 shadow-sm"
              >
                <span>Have Questions?</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 mt-6 border-t border-navy/5 text-xs font-medium text-navy">
              <div className="flex items-center gap-2.5 bg-[#F3E8FF]/60 px-4 py-3 rounded-xl border border-purple/10">
                <Lock className="size-4 text-purple shrink-0" />
                <span>256-bit TLS Data Encryption</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#E0F2FE]/60 px-4 py-3 rounded-xl border border-sky-200">
                <Database className="size-4 text-sky-600 shrink-0" />
                <span>Zero Data Monetization</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#DCFCE7]/60 px-4 py-3 rounded-xl border border-emerald-200">
                <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                <span>Statutory & RBI Compliant</span>
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
                  <span>Table of Contents</span>
                </div>
                <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 text-xs font-ui">
                  {SECTIONS.map((sec) => (
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

            {/* Main Policy Content Column */}
            <main className="lg:col-span-8 space-y-8">
              {SECTIONS.map((sec) => {
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
                    Need further privacy clarification?
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 font-ui max-w-xl">
                    Our compliance team is happy to answer inquiries regarding your property records or guest data rights.
                  </p>
                </div>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-gold text-navy font-bold text-xs sm:text-sm hover:bg-gold/90 transition-all duration-300 hover:scale-[1.03] shadow-lg shrink-0"
                >
                  <span>Contact Privacy Desk</span>
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
