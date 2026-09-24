import * as React from "react";
import { cn } from "@/utils/utils";
import { Eye, EyeOff } from "lucide-react";
import { validateFieldValue } from "@/schemas/primitives";

const Input = React.forwardRef(
  (
    {
      className,
      type = "text",
      hideToggle = false,
      status,
      errorMsg,
      textOnly = false,
      nameOnly = false,
      dataType,
      required,
      onBlur,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [localError, setLocalError] = React.useState(null);
    const [touched, setTouched] = React.useState(false);

    // Determine validation type
    const validationType = React.useMemo(() => {
      if (dataType) return dataType;
      if (nameOnly) return "name";
      if (textOnly) return "text-only";
      if (type === "email") return "email";
      if (type === "tel") return "tel";
      if (type === "number") {
        if (props.step === "0.01" || props.step === "any") return "amount";
        return "number";
      }
      return type;
    }, [dataType, nameOnly, textOnly, type, props.step]);

    const isNumberField =
      validationType === "number" ||
      validationType === "amount" ||
      validationType === "integer" ||
      type === "number";

    const isTextField =
      validationType === "name" ||
      validationType === "text-only" ||
      validationType === "city" ||
      nameOnly ||
      textOnly;

    const isPhoneField = validationType === "tel" || type === "tel";

    const runValidation = (val) => {
      const res = validateFieldValue(validationType, val, {
        required,
        textOnly: isTextField,
        fieldName: props.placeholder || props.name || "Field",
        min: props.min ? Number(props.min) : 0,
        max: props.max ? Number(props.max) : Infinity,
        allowZero: props.min === undefined || Number(props.min) <= 0
      });
      return res.isValid ? null : res.error;
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        if (props.onKeyDown) props.onKeyDown(e);
        return;
      }

      // 1. Text entered on Number Field
      if (isNumberField) {
        const isDecimalAllowed = props.step === "0.01" || props.step === "any" || validationType === "amount";
        const isValidChar = /[0-9]/.test(e.key) || (isDecimalAllowed && e.key === ".");

        if (!isValidChar) {
          e.preventDefault();
          setLocalError("Number fields allow numbers only; invalid text is not allowed.");
          if (props.onKeyDown) props.onKeyDown(e);
          return;
        }
      }

      // 2. Numbers entered on Text Field
      if (isTextField) {
        if (/[0-9]/.test(e.key)) {
          e.preventDefault();
          const err =
            validationType === "name" || nameOnly
              ? "Name must contain letters only; numbers are not allowed."
              : "Text fields allow text only; numbers are not allowed.";
          setLocalError(err);
          if (props.onKeyDown) props.onKeyDown(e);
          return;
        }
      }

      // 3. Letters entered on Phone Field
      if (isPhoneField) {
        if (/[a-zA-Z]/.test(e.key)) {
          e.preventDefault();
          setLocalError("Phone number must contain numbers only.");
          if (props.onKeyDown) props.onKeyDown(e);
          return;
        }
      }

      if (props.onKeyDown) props.onKeyDown(e);
    };

    const handlePaste = (e) => {
      const pasteText = e.clipboardData?.getData("text") || "";

      if (isNumberField) {
        if (/[a-zA-Z]/.test(pasteText) || (pasteText.trim() !== "" && isNaN(Number(pasteText)))) {
          e.preventDefault();
          setLocalError("Number fields allow numbers only; invalid text is not allowed.");
          if (props.onPaste) props.onPaste(e);
          return;
        }
      }

      if (isTextField) {
        if (/[0-9]/.test(pasteText)) {
          e.preventDefault();
          const err =
            validationType === "name" || nameOnly
              ? "Name must contain letters only; numbers are not allowed."
              : "Text fields allow text only; numbers are not allowed.";
          setLocalError(err);
          if (props.onPaste) props.onPaste(e);
          return;
        }
      }

      if (isPhoneField) {
        if (/[a-zA-Z]/.test(pasteText)) {
          e.preventDefault();
          setLocalError("Phone number must contain numbers only.");
          if (props.onPaste) props.onPaste(e);
          return;
        }
      }

      if (props.onPaste) props.onPaste(e);
    };

    const handleChange = (e) => {
      const val = e.target.value;

      if (e.target.validity?.badInput) {
        setLocalError("Number fields allow numbers only; invalid text is not allowed.");
        if (onChange) onChange(e);
        return;
      }

      if (isNumberField) {
        if (/[a-zA-Z]/.test(val)) {
          setLocalError("Number fields allow numbers only; invalid text is not allowed.");
        } else if (val !== "" && isNaN(Number(val))) {
          setLocalError("Number fields allow numbers only; invalid text is not allowed.");
        } else if (val !== "") {
          const err = runValidation(val);
          setLocalError(err);
        } else {
          setLocalError(null);
        }
      } else if (isTextField) {
        if (/[0-9]/.test(val)) {
          const err =
            validationType === "name" || nameOnly
              ? "Name must contain letters only; numbers are not allowed."
              : "Text fields allow text only; numbers are not allowed.";
          setLocalError(err);
        } else if (val.trim().length > 0 && touched) {
          const err = runValidation(val);
          setLocalError(err);
        } else {
          setLocalError(null);
        }
      } else if (isPhoneField) {
        if (/[a-zA-Z]/.test(val)) {
          setLocalError("Phone number must contain numbers only.");
        } else if (val.replace(/\D/g, "").length > 15) {
          setLocalError("Phone number must be at most 15 digits.");
        } else {
          setLocalError(null);
        }
      } else if (validationType === "email") {
        if (/\s/.test(val)) {
          setLocalError("Email cannot contain spaces.");
        } else if (touched || (val.includes("@") && val.includes("."))) {
          const err = runValidation(val);
          setLocalError(err);
        } else {
          setLocalError(null);
        }
      } else {
        if (touched || localError) {
          const err = runValidation(val);
          setLocalError(err);
        }
      }

      if (onChange) onChange(e);
    };

    const handleBlur = (e) => {
      setTouched(true);
      const val = e.target.value;
      const err = runValidation(val);
      setLocalError(err);
      if (onBlur) onBlur(e);
    };

    const activeError = errorMsg || localError;
    const hasError = status === "error" || Boolean(activeError);

    if (type === "password" && !hideToggle) {
      return (
        <div className="w-full">
          <div className="relative w-full flex items-center">
            <input
              type={showPassword ? "text" : "password"}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent pl-3 pr-10 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                hasError
                  ? "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/20"
                  : "",
                className
              )}
              style={hasError ? { borderColor: "#dc2626", ...props.style } : props.style}
              ref={ref}
              required={required}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onBlur={handleBlur}
              onChange={handleChange}
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
          {localError && !errorMsg && (
            <p
              className="text-[11px] font-bold text-red-600 flex items-center gap-1.5 mt-1 animate-fade-in"
              style={{ color: "#dc2626" }}
            >
              <svg
                className="size-3.5 text-red-600 shrink-0"
                style={{ color: "#dc2626", stroke: "#dc2626" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span style={{ color: "#dc2626" }}>{localError}</span>
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:placeholder-transparent focus-visible:placeholder-transparent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            hasError
              ? "border-red-600 focus-visible:border-red-600 focus-visible:ring-red-600/20"
              : "",
            className
          )}
          style={hasError ? { borderColor: "#dc2626", ...props.style } : props.style}
          ref={ref}
          required={required}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          onChange={handleChange}
          {...props}
        />
        {localError && !errorMsg && (
          <p
            className="text-[11px] font-bold text-red-600 flex items-center gap-1.5 mt-1 animate-fade-in"
            style={{ color: "#dc2626" }}
          >
            <svg
              className="size-3.5 text-red-600 shrink-0"
              style={{ color: "#dc2626", stroke: "#dc2626" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span style={{ color: "#dc2626" }}>{localError}</span>
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };