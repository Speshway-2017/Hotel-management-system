import React from "react";
import { cn } from "@/utils/utils";

export function FormField({
  label,
  id,
  required,
  status,
  errorMsg,
  helpText,
  children,
  className
}) {
  return (
    <div className={cn("space-y-1.5 w-full text-left font-sans", className)}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-muted-foreground/90 select-none"
        >
          {label}
          {required && <span className="text-error ml-1 font-bold">*</span>}
        </label>
      )}
      <div className="relative">{children}</div>
      {status === "error" && errorMsg && (
        <p className="text-[11px] font-bold text-error animate-fade-in">{errorMsg}</p>
      )}
      {!errorMsg && helpText && (
        <p className="text-[10px] text-muted-foreground/80">{helpText}</p>
      )}
    </div>
  );
}

export const Input = React.forwardRef(
  ({ className, type = "text", status, icon: Icon, suffix, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {Icon && (
          <span className="absolute left-3.5 text-muted-foreground pointer-events-none select-none">
            <Icon className="size-4" />
          </span>
        )}
        <input
          type={type}
          className={cn(
            "w-full h-10 px-3.5 border rounded-lg text-sm bg-white font-medium text-navy placeholder:text-muted-foreground/50 transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-[#fcfcfc] disabled:text-muted-foreground/60 disabled:cursor-not-allowed",
            Icon ? "pl-10" : "",
            suffix ? "pr-10" : "",
            status === "error"
              ? "border-error focus:border-error focus:ring-error/15"
              : status === "success"
              ? "border-success focus:border-success focus:ring-success/15"
              : "border-[#E7E9EE] hover:border-navy/20 focus:border-navy focus:ring-navy/10",
            className
          )}
          ref={ref}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-xs font-bold text-muted-foreground pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Select = React.forwardRef(
  ({ className, status, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "w-full h-10 pl-3.5 pr-10 border rounded-lg text-sm bg-white font-medium text-navy transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-[#fcfcfc] disabled:text-muted-foreground/60 disabled:cursor-not-allowed appearance-none cursor-pointer",
            status === "error"
              ? "border-error focus:border-error focus:ring-error/15"
              : status === "success"
              ? "border-success focus:border-success focus:ring-success/15"
              : "border-[#E7E9EE] hover:border-navy/20 focus:border-navy focus:ring-navy/10",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none select-none">
          <svg
            className="size-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M19 9l-7 7-7-7"
            ></path>
          </svg>
        </span>
      </div>
    );
  }
);
Select.displayName = "Select";

export const Textarea = React.forwardRef(
  ({ className, status, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full p-3.5 border rounded-lg text-sm bg-white font-medium text-navy placeholder:text-muted-foreground/50 transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-[#fcfcfc] disabled:text-muted-foreground/60 disabled:cursor-not-allowed min-h-[90px]",
          status === "error"
            ? "border-error focus:border-error focus:ring-error/15"
            : status === "success"
            ? "border-success focus:border-success focus:ring-success/15"
            : "border-[#E7E9EE] hover:border-navy/20 focus:border-navy focus:ring-navy/10",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export const Checkbox = React.forwardRef(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm font-medium text-navy select-none">
        <input
          type="checkbox"
          className={cn(
            "size-4.5 rounded border border-[#E7E9EE] hover:border-navy/20 text-navy bg-white focus:ring-navy/25 focus:border-navy transition-all duration-150 cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && <span className="text-xs font-semibold text-navy-deep">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export const Radio = React.forwardRef(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-2.5 cursor-pointer text-sm font-medium text-navy select-none">
        <input
          type="radio"
          className={cn(
            "size-4.5 rounded-full border border-[#E7E9EE] hover:border-navy/20 text-navy bg-white focus:ring-navy/25 focus:border-navy transition-all duration-150 cursor-pointer",
            className
          )}
          ref={ref}
          {...props}
        />
        {label && <span className="text-xs font-semibold text-navy-deep">{label}</span>}
      </label>
    );
  }
);
Radio.displayName = "Radio";

export const Switch = React.forwardRef(
  ({ className, label, checked, onChange, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={checked}
            onChange={onChange}
            ref={ref}
            {...props}
          />
          <div className="w-9 h-5 bg-[#e4e4e7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-navy transition-colors duration-200"></div>
        </div>
        {label && <span className="text-xs font-semibold text-navy-deep">{label}</span>}
      </label>
    );
  }
);
Switch.displayName = "Switch";
