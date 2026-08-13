import { useState, useEffect } from "react";
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
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-40 transition-all duration-300 w-full border-b",
      scrolled 
        ? "bg-cream/90 backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(13,27,42,0.08)] border-navy/5 py-2" 
        : "bg-cream/50 backdrop-blur-sm border-transparent py-4"
    )}>
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 transition-all duration-300">
        <Logo />
        <nav className="ml-auto hidden items-center gap-8 lg:flex">
          {links.map((l) =>
          <Link
            key={l.to}
            to={l.to}
            className={cn(
              "group relative flex min-h-11 items-center px-1 text-sm font-medium tracking-wide text-navy/70 transition-all duration-300 hover:text-purple",
              pathname === l.to && "text-navy font-semibold"
            )}>
              <span>{l.label}</span>
              <span className={cn(
                "absolute bottom-1 left-0 h-[2px] bg-gradient-to-r from-gold to-purple transition-all duration-300",
                pathname === l.to ? "w-full opacity-100" : "w-0 opacity-0 group-hover:w-full group-hover:opacity-100"
              )} />
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <Link 
            to="/login"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium tracking-wide text-navy/75 hover:text-purple hover:-translate-y-0.5 transition-all duration-300"
          >
            Sign in
          </Link>
          <Link
            to="/search"
            className="relative overflow-hidden group hidden sm:flex justify-center items-center px-6 py-2.5 bg-gradient-to-r from-navy via-navy to-purple text-cream rounded-full font-bold text-sm transition-all duration-300 shadow-[0_4px_14px_rgba(91,33,182,0.15)] hover:shadow-[0_6px_20px_rgba(91,33,182,0.25)] hover:scale-[1.02] hover:-translate-y-0.5"
          >
            <span className="relative z-10">Book a stay</span>
            <span className="absolute inset-0 bg-gradient-to-r from-purple via-[#FF6B8B] to-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </Link>
          <button
            className="grid size-11 place-items-center rounded-full text-navy/80 hover:text-navy hover:bg-navy/5 transition-all duration-300 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu">
            
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open &&
      <div className="border-t border-navy/5 bg-cream/95 backdrop-blur-md px-6 py-4 lg:hidden animate-fade-in shadow-inner">
          <nav className="flex flex-col gap-2">
            {links.map((l) =>
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setOpen(false)}
            className={cn(
              "relative flex min-h-11 items-center justify-between text-sm font-medium tracking-wide text-navy/80 py-2 border-b border-navy/5 hover:text-purple transition-colors",
              pathname === l.to && "text-purple font-semibold"
            )}>
                <span>{l.label}</span>
                {pathname === l.to && (
                  <span className="size-1.5 rounded-full bg-gold" />
                )}
              </Link>
          )}
            <div className="mt-6 flex flex-col gap-3">
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex h-11 items-center justify-center rounded-full border border-navy/20 text-navy font-bold text-sm hover:bg-navy/5 transition-all duration-300"
              >
                Sign in
              </Link>
              <Link
                to="/search"
                className="relative overflow-hidden group flex h-11 items-center justify-center bg-gradient-to-r from-navy via-navy to-purple text-cream rounded-full font-bold text-sm transition-all duration-300 shadow-[0_4px_14px_rgba(91,33,182,0.15)]"
                onClick={() => setOpen(false)}
              >
                <span className="relative z-10">Book a stay</span>
                <span className="absolute inset-0 bg-gradient-to-r from-purple via-[#FF6B8B] to-gold opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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