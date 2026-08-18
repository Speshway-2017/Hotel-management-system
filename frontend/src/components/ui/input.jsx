import * as React from "react";
import { cn } from "@/utils/utils";
import { Eye, EyeOff } from "lucide-react";

const Input = React.forwardRef(
  ({ className, type, hideToggle = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    if (type === "password" && !hideToggle) {
      return (
        <div className="relative w-full flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-10 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className
            )}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-muted-foreground hover:text-navy cursor-pointer focus:outline-none select-none flex items-center justify-center p-0.5 rounded hover:bg-muted/55"
            title={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4 pointer-events-none" />
            ) : (
              <Eye className="size-4 pointer-events-none" />
            )}
          </button>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };