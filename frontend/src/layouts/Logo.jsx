import { Link } from "@tanstack/react-router";
import logoDefault from "@/assets/logo.png";
import { cn } from "@/utils/utils";
import { useEffect, useState } from "react";

import { publicService } from "@/services/public";

export function Logo({
  to = "/",
  tone = "dark",
  compact = false,
  className,
  imgClassName,
  removeBg = false
}) {
  const [logoData, setLogoData] = useState({
    name: "Hour Stay",
    logoUrl: logoDefault
  });

  useEffect(() => {
    publicService.getBranding()
      .then(res => {
        if (res.success && res.data) {
          const branding = res.data;
          setLogoData({
            name: branding.name || "Hour Stay",
            logoUrl: branding.content || logoDefault
          });
        }
      })
      .catch(err => {});
  }, []);

  const name = logoData.name || "Hour Stay";
  let firstWord = name;
  let remainingWords = "";

  const stayIndex = name.toLowerCase().indexOf("stay");
  if (stayIndex !== -1) {
    firstWord = name.substring(0, stayIndex);
    remainingWords = name.substring(stayIndex);
  } else {
    const parts = name.split(" ");
    firstWord = parts[0];
    remainingWords = parts.slice(1).join(" ");
  }

  return (
    <Link
      to={to}
      className={cn("flex items-center gap-3 sm:gap-4 min-h-11 hover:opacity-95 transition-opacity", className)}
      aria-label={`${logoData.name} home`}>
      <img
        src={logoData.logoUrl}
        alt={logoData.name}
        width={44}
        height={44}
        className={cn(
          "h-10 w-10 sm:h-11 sm:w-11 object-contain transition-all",
          !removeBg && "bg-white p-1 rounded-xl shadow-soft",
          imgClassName
        )}
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
      {!compact && (
        <span className="flex flex-col justify-center leading-tight">
          <span
            className={cn(
              "block font-display text-xl sm:text-2xl font-bold tracking-tight transition-all whitespace-nowrap",
              tone === "light" ? "text-cream" : "text-navy dark:text-foreground"
            )}
          >
            {firstWord} <span className="text-[#F5C06A]">{remainingWords}</span>
          </span>
        </span>
      )}
    </Link>
  );
}