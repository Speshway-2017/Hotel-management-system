import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png";
import { cn } from "@/utils/utils";

export function Logo({
  to = "/",
  tone = "dark",
  compact = false,
  className,
  imgClassName
}) {
  return (
    <Link
      to={to}
      className={cn("flex items-center gap-3 sm:gap-4 min-h-11 hover:opacity-95 transition-opacity", className)}
      aria-label="Hour Stay home">
      <img
        src={logo}
        alt="Hour Stay"
        width={36}
        height={36}
        className={cn("h-8 w-8 sm:h-9 sm:w-9 object-contain bg-white p-1 rounded-xl shadow-soft", imgClassName)}
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
        </span>
      }
    </Link>);
}