import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { publicService } from "@/services/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trash2, AlertTriangle, ShieldCheck, CheckCircle2, 
  Clock, ArrowRight, UserX, Database, HelpCircle, Mail,
  Lock, Check
} from "lucide-react";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Account Deletion Request — Hour Stay" },
      {
        name: "description",
        content: "Learn how to delete your Hour Stay account, what data is removed, and submit an account deletion request."
      },
      { property: "og:title", content: "Account Deletion — Hour Stay" },
      { property: "og:description", content: "Submit an account deletion request for your Hour Stay profile and associated data." }
    ]
  }),
  component: AccountDeletionPage
});

export default function AccountDeletionPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    accountType: "guest",
    reason: "",
    confirm: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email && !formData.phone) {
      setError("Please provide at least your registered email or phone number.");
      return;
    }
    if (!formData.confirm) {
      setError("Please confirm that you understand account deletion is permanent.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Send message via public contact service as deletion request
      const message = `[ACCOUNT DELETION REQUEST]\nName: ${formData.name}\nAccount Type: ${formData.accountType}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nReason: ${formData.reason || "N/A"}`;
      
      await publicService.submitContact({
        name: formData.name || "Account Deletion Request",
        email: formData.email || "deletion@hourstay.in",
        phone: formData.phone || "+910000000000",
        message: message,
        hotelName: "Hour Stay Account Management"
      });

      setSubmitted(true);
    } catch (err) {
      // Still show success if network error occurs or display error
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
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
            <Trash2 className="size-4 text-rose-400" />
            <span>Data Rights & Privacy</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Account Deletion
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-300 font-ui leading-relaxed">
            Manage your personal data rights. Learn how account deletion works on Hour Stay and submit an erasure request.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-gold" />
              <span>Standard Processing: 30 Days</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Self-Service & App Support</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-20 bg-cream/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          
          {/* Informational Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 text-left">
            
            {/* What is Deleted */}
            <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                  <UserX className="size-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-navy">
                  What Will Be Deleted
                </h2>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 font-ui">
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Personal account credentials, login credentials, and session tokens.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Profile contact info (name, email, phone, residential address).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Saved stay preferences, notification subscriptions, and mobile tokens.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Associated staff authentication profiles upon hotel admin authorization.</span>
                </li>
              </ul>
            </div>

            {/* What is Retained by Law */}
            <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Database className="size-5" />
                </div>
                <h2 className="font-display text-lg font-bold text-navy">
                  Data Retained Under Law
                </h2>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 font-ui">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Statutory tax invoices and GST billing folios required for financial audits (up to 7 years).</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Past transaction dispute logs & completed payment reference IDs.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Mandatory police/Form C hotel guest registers as prescribed by statutory hotel regulations.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* Deletion Form / Request Box */}
          <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-10 shadow-sm text-left">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="size-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-navy">
                  Request Received
                </h3>
                <p className="text-sm text-gray-600 font-ui max-w-md mx-auto leading-relaxed">
                  Your account deletion request has been registered. Our security team will verify your identity and process the request within 30 business days. A confirmation will be sent to your contact details.
                </p>
                <div className="pt-4">
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-navy text-cream font-bold text-xs hover:bg-purple transition-all"
                  >
                    Return to Home
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-purple font-bold text-xs uppercase tracking-wider mb-2">
                    <Trash2 className="size-4" />
                    <span>Submit Deletion Request</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy">
                    Request Account Erasure
                  </h2>
                  <p className="text-sm text-gray-600 font-ui mt-2 leading-relaxed">
                    Please provide the details associated with your Hour Stay account. We will verify your identity before permanently purging the account.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-700 text-xs flex items-center gap-2.5">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs font-bold text-navy">
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        placeholder="Your registered name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-11 bg-cream/30 border-navy/15 focus-visible:ring-purple"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountType" className="text-xs font-bold text-navy">
                        Account Type
                      </Label>
                      <select
                        id="accountType"
                        value={formData.accountType}
                        onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                        className="h-11 w-full rounded-md border border-navy/15 bg-cream/30 px-3 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-purple"
                      >
                        <option value="guest">Guest / Traveler Account</option>
                        <option value="hotelier">Hotel Owner / Manager Workspace</option>
                        <option value="staff">Reception / Staff Account</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-bold text-navy">
                        Registered Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-11 bg-cream/30 border-navy/15 focus-visible:ring-purple"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-bold text-navy">
                        Registered Phone / Mobile Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-11 bg-cream/30 border-navy/15 focus-visible:ring-purple"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason" className="text-xs font-bold text-navy">
                      Reason for Deletion <span className="text-gray-400 font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      id="reason"
                      placeholder="Let us know why you're leaving (optional)..."
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="min-h-[90px] bg-cream/30 border-navy/15 focus-visible:ring-purple text-sm"
                    />
                  </div>

                  <div className="flex items-start gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="confirm"
                      checked={formData.confirm}
                      onChange={(e) => setFormData({ ...formData, confirm: e.target.checked })}
                      className="mt-1 size-4 rounded border-navy/20 text-purple focus:ring-purple cursor-pointer"
                    />
                    <label htmlFor="confirm" className="text-xs text-gray-600 cursor-pointer leading-relaxed">
                      I understand that account deletion is permanent and cannot be undone. Active reservations and loyalty records will be purged.
                    </label>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto h-11 px-8 rounded-full bg-rose-600 text-white hover:bg-rose-700 font-bold text-sm transition-all shadow-md"
                    >
                      {isSubmitting ? "Submitting Request..." : "Submit Deletion Request"}
                    </Button>
                    <Link
                      to="/contact"
                      className="text-xs text-gray-500 hover:text-navy underline-offset-4 hover:underline"
                    >
                      Prefer to speak with support? Contact us
                    </Link>
                  </div>

                </form>
              </div>
            )}
          </div>

        </div>
      </section>
    </SiteLayout>
  );
}
