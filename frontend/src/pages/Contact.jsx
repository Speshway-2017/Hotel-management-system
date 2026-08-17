import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Mail, MapPin, Phone, ChevronDown, ChevronUp, 
  Sparkles, ShoppingCart, LifeBuoy, Handshake, Check 
} from "lucide-react";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Notice } from "@/components/hs/kit";

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
    icon: ShoppingCart,
    title: "Sales Inquiry",
    desc: "Interested in onboarding your property? Talk to our sales team about custom plan pricing and keys scale.",
    action: "Call Sales",
    contact: "+91 141 4055 901"
  },
  {
    icon: LifeBuoy,
    title: "Support & Training",
    desc: "Run into issues during check-in or billing? Our front-desk support team is available 24/7.",
    action: "Contact Support",
    contact: "support@hourstay.in"
  },
  {
    icon: Handshake,
    title: "Partnerships",
    desc: "OTA networks, corporate travel agencies, or hospitality consultants looking to integrate with Hour Stay.",
    action: "Email Partnerships",
    contact: "partners@hourstay.in"
  }
];

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
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!form.name.trim()) next["name"] = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next["email"] = "Enter a valid email address";
    if (!/^(\+91[\s-]?)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
      next["phone"] = "Enter a valid 10-digit Indian mobile number";
    }
    if (!form.hotelName.trim()) next["hotelName"] = "Please enter your hotel/property name";
    if (form.message.trim().length < 10) next["message"] = "Tell us a little more (10+ characters)";
    
    setErrors(next);
    const hasNoErrors = Object.keys(next).length === 0;
    setSent(hasNoErrors);

    if (hasNoErrors) {
      // Clear form
      setForm({
        name: "",
        email: "",
        phone: "",
        hotelName: "",
        subject: "",
        message: ""
      });
      setTimeout(() => setSent(false), 6000);
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
          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-cream/70 font-ui">
            Have questions about billing slabs, channel synchronization, or staff onboarding? Our hospitality solutions team is here to help.
          </p>
        </div>
      </section>

      {/* 2. Contact Options */}
      <section className="bg-cream py-12 border-b border-navy/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            {contactOptions.map((opt, idx) => {
              const OptIcon = opt.icon;
              return (
                <div key={idx} className="card-guest border border-navy/5 bg-white p-6 text-left shadow-soft">
                  <span className="inline-flex size-10 items-center justify-center rounded-lg bg-purple/10 text-purple mb-4">
                    <OptIcon className="size-5" />
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-bold text-navy">{opt.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground font-ui leading-relaxed">{opt.desc}</p>
                  <p className="mt-4 pt-3 border-t border-navy/5 text-xs font-bold text-purple font-ui">
                    {opt.action}: <span className="text-navy">{opt.contact}</span>
                  </p>
                </div>
              );
            })}
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
                      <p className="text-muted-foreground mt-0.5">{contactData.phone}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Mail className="size-4.5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Email Inquiry</p>
                      <p className="text-muted-foreground mt-0.5">{contactData.email}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="size-4.5 text-gold shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Headquarters Office</p>
                      <p className="text-muted-foreground mt-0.5">{contactData.address}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 pt-3 border-t border-navy/5 text-[11px] text-muted-foreground font-medium">
                    <span>Business Hours: {contactData.hours}</span>
                  </li>
                </ul>
              </div>

              {/* FAQ Accordion Section */}
              <div className="space-y-4">
                <h3 className="font-display text-lg sm:text-xl font-bold text-navy">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-2">
                  {allFaqs.map((faq, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div 
                        key={idx}
                        className="rounded-xl border border-navy/5 bg-white overflow-hidden shadow-soft transition-all duration-300"
                      >
                        <button
                          onClick={() => toggleFaq(idx)}
                          className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs sm:text-sm text-navy hover:text-purple cursor-pointer transition-colors"
                        >
                          <span>{faq.q}</span>
                          {isOpen ? <ChevronUp className="size-4 text-gold shrink-0" /> : <ChevronDown className="size-4 text-gold shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-xs sm:text-sm text-muted-foreground font-ui leading-relaxed border-t border-navy/5 pt-3 animate-fade-in">
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
                    Our Jaipur team replies within one working day.
                  </Notice>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name" className="text-xs font-bold text-navy ml-2">Full Name</Label>
                    <Input 
                      id="name" 
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
                  className="w-full font-bold bg-navy hover:bg-[#081420] text-cream py-3 rounded-full shadow-[rgba(13,27,42,0.25)_0px_20px_10px_-15px] cursor-pointer border-none transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-[rgba(13,27,42,0.25)_0px_23px_10px_-20px] active:scale-[0.95] active:shadow-[rgba(13,27,42,0.25)_0px_15px_10px_-10px] text-xs uppercase tracking-wide h-12 mt-4"
                >
                  Send Message
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
          <h2 className="font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
            Simplify your hotel operations today.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground font-ui">
            Schedule a free 30-minute sandbox demo populated with mock hotel keys.
          </p>
          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="rounded-full bg-navy text-cream hover:bg-navy/90 font-semibold px-8 py-6 text-base transition-all duration-300 cursor-pointer shadow-soft">
              <Link to="/contact" onClick={() => window.scrollTo(0, 300)}>Request a Demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}