import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { cn } from "@/utils/utils";

export function Logo({
  to = "/",
  tone = "dark",
  compact = false,
  className





}) {
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-3 sm:gap-4 min-h-11 hover:opacity-95 transition-opacity", className)}
      aria-label="Hour Stay home">
      <img
        src={logo}
        alt="Hour Stay"
        width={56}
        height={56}
        className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
      {!compact &&
      <span className="flex flex-col justify-center leading-tight">
          <span
          className={cn(
            "block font-display text-xl sm:text-2xl font-bold tracking-tight",
            tone === "light" ? "text-cream" : "text-navy dark:text-foreground"
          )}>
            Hour <span className="text-[#F5C06A]">Stay</span>
          </span>
          <span
          className={cn(
            "block text-[8px] sm:text-[9px] uppercase tracking-[0.18em] font-semibold mt-0.5",
            tone === "light" ? "text-gold" : "text-muted-foreground"
          )}>
            Stay for Hours, Pay for Time
          </span>
        </span>
      }
    </Link>);

}