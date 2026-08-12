import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";

const links = [
{ label: "Home", to: "/" },
{ label: "Features", to: "/features" },
{ label: "About", to: "/about" },
{ label: "Blog", to: "/blog" },
{ label: "Contact", to: "/contact" }];


export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {links.map((l) =>
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-navy/75 transition-colors hover:bg-navy/5 hover:text-navy",
              pathname === l.to && "text-navy"
            )}>
              {l.label}
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button asChild variant="ghost" className="hidden min-h-11 sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Link
            to="/search"
            className="hidden sm:flex justify-center items-center px-5 py-2 bg-navy text-white outline-3 outline-navy outline-offset-[-3px] rounded-md font-bold text-sm transition-all duration-400 hover:bg-transparent hover:text-navy"
          >
            <span>Book a stay</span>
          </Link>
          <button
            className="grid size-11 place-items-center rounded-md text-navy lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu">
            
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open &&
      <div className="border-t border-navy/10 bg-cream px-4 pb-4 lg:hidden animate-fade-in">
          <nav className="flex flex-col">
            {links.map((l) =>
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center border-b border-navy/5 text-sm font-medium text-navy">
            
                {l.label}
              </Link>
          )}
            <div className="mt-3 flex gap-2">
              <Button asChild variant="outline" className="min-h-11 flex-1">
                <Link to="/login">Sign in</Link>
              </Button>
              <Link
                to="/search"
                className="flex justify-center items-center px-5 py-2.5 bg-navy text-white outline-3 outline-navy outline-offset-[-3px] rounded-md font-bold text-sm transition-all duration-400 hover:bg-transparent hover:text-navy flex-1"
                onClick={() => setOpen(false)}
              >
                <span>Book a stay</span>
              </Link>
            </div>
          </nav>
        </div>
      }
    </header>);

}

export function SiteFooter() {
  return (
    <footer className="bg-navy text-[#FFF7E6]/75 border-t-2 border-purple/30 pt-16 pb-8 font-ui relative overflow-hidden">
      
      {/* Subtle Purple Accent Radial Glows */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-40 right-10 size-[320px] rounded-full bg-purple/10 blur-[90px]" />
        <div className="absolute -bottom-40 left-10 size-[320px] rounded-full bg-purple/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 grid gap-10 sm:grid-cols-2 md:grid-cols-4 text-left">
        
        {/* Column 1 - Brand */}
        <div className="space-y-6">
          <Logo tone="light" />
          <p className="text-xs sm:text-sm font-semibold tracking-wider text-gold uppercase">
            "Stay for hours, pay for time."
          </p>
          <p className="text-xs sm:text-sm leading-relaxed text-[#FFF7E6]/70">
            A calm, premium property management suite built for Indian hospitality.
          </p>
          <div className="flex gap-4 pt-2">
            {[
              { icon: Facebook, label: "Facebook" },
              { icon: Twitter, label: "Twitter" },
              { icon: Instagram, label: "Instagram" },
              { icon: Linkedin, label: "Linkedin" }
            ].map((soc, i) => {
              const Icon = soc.icon;
              return (
                <a 
                  key={i} 
                  href="#" 
                  className="text-[#FFF7E6]/50 hover:text-gold hover:scale-110 transition-all duration-200"
                  aria-label={soc.label}
                >
                  <Icon className="size-4.5" />
                </a>
              );
            })}
          </div>
        </div>

        {/* Column 2 - Product */}
        <div className="space-y-4">
          <p className="font-display text-base font-bold text-cream tracking-wide">Product</p>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            {[
              { label: "Features", to: "/features" },
              { label: "Front Desk", to: "/reception" },
              { label: "Reservations", to: "/search" },
              { label: "GST Billing", to: "/features" },
              { label: "Guest Experience", to: "/guest" },
              { label: "Analytics", to: "/admin" }
            ].map((item, idx) => (
              <li key={idx}>
                <Link to={item.to} className="hover:text-gold hover:translate-x-1 transition-all duration-300 block py-0.5">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 - Company */}
        <div className="space-y-4">
          <p className="font-display text-base font-bold text-cream tracking-wide">Company</p>
          <ul className="space-y-2.5 text-xs sm:text-sm">
            {[
              { label: "About Us", to: "/about" },
              { label: "Blog", to: "/blog" },
              { label: "Contact", to: "/contact" },
              { label: "Careers", to: "/contact" },
              { label: "Privacy Policy", to: "/" },
              { label: "Terms & Conditions", to: "/" }
            ].map((item, idx) => (
              <li key={idx}>
                <Link to={item.to} className="hover:text-gold hover:translate-x-1 transition-all duration-300 block py-0.5">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4 - Contact */}
        <div className="space-y-5">
          <p className="font-display text-base font-bold text-cream tracking-wide">Contact</p>
          <ul className="space-y-3 text-xs sm:text-sm text-[#FFF7E6]/70">
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-gold shrink-0" />
              <span>+91 141 4055 900</span>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-gold shrink-0" />
              <span>stay@hourstay.in</span>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="size-4 text-gold shrink-0 mt-0.5" />
              <span>Amber Fort Road, Jaipur, Rajasthan 302002</span>
            </li>
          </ul>

          <div className="pt-2 flex flex-col gap-2.5 max-w-[200px]">
            <Link
              to="/search"
              className="flex justify-center items-center h-10 px-4 rounded bg-gold text-navy hover:bg-gold/90 font-bold text-xs transition-all duration-300 hover:scale-[1.02] shadow-[rgba(91,33,182,0.25)_0px_8px_16px_-4px] hover:shadow-[rgba(91,33,182,0.35)_0px_10px_20px_-4px]"
            >
              Book a Stay
            </Link>
            <Link
              to="/contact"
              className="flex justify-center items-center h-10 px-4 rounded border border-purple/40 hover:border-gold hover:text-gold hover:bg-purple/10 font-bold text-xs transition-all duration-300 hover:scale-[1.02]"
            >
              Request a Demo
            </Link>
          </div>
        </div>

      </div>

      {/* Divider & Bottom Bar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mt-16 pt-6 border-t border-[#FFF7E6]/10 relative z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-[#FFF7E6]/50">
          <p>© 2026 Hour Stay. All rights reserved.</p>
          <div className="flex justify-center gap-4">
            <Link to="/" className="hover:text-gold transition-colors">Privacy Policy</Link>
            <span>|</span>
            <Link to="/" className="hover:text-gold transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-foreground">
      <SiteHeader />
      <main className="flex-1 animate-fade-in">{children}</main>
      <SiteFooter />
    </div>
  );
}