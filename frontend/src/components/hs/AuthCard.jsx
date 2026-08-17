import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Notice } from "./kit";
import { Logo } from "@/layouts/Logo";
import { authService } from "../../services/auth";
import { Eye, EyeOff } from "lucide-react";

export function AuthCard({
  mode = "login",
  title,
  subtitle,
  footer,
  children
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const searchParams = new URLSearchParams(window.location.search);
  const queryEmail = searchParams.get("email") || "";
  const queryOtp = searchParams.get("otp") || "";

  const submit = async (e) => {
    e.preventDefault();

    if (mode === "otp") {
      if (otp.trim().length < 6) return setError("Enter a valid 6-digit verification code");
    } else if (mode === "reset") {
      if (password.length < 6) return setError("Password must be at least 6 characters");
      if (password !== confirmPassword) return setError("Passwords do not match");
    } else {
      if (!/^\S+@\S+\.\S+$/.test(email) && mode !== "register") {
        return setError("Enter a valid email address");
      }
      if (mode === "register" && !name.trim()) {
        return setError("Full name is required");
      }
      if (mode !== "forgot" && password.length < 6) {
        return setError("Password must be at least 6 characters");
      }
    }

    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await authService.login(email, password);
        if (res.success) {
          const redirectMap = {
            "super-admin": "/super-admin",
            "admin": "/admin",
            "manager": "/manager",
            "receptionist": "/reception",
            "guest": "/guest"
          };
          const path = redirectMap[res.data.user.role] || "/guest";
          navigate({ to: path });
        }
      } else if (mode === "register") {
        const res = await authService.register(name, email, password, mobile, "guest");
        if (res.success) {
          navigate({ to: "/guest" });
        }
      } else if (mode === "forgot") {
        const res = await authService.forgotPassword(email);
        if (res.success) {
          setDone(true);
          setTimeout(() => {
            navigate({ to: `/verify-otp?email=${encodeURIComponent(email)}` });
          }, 1500);
        }
      } else if (mode === "otp") {
        const targetEmail = queryEmail || email;
        const res = await authService.verifyOtp(targetEmail, otp);
        if (res.success) {
          setDone(true);
          setTimeout(() => {
            navigate({ to: `/reset-password?email=${encodeURIComponent(targetEmail)}&otp=${otp}` });
          }, 1500);
        }
      } else if (mode === "reset") {
        const targetEmail = queryEmail || email;
        const targetOtp = queryOtp || otp;
        const res = await authService.resetPassword(targetEmail, targetOtp, password);
        if (res.success) {
          setDone(true);
          setTimeout(() => {
            navigate({ to: "/login" });
          }, 2000);
        }
      }
    } catch (err) {
      setError(err.message || "An authentication error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto flex max-w-[480px] w-full flex-col px-3 py-4 sm:px-6">
      <div className="rounded-[40px] border-[5px] border-white/95 bg-[#FFF7E6] p-[35px_30px_25px_30px] shadow-[0_20px_50px_rgba(13,27,42,0.35)] text-center font-ui relative overflow-hidden backdrop-blur-md">
        
        {/* Back to Home Link */}
        {mode === "login" && (
          <Link 
            to="/" 
            className="absolute top-5 left-6 text-[10px] font-bold text-navy/40 hover:text-purple transition-colors flex items-center gap-1 uppercase tracking-wider"
          >
            ← Home
          </Link>
        )}

        {/* Centered Logo (Icon Only) */}
        <div className="flex justify-center mt-3 mb-2">
          <Logo compact={true} className="justify-center mx-auto" removeBg={true} />
        </div>

        <h1 className="mt-4 font-display text-[26px] font-black text-navy text-center leading-tight">{title}</h1>
        <p className="mt-1.5 text-xs text-muted-foreground text-center leading-relaxed">{subtitle}</p>

        {done && (
          <Notice
            tone="success"
            title={
              mode === "forgot" ? "Reset link sent" :
              mode === "reset" ? "Password reset successfully" :
              mode === "otp" ? "OTP verified successfully" :
              "Signed in (demo)"
            }
            className="mt-5 text-left"
          >
            This is a UI demo — select your option below to explore.
          </Notice>
        )}
        {error && <Notice tone="error" title={error} className="mt-5 text-left" />}

        <form onSubmit={submit} noValidate className="mt-6 text-left space-y-4">
          {mode === "register" && (
            <div>
              <Label htmlFor="name" className="sr-only">Full Name</Label>
              <Input 
                id="name" 
                className="w-full bg-white border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          
          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <div>
              <Label htmlFor="email" className="sr-only">Email</Label>
              <Input
                id="email"
                type="email"
                className="w-full bg-white border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                placeholder="E-mail"
                value={email}
                aria-invalid={!!error}
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="off"
              />
            </div>
          )}

          {mode === "otp" && (
            <div>
              <Label htmlFor="otp" className="sr-only">One-Time Password</Label>
              <Input 
                id="otp" 
                type="text"
                maxLength={6}
                className="w-full bg-white border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-center tracking-[0.4em] font-bold text-sm text-navy h-12 transition-all" 
                placeholder="• • • • • •" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="one-time-code"
              />
              <div className="mt-2 text-center">
                <button type="button" className="text-[11px] text-[#0099ff] hover:underline font-semibold bg-transparent border-none cursor-pointer">
                  Resend OTP Code
                </button>
              </div>
            </div>
          )}
          
          {(mode === "login" || mode === "register") && (
            <div>
              <div className="relative">
                <Label htmlFor="password" className="sr-only">Password</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-white border-none pl-5 pr-12 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === "login" && (
                <div className="mt-2 pl-2 text-left">
                  <Link to="/forgot-password" className="text-[11px] text-[#0099ff] hover:underline font-semibold">
                    Forgot Password ?
                  </Link>
                </div>
              )}
            </div>
          )}

          {mode === "reset" && (
            <>
              <div className="relative">
                <Label htmlFor="new-password" className="sr-only">New Password</Label>
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-white border-none pl-5 pr-12 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="relative">
                <Label htmlFor="confirm-password" className="sr-only">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full bg-white border-none pl-5 pr-12 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70 transition-colors focus:outline-none cursor-pointer p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </>
          )}
          
          {mode === "register" && (
            <div>
              <Label htmlFor="mobile" className="sr-only">Mobile</Label>
              <Input 
                id="mobile" 
                className="w-full bg-white border-none px-5 py-3 rounded-full shadow-[0_10px_10px_-5px_#E7E9EE] border-x-2 border-y-0 border-x-transparent focus:outline-none focus:border-x-[#12B1D1] focus-visible:ring-0 focus-visible:ring-offset-0 text-xs text-navy h-12 transition-all" 
                placeholder="Mobile Number" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          
          <button 
            type="submit" 
            className="w-full font-bold bg-navy hover:bg-[#081420] text-cream py-3 rounded-full shadow-[rgba(13,27,42,0.25)_0px_20px_10px_-15px] cursor-pointer border-none transition-all duration-200 ease-in-out hover:scale-[1.03] hover:shadow-[rgba(13,27,42,0.25)_0px_23px_10px_-20px] active:scale-[0.95] active:shadow-[rgba(13,27,42,0.25)_0px_15px_10px_-10px] text-xs uppercase tracking-wide h-12 mt-4"
            disabled={loading}
          >
            {loading ? "Please wait…" : 
              mode === "login" ? "Sign In" : 
              mode === "register" ? "Create Account" : 
              mode === "reset" ? "Reset Password" :
              mode === "otp" ? "Verify Code" :
              "Send Reset Link"}
          </button>
        </form>

        {children}

        {/* Social Accounts Container */}
        <div className="mt-6 flex flex-col items-center border-t border-navy/5 pt-4">
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
            Or Sign in with
          </span>
          <div className="mt-2.5 flex justify-center gap-3.5">
            <button 
              type="button"
              className="bg-white border-[3px] border-white ring-1 ring-navy/10 rounded-full size-10 flex items-center justify-center shadow-[rgba(13,27,42,0.06)_0px_10px_10px_-5px] transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Sign in with Google"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.5 24c0-1.61-.15-3.16-.42-4.69H24v9.09h12.75c-.53 2.87-2.13 5.31-4.59 7.03l7.07 5.48C43.5 36.5 46.5 30.82 46.5 24z"/>
                <path fill="#FBBC05" d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.07-5.48c-1.97 1.33-4.49 2.12-8.82 2.12-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            </button>
            <button 
              type="button"
              className="bg-white border-[3px] border-white ring-1 ring-navy/10 rounded-full size-10 flex items-center justify-center shadow-[rgba(13,27,42,0.06)_0px_10px_10px_-5px] transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Sign in with Apple"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" className="size-4 fill-black">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
            </button>
            <button 
              type="button"
              className="bg-white border-[3px] border-white ring-1 ring-navy/10 rounded-full size-10 flex items-center justify-center shadow-[rgba(13,27,42,0.06)_0px_10px_10px_-5px] transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
              aria-label="Sign in with Twitter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="size-3.5 fill-black">
                <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z" />
              </svg>
            </button>
          </div>
        </div>

        {footer && <p className="mt-5 text-center text-xs text-muted-foreground">{footer}</p>}
      </div>
    </section>
  );
}