import { useState, useEffect, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Mail, MapPin, Phone, ChevronDown, ChevronUp, 
  Sparkles, ShoppingCart, LifeBuoy, Handshake, Check 
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@/components/hs/kit";
import { validateWithZod, contactFormSchema } from "@/schemas";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Hour Stay — Talk to our hospitality team" },
      {
        name: "description",
        content: "Reach the Hour Stay team in Jaipur for demos, onboarding and reservations support."
      },
      { property: "og:title", content: "Contact Hour Stay" },
      { property: "og:description", content: "Demos, onboarding and reservations support." }
    ]
  }),
  component: Contact
});

const contactOptions = [
  {
    step: "01",
    category: "Sales",
    icon: ShoppingCart,
    title: "Sales Inquiry",
    desc: "Interested in onboarding your property? Talk to our sales team about custom plan pricing and keys scale.",
    action: "Call Sales",
    contact: "+91 141 4055 901",
    href: "tel:+911414055901",
    gradient: "from-[#5B21B6] via-[#6D28D9] to-[#7C3AED]",
    badgeBorder: "border-[#DDD6FE]/60",
    tagColor: "text-[#5B21B6]",
    titleColor: "text-[#5B21B6]",
    actionColor: "text-[#5B21B6]",
    cardBorderHover: "group-hover:border-[#5B21B6]/40",
  },
  {
    step: "02",
    category: "Support",
    icon: LifeBuoy,
    title: "Support & Training",
    desc: "Run into issues during check-in or billing? Our front-desk support team is available 24/7.",
    action: "Contact Support",
    contact: "support@hourstay.in",
    href: "mailto:support@hourstay.in",
    gradient: "from-[#0284C7] via-[#0369A1] to-[#0D9488]",
    badgeBorder: "border-[#7DD3FC]/60",
    tagColor: "text-[#0284C7]",
    titleColor: "text-[#0284C7]",
    actionColor: "text-[#0284C7]",
    cardBorderHover: "group-hover:border-[#0284C7]/40",
  },
  {
    step: "03",
    category: "Partnerships",
    icon: Handshake,
    title: "Partnerships",
    desc: "OTA networks, corporate travel agencies, or hospitality consultants looking to integrate with Hour Stay.",
    action: "Email Partnerships",
    contact: "partners@hourstay.in",
    href: "mailto:partners@hourstay.in",
    gradient: "from-[#B45309] via-[#D97706] to-[#F59E0B]",
    badgeBorder: "border-[#FDE68A]/60",
    tagColor: "text-[#B45309]",
    titleColor: "text-[#B45309]",
    actionColor: "text-[#B45309]",
    cardBorderHover: "group-hover:border-[#D97706]/40",
  }
];

function ContactChannelCard({ item, idx }) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -20px 0px" }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const IconComponent = item.icon;
  const staggerDelay = `${idx * 120}ms`;

  return (
    <div
      ref={cardRef}
      style={{ transitionDelay: staggerDelay }}
      className={`group relative flex items-center min-h-[165px] sm:min-h-[180px] pl-3.5 sm:pl-4 pr-12 sm:pr-14 transition-all duration-700 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7 pointer-events-none"
      }`}
    >
      {/* Large Colored Arrow / Hexagonal Back Shape Extending to the Right */}
      <div
        className={`absolute inset-y-1.5 left-7 sm:left-8 right-0 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${item.gradient} flex items-center justify-end pr-3.5 sm:pr-4.5 shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:shadow-[0_12px_28px_rgba(0,0,0,0.18)] z-0`}
        style={{
          clipPath: "polygon(0% 0%, calc(100% - 18px) 0%, 100% 50%, calc(100% - 18px) 100%, 0% 100%)",
        }}
      >
        {/* Large Step Number on the Right */}
        <span className="font-mono text-2xl sm:text-3xl font-black text-white/95 tracking-tight select-none">
          {item.step}
        </span>
      </div>

      {/* Small Colored Icon Badge Overlapping the Left Edge */}
      <div
        className={`absolute -left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 size-11 sm:size-12 rounded-xl rounded-bl-sm bg-gradient-to-br ${item.gradient} border ${item.badgeBorder} shadow-[0_4px_14px_rgba(0,0,0,0.16)] flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 z-20`}
      >
        <IconComponent className="size-5 sm:size-5.5 text-white transition-transform duration-300 group-hover:rotate-6" strokeWidth={2} />
      </div>

      {/* White Rounded Front Card */}
      <div
        className={`relative z-10 w-full bg-white rounded-2xl border border-slate-200/90 ${item.cardBorderHover} shadow-[0_4px_20px_rgba(13,27,42,0.06)] group-hover:shadow-[0_14px_32px_rgba(13,27,42,0.12)] p-5 sm:p-6 pl-12 sm:pl-14 transition-all duration-300 ease-out group-hover:-translate-y-1 flex flex-col justify-center h-full text-left`}
      >
        <span className={`text-[11px] font-bold uppercase tracking-widest ${item.tagColor}`}>
          {item.category}
        </span>
        <h3 className={`mt-0.5 font-display text-lg sm:text-xl font-bold ${item.titleColor} tracking-tight`}>
          {item.title}
        </h3>
        <p className="mt-1.5 text-xs sm:text-[13px] text-gray-600 leading-relaxed font-ui font-medium">
          {item.desc}
        </p>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5 text-xs font-bold font-ui">
          <span className={item.actionColor}>{item.action}:</span>
          <a
            href={item.href}
            className="text-navy hover:text-purple transition-colors font-mono font-semibold"
          >
            {item.contact}
          </a>
        </div>
      </div>
    </div>
  );
}

const faqs = [
  {
    q: "Can I use Hour Stay for multiple properties?",
    a: "Yes. Hour Stay supports multi-property chains. You can access occupancy metrics, guest folios, and centralized channel managers for all your properties from a single owner dashboard."
  },
  {
    q: "Does Hour Stay handle GST tax slab changes automatically?",
    a: "Absolutely. Our GST billing module automatically updates CGST, SGST, and IGST tax splits according to room tariffs, room categories, and current Indian tax rules."
  },
  {
    q: "How fast does the OTA channel manager sync rates and inventory?",
    a: "Hour Stay features a real-time 2-way sync channel manager. Any booking changes, direct walk-ins, or availability updates are synced across MakeMyTrip, Booking.com, Goibibo, and Agoda in under 2 seconds."
  },
  {
    q: "Do you offer training and onboarding support for desk staff?",
    a: "Yes. Every Hour Stay plan includes complimentary onboarding training for your reception, housekeeping, and accounting staff to ensure a smooth transition from day one."
  }
];

function Contact() {
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState({});
  const [contactData, setContactData] = useState({
    name: "Hour Stay Headquarters",
    email: "stay@hourstay.in",
    phone: "+91 141 4055 900",
    address: "2nd Floor, Gulmohar House, Amber Fort Road, Jaipur 302002, Rajasthan",
    hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST (Front Desk Support 24/7)"
  });

  const [dbFaqs, setDbFaqs] = useState([]);

  useEffect(() => {
    publicService.getContact()
      .then(res => {
        if (res.success && res.data) {
          const config = res.data;
          setContactData({
            name: config.name || "Hour Stay Headquarters",
            email: config.email || "stay@hourstay.in",
            phone: config.phone || "+91 141 4055 900",
            address: config.address || "2nd Floor, Gulmohar House, Amber Fort Road, Jaipur 302002, Rajasthan",
            hours: config.hours || "Monday – Saturday, 9:00 AM – 6:00 PM IST (Front Desk Support 24/7)"
          });
        }
      })
      .catch(err => {});

    publicService.getFaqs()
      .then(res => {
        if (res.success && res.data && res.data.length > 0) {
          setDbFaqs(res.data.map(f => ({
            q: f.question,
            a: f.answer
          })));
        }
      })
      .catch(err => {});

    const fetchActiveProperty = () => {
      const activeId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
      publicService.getProperty(activeId)
        .then(res => {
          if (res.success && res.data) {
            const p = res.data;
            setContactData(prev => ({
              ...prev,
              name: p.name,
              email: p.settings?.email || prev.email,
              phone: p.settings?.phone || prev.phone,
              address: `${p.settings?.address || ''}, ${p.city}, ${p.settings?.state || ''} ${p.settings?.pincode || ''}, ${p.settings?.country || ''}`,
              hours: `Check-in: ${p.settings?.checkInTime || '12:00'} · Check-out: ${p.settings?.checkOutTime || '11:00'} (Support 24/7)`
            }));
          }
        })
        .catch(() => {});
    };

    fetchActiveProperty();
    window.addEventListener('selected-property-changed', fetchActiveProperty);
    return () => window.removeEventListener('selected-property-changed', fetchActiveProperty);
  }, []);

  const allFaqs = dbFaqs.length > 0 ? dbFaqs : faqs;
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    phone: "", 
    hotelName: "", 
    subject: "", 
    message: "" 
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError("");

    const validation = validateWithZod(contactFormSchema, {
      name: form.name,
      email: form.email,
      phone: form.phone,
      hotelName: form.hotelName,
      subject: form.hotelName,
      message: form.message
    });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const activeId = localStorage.getItem('selected_property_id') || 'HS-9HQ8P';
      const res = await publicService.submitContact({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        hotelName: form.hotelName.trim(),
        subject: form.hotelName.trim(),
        message: form.message.trim(),
        propertyId: activeId
      });

      if (res && res.success) {
        setSent(true);
        setForm({
          name: "",
          email: "",
          phone: "",
          hotelName: "",
          subject: "",
          message: ""
        });
        setTimeout(() => setSent(false), 8000);
      } else {
        setServerError(res?.message || "Failed to submit inquiry. Please try again.");
      }
    } catch (err) {
      setServerError(err.message || "Failed to submit inquiry. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SiteLayout>
      {/* 1. Hero Section */}
      <section className="relative bg-navy py-16 lg:py-20 text-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(91,33,182,0.12),transparent_50%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1 text-xs font-semibold tracking-wider text-gold uppercase font-ui">
            <Sparkles className="size-3 text-gold" /> Connect With Us
          </span>
          <h1 className="mt-5 font-display text-4xl leading-[1.1] font-bold text-cream sm:text-5xl lg:text-6xl">
            Let's make hotel management <span className="text-[#F5C06A]">simpler</span>.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-300 font-ui">
            Have questions about billing slabs, channel synchronization, or staff onboarding? Our hospitality solutions team is here to help.
          </p>
        </div>
      </section>

      {/* 2. Contact Channels (Sales, Support, Partnerships) */}
      <section className="bg-white py-16 sm:py-20 border-b border-navy/5 relative z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-7 sm:gap-8 lg:grid-cols-3 text-left">
            {contactOptions.map((opt, idx) => (
              <ContactChannelCard key={idx} item={opt} idx={idx} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Form and Contact Info Layout */}
      <section className="bg-cream/40 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] items-start">
            
            {/* Left Column: Office info & Expandable Accordion FAQs */}
            <div className="space-y-12 text-left">
              
              {/* Office Info Card */}
              <div className="rounded-2xl border border-navy/5 bg-white p-6 sm:p-8 shadow-soft">
                <h3 className="font-display text-lg sm:text-xl font-bold text-navy border-b border-navy/5 pb-3 mb-6">
                  {contactData.name}
                </h3>
                <ul className="space-y-5 text-xs sm:text-sm font-ui text-navy">
                  <li className="flex items-start gap-3">
                    <Phone className="size-4.5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Call Support</p>
                      <p className="text-gray-600 mt-0.5">{contactData.phone}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="size-4.5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Email Inquiry</p>
                      <p className="text-gray-600 mt-0.5">{contactData.email}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="size-4.5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Headquarters Office</p>
                      <p className="text-gray-600 mt-0.5">{contactData.address}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 pt-3 border-t border-navy/5 text-[11px] text-gray-500 font-medium">
                    <span>Business Hours: {contactData.hours}</span>
                  </li>
                </ul>
              </div>

              {/* FAQ Accordion Section */}
              <div className="space-y-4">
                <h3 className="font-display text-2xl font-bold text-navy">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {allFaqs.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div 
                        key={idx}
                        className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                          isOpen 
                            ? "bg-[#0B1528] border-gold/40 shadow-[0_8px_24px_rgba(11,21,40,0.25)]" 
                            : "bg-[#0D1B2A] hover:bg-[#111F33] border-white/10 hover:border-white/20 shadow-soft"
                        }`}
                      >
                        <button
                          onClick={() => toggleFaq(idx)}
                          className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-semibold text-xs sm:text-sm text-cream hover:text-white cursor-pointer transition-colors"
                        >
                          <span className="font-display tracking-tight text-sm sm:text-[15px] font-bold text-white pr-4">
                            {faq.q}
                          </span>
                          <span className={`size-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300 ${
                            isOpen ? "bg-gold/20 text-gold rotate-180" : "bg-white/5 text-gold/80 hover:bg-white/10"
                          }`}>
                            <ChevronDown className="size-4 text-gold" />
                          </span>
                        </button>
                        {isOpen && (
                          <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-gray-300 font-ui leading-relaxed border-t border-white/10 pt-3.5 animate-fade-in">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Right Column: Contact Form */}
            <div className="rounded-2xl border border-navy/5 bg-white p-6 sm:p-8 shadow-soft text-left font-ui">
              <h3 className="font-display text-lg sm:text-xl font-bold text-navy border-b border-navy/5 pb-3 mb-6">
                Send a Message
              </h3>

              <form onSubmit={submit} noValidate className="space-y-5">
                {sent && (
                  <Notice tone="success" title="Message sent" className="mb-5">
                    Thank you! Your message has been saved and our hospitality team will reply promptly.
                  </Notice>
                )}
                {serverError && (
                  <Notice tone="error" title="Submission failed" className="mb-5">
                    {serverError}
                  </Notice>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-xs font-bold text-navy ml-2">Full Name</Label>
                    <Input 
                      id="name" 
                      nameOnly
                      placeholder="Ritu Sharma" 
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                      aria-invalid={!!errors["name"]}
                      autoComplete="off"
                    />
                    {errors["name"] && <p className="mt-1 text-[10px] text-error ml-2">{errors["name"]}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs font-bold text-navy ml-2">Mobile Number</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="+91 98290 11223" 
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                      aria-invalid={!!errors["phone"]}
                      autoComplete="off"
                    />
                    {errors["phone"] && <p className="mt-1 text-[10px] text-error ml-2">{errors["phone"]}</p>}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email" className="text-xs font-bold text-navy ml-2">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="ritu@yourhotel.in" 
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                      aria-invalid={!!errors["email"]}
                      autoComplete="off"
                    />
                    {errors["email"] && <p className="mt-1 text-[10px] text-error ml-2">{errors["email"]}</p>}
                  </div>
                  <div>
                    <Label htmlFor="hotel" className="text-xs font-bold text-navy ml-2">Hotel / Property Name</Label>
                    <Input 
                      id="hotel" 
                      placeholder="Gulmohar Palace Jaipur" 
                      value={form.hotelName}
                      onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
                      className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                      aria-invalid={!!errors["hotelName"]}
                      autoComplete="off"
                    />
                    {errors["hotelName"] && <p className="mt-1 text-[10px] text-error ml-2">{errors["hotelName"]}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="subject" className="text-xs font-bold text-navy ml-2">Subject (Optional)</Label>
                  <Input 
                    id="subject" 
                    placeholder="Onboarding demo request / GST pricing query" 
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <Label htmlFor="message" className="text-xs font-bold text-navy ml-2">How can we help?</Label>
                  <Textarea 
                    id="message" 
                    rows={4}
                    placeholder="We run a 64-key resort in Alleppey and need channel manager + GST billing." 
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-1.5 w-full bg-[#FFF7E6] border-none px-5 py-3.5 rounded-2xl shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy transition-all"
                    aria-invalid={!!errors["message"]}
                  />
                  {errors["message"] && <p className="mt-1 text-[10px] text-error ml-2">{errors["message"]}</p>}
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full font-bold bg-navy hover:bg-[#081420] text-cream py-3 rounded-full shadow-[rgba(13,27,42,0.25)_0px_20px_10px_-15px] cursor-pointer border-none transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-[rgba(13,27,42,0.25)_0px_23px_10px_-20px] active:scale-[0.95] active:shadow-[rgba(13,27,42,0.25)_0px_15px_10px_-10px] text-xs uppercase tracking-wide h-12 mt-4 disabled:opacity-50"
                >
                  {submitting ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Request a Demo (Hotel owners focus) */}
      <section className="bg-white py-16 text-center border-t border-navy/5 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(91,33,182,0.03),transparent_60%)]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy">
            Simplify your hotel operations today.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-gray-600 font-ui leading-relaxed">
            Schedule a free 30-minute sandbox demo populated with mock hotel keys.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="rounded-full bg-navy text-cream hover:bg-navy/90 font-semibold px-8 py-6 text-base transition-all duration-300 cursor-pointer shadow-soft">
              <Link to="/contact" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Request a Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}