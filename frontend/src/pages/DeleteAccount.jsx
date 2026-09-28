import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/layouts/SiteLayout";
import { authService } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { 
  Trash2, AlertTriangle, ShieldCheck, CheckCircle2, 
  Clock, ArrowRight, UserX, Database, HelpCircle, 
  Lock, Check, LogIn, AlertCircle, RefreshCw, X, ShieldAlert
} from "lucide-react";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete Account — Hour Stay" },
      {
        name: "description",
        content: "Permanently delete your Hour Stay account, learn what data is removed, and manage your data privacy."
      },
      { property: "og:title", content: "Delete Account — Hour Stay" },
      { property: "og:description", content: "Permanently delete your Hour Stay account and associated data." }
    ]
  }),
  component: DeleteAccountPage
});

export default function DeleteAccountPage() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
  // Modal & Deletion State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [understandPermanent, setUnderstandPermanent] = useState(false);
  const [understandActiveBookings, setUnderstandActiveBookings] = useState(false);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState(4);

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = authService.isAuthenticated();
      setIsAuthenticated(loggedIn);
      if (loggedIn) {
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
      }
      setIsLoadingUser(false);
    };

    checkAuth();
    window.addEventListener('user-profile-updated', checkAuth);
    return () => window.removeEventListener('user-profile-updated', checkAuth);
  }, []);

  // Auto redirect after successful deletion
  useEffect(() => {
    let timer;
    if (deleteSuccess && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (deleteSuccess && redirectCountdown === 0) {
      window.location.href = "/";
    }
    return () => clearTimeout(timer);
  }, [deleteSuccess, redirectCountdown]);

  const handleDeleteAccount = async () => {
    if (!understandPermanent || !understandActiveBookings) {
      setErrorMessage("Please check both confirmation boxes to proceed.");
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const res = await authService.deleteAccount();
      if (res && res.success) {
        setIsModalOpen(false);
        setDeleteSuccess(true);
      } else {
        setErrorMessage(res?.message || "Failed to delete account. Please try again or contact support.");
        setIsDeleting(false);
      }
    } catch (err) {
      console.error("Account deletion failed:", err);
      // If endpoint succeeded or returned message
      if (err.message && err.message.toLowerCase().includes("deleted")) {
        authService.logout();
        setIsModalOpen(false);
        setDeleteSuccess(true);
      } else {
        setErrorMessage(err.message || "An unexpected error occurred while deleting your account.");
        setIsDeleting(false);
      }
    }
  };

  return (
    <SiteLayout>
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-navy text-white pt-24 pb-16 lg:pt-32 lg:pb-20">
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 right-10 size-[420px] rounded-full bg-purple/20 blur-[100px]" />
          <div className="absolute -bottom-40 left-10 size-[350px] rounded-full bg-rose-500/10 blur-[90px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-gold text-xs font-semibold uppercase tracking-wider mb-6">
            <Trash2 className="size-4 text-rose-400" />
            <span>Data Privacy & User Rights</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6">
            Delete Your Account
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg text-gray-300 font-ui leading-relaxed">
            We value your autonomy and data privacy. Review how account deletion works on Hour Stay and securely delete your profile.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="size-4 text-rose-400" />
              <span>Action is Permanent & Irreversible</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span>Indian DPDP & GDPR Compliant</span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12 sm:py-20 bg-cream/40">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          
          {/* SUCCESS STATE */}
          {deleteSuccess ? (
            <div className="rounded-3xl border border-emerald-200 bg-white p-8 sm:p-12 shadow-lg text-center max-w-2xl mx-auto animate-fade-in">
              <div className="size-20 rounded-full bg-emerald-50 border-2 border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center shadow-inner mb-6">
                <CheckCircle2 className="size-10" />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy mb-3">
                Account Successfully Deleted
              </h2>
              <p className="text-sm sm:text-base text-gray-600 font-ui leading-relaxed mb-6">
                Your personal profile, credentials, and active sessions have been permanently removed from our active database. You have been securely logged out.
              </p>

              <div className="bg-[#FAF9F5] rounded-2xl p-4 border border-navy/5 text-xs text-gray-500 font-mono mb-8">
                Redirecting to homepage in <span className="font-bold text-purple text-sm">{redirectCountdown}</span> seconds...
              </div>

              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-full bg-navy text-cream font-bold text-sm hover:bg-purple transition-all shadow-md"
              >
                <span>Return to Home Now</span>
                <ArrowRight className="size-4" />
              </a>
            </div>
          ) : (
            <div className="space-y-10">
              
              {/* Informational Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* 1. Why Deletion is Available */}
                <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-purple/10 text-purple flex items-center justify-center border border-purple/20">
                      <ShieldCheck className="size-5" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-navy">
                      Why Deletion is Available
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 font-ui leading-relaxed">
                    Under the Digital Personal Data Protection standards and global privacy principles, you have the fundamental right to erasure (Right to be Forgotten). Hour Stay provides transparent, self-service account deletion without bureaucratic hurdles.
                  </p>
                </div>

                {/* 2. Active Bookings & Financial Considerations */}
                <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-300">
                      <AlertTriangle className="size-5" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-navy">
                      Active Bookings & Refunds
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 font-ui leading-relaxed">
                    If you currently have upcoming check-ins or uncompleted stays, please cancel or fulfill them and settle all folios before deleting your account. Deleting your account does not automatically process pending booking refunds.
                  </p>
                </div>

                {/* 3. What Data Will Be Deleted */}
                <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
                      <UserX className="size-5" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-navy">
                      Data That Will Be Deleted
                    </h2>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 font-ui">
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Account credentials, password hash, and active JWT auth tokens.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Personal profile information (full name, email, mobile number, avatar).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Notification preferences, FCM push device tokens, and search history.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="size-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>Staff workspace permissions and role associations.</span>
                    </li>
                  </ul>
                </div>

                {/* 4. Data Retained by Law */}
                <div className="rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-200">
                      <Database className="size-5" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-navy">
                      Data Retained Under Law
                    </h2>
                  </div>
                  <ul className="space-y-2.5 text-xs sm:text-sm text-gray-600 font-ui">
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="size-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>Issued GST tax invoices and accounting records required for statutory audit (up to 7 years).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="size-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>Payment transaction gateway IDs and settlement references for dispute auditing.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ShieldCheck className="size-4 text-sky-600 shrink-0 mt-0.5" />
                      <span>Mandatory Form C / government guest register records required by local hotel compliance.</span>
                    </li>
                  </ul>
                </div>

              </div>

              {/* 5. How to Delete Your Account (7-Step Guide) */}
              <div className="rounded-3xl border border-navy/10 bg-white p-6 sm:p-10 shadow-sm text-left">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple/10 text-purple text-xs font-bold uppercase tracking-wider mb-2">
                    <ShieldCheck className="size-3.5" />
                    <span>Step-by-Step Instructions</span>
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy">
                    How to Delete Your Account
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 font-ui mt-1.5 leading-relaxed">
                    Follow these simple steps from the web app or mobile application to delete your account:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { step: "01", title: "Log in", desc: "Log in to your Hour Stay account with your verified credentials." },
                    { step: "02", title: "Open Profile / Account Settings", desc: "Navigate to your profile or workspace account settings." },
                    { step: "03", title: "Select Delete Account", desc: "Click on 'Delete Account' in your privacy and account preferences." },
                    { step: "04", title: "Review Deletion Information", desc: "Review the affected data, ongoing stay policies, and terms." },
                    { step: "05", title: "Verify Your Identity", desc: "Verify your identity when requested via secure active session." },
                    { step: "06", title: "Confirm Delete My Account", desc: "Acknowledge the confirmation dialog and click 'Delete My Account'." },
                    { step: "07", title: "Automatic Secure Logout", desc: "Your account will be securely deleted, and you will be logged out automatically." },
                  ].map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3.5 p-4 rounded-2xl border transition-all ${
                        idx === 6 
                          ? "md:col-span-2 bg-[#FAF9F5] border-purple/20" 
                          : "bg-cream/20 border-navy/5 hover:border-navy/15"
                      }`}
                    >
                      <div className="size-8 rounded-xl bg-gradient-to-br from-navy to-purple text-white flex items-center justify-center font-mono text-xs font-bold shrink-0 shadow-sm">
                        {item.step}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-display text-sm font-bold text-navy">
                          {item.title}
                        </h3>
                        <p className="text-xs text-gray-600 font-ui leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Permanent & Retention Notice Banner */}
                <div className="mt-6 rounded-2xl bg-amber-50/80 border border-amber-200 p-4 sm:p-5 text-amber-950 text-xs sm:text-[13px] font-ui flex items-start gap-3">
                  <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <span className="font-bold text-amber-900">Important Notice:</span>
                    <p className="text-amber-800">
                      Account deletion is permanent and cannot be undone. Certain records (such as GST tax invoices, transaction receipts, and mandatory hotel guest registers) may be retained when required by law or for legitimate financial and transactional obligations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Box: Logged-in Verification OR Sign In Prompt */}
              <div className="rounded-3xl border border-navy/10 bg-white p-6 sm:p-10 shadow-sm text-left">
                {isLoadingUser ? (
                  <div className="flex items-center justify-center py-12 gap-3 text-sm text-gray-500 font-ui">
                    <RefreshCw className="size-5 animate-spin text-purple" />
                    <span>Verifying session status...</span>
                  </div>
                ) : !isAuthenticated ? (
                  /* User is NOT logged in */
                  <div className="text-center py-6 space-y-5 max-w-xl mx-auto">
                    <div className="size-14 rounded-2xl bg-navy/5 text-navy flex items-center justify-center mx-auto">
                      <Lock className="size-7 text-purple" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-navy">
                        Authentication Required
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 font-ui leading-relaxed">
                        To protect accounts from unauthorized deletion, you must be securely signed in to verify ownership before initiating account deletion.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Link
                        to="/login"
                        className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-full bg-navy text-cream font-bold text-xs sm:text-sm hover:bg-purple transition-all shadow-md w-full sm:w-auto"
                      >
                        <LogIn className="size-4" />
                        <span>Sign In to Verify Account</span>
                      </Link>
                      <Link
                        to="/contact"
                        className="inline-flex items-center justify-center h-11 px-6 rounded-full border border-navy/20 text-navy font-bold text-xs sm:text-sm hover:bg-navy/5 transition-all w-full sm:w-auto"
                      >
                        <span>Contact Support</span>
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* User IS logged in */
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-navy/10">
                      <div>
                        <div className="flex items-center gap-2 text-rose-600 font-bold text-xs uppercase tracking-wider mb-1">
                          <AlertCircle className="size-4" />
                          <span>Verified Authenticated User</span>
                        </div>
                        <h3 className="font-display text-xl sm:text-2xl font-bold text-navy">
                          Confirm Account To Delete
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 font-ui mt-1">
                          The following account will be permanently erased upon confirmation:
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF9F5] border border-navy/10 p-4 shrink-0 text-left min-w-[240px]">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-mono mb-1">Active Account</div>
                        <div className="font-display font-bold text-navy text-base">{user?.name || "Hour Stay User"}</div>
                        <div className="text-xs text-purple font-medium">{user?.email || "No email available"}</div>
                        <div className="text-[11px] text-gray-500 capitalize mt-1">Role: {user?.role || "Guest"}</div>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-rose-50 border border-rose-200 p-5 text-rose-900 text-xs sm:text-sm flex items-start gap-3">
                      <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold">Permanent Loss of Access:</span>
                        <p className="leading-relaxed text-rose-800">
                          Once deleted, you will immediately lose access to your past reservations, folios, and member preferences. This operation cannot be reversed by our support team.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-gray-500 font-ui">
                        Ready to proceed? Click below to open the confirmation modal.
                      </p>
                      <Button
                        type="button"
                        onClick={() => {
                          setErrorMessage("");
                          setIsModalOpen(true);
                        }}
                        className="w-full sm:w-auto h-12 px-8 rounded-full bg-rose-600 text-white hover:bg-rose-700 font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <Trash2 className="size-4" />
                        <span>Delete My Account</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </section>

      {/* CONFIRMATION MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-navy/10 text-left">
            
            {/* Close Button */}
            <button
              onClick={() => !isDeleting && setIsModalOpen(false)}
              disabled={isDeleting}
              className="absolute top-5 right-5 grid size-9 place-items-center rounded-full text-gray-400 hover:text-navy hover:bg-navy/5 transition-all"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="size-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200">
                <Trash2 className="size-6" />
              </div>
              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-navy">
                  Permanent Account Deletion
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 font-ui leading-relaxed mb-6">
              You are about to permanently delete the account for <strong className="text-navy">{user?.email}</strong>. Please confirm your intent by reviewing and checking the conditions below:
            </p>

            {errorMessage && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Confirmation Checkboxes */}
            <div className="space-y-3 mb-6 bg-[#FAF9F5] p-4 rounded-2xl border border-navy/5 text-xs text-navy font-ui">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={understandPermanent}
                  onChange={(e) => setUnderstandPermanent(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-0.5 size-4 rounded border-navy/20 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="leading-snug">
                  I understand that this action is permanent. All my profile details, logins, and settings will be permanently erased.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={understandActiveBookings}
                  onChange={(e) => setUnderstandActiveBookings(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-0.5 size-4 rounded border-navy/20 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="leading-snug">
                  I confirm that I have no pending stays or that I accept forfeiting active reservations without automatic refund.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto h-11 px-6 rounded-full border-navy/20 text-navy font-bold text-xs sm:text-sm hover:bg-navy/5"
              >
                Cancel & Keep Account
              </Button>

              <Button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || !understandPermanent || !understandActiveBookings}
                className="w-full sm:w-auto h-11 px-7 rounded-full bg-rose-600 text-white hover:bg-rose-700 font-bold text-xs sm:text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    <span>Yes, Permanently Delete</span>
                  </>
                )}
              </Button>
            </div>

          </div>
        </div>
      )}

    </SiteLayout>
  );
}
