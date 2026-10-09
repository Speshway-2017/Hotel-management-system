"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { cn } from "@/utils/utils";

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef(
  ({ className, children, required, ...props }, ref) => {
    const hasAsteriskInText = typeof children === "string" && children.includes("*");
    const cleanChildren = hasAsteriskInText && typeof children === "string" 
      ? children.replace(/\*+/g, "").trim() 
      : children;
    const isRequired = Boolean(required || hasAsteriskInText);

    return (
      <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
        {cleanChildren}
        {isRequired && <span className="text-red-600 font-bold ml-1 select-none" style={{ color: '#dc2626' }}>*</span>}
      </LabelPrimitive.Root>
    );
  }
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };