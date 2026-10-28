import * as React from "react";
import { cn } from "@/utils/utils";
import { Eye, EyeOff } from "lucide-react";
import { validateFieldValue, hasRepeatedChars, isAllSameChar, isRepeatedSearchQuery } from "@/schemas/primitives";

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
      isSearch = false,
      noValidate = false,
      disableValidation = false,
      onBlur,
      onChange,
      onKeyDown,
      onPaste,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [localError, setLocalError] = React.useState(null);
    const [touched, setTouched] = React.useState(false);

    // Identify search and filter inputs across the entire application
    const isSearchField = React.useMemo(() => {
      if (isSearch || noValidate || disableValidation) return true;
      if (type === "search" || dataType === "search") return true;
      if (props.role === "searchbox" || props.role === "search") return true;
      const searchPattern = /search|filter|find|query|lookup|destination|location|keyword|term/i;
      const placeholder = String(props.placeholder || "");
      if (searchPattern.test(placeholder) || /hyderabad|jaipur|goa/i.test(placeholder)) return true;
      const name = String(props.name || "");
      if (searchPattern.test(name) || name.toLowerCase() === "q") return true;
      const id = String(props.id || "");
      if (searchPattern.test(id) || id.toLowerCase() === "q") return true;
      const ariaLabel = String(props["aria-label"] || "");
      if (searchPattern.test(ariaLabel)) return true;
      const cls = String(className || "");
      if (searchPattern.test(cls)) return true;
      return false;
    }, [isSearch, noValidate, disableValidation, type, dataType, props.role, props.placeholder, props.name, props.id, props["aria-label"], className]);

    // Determine validation type
    const validationType = React.useMemo(() => {
      if (isSearchField) return "search";
      if (dataType) return dataType;
      if (nameOnly) return "name";
      if (textOnly) return "text-only";
      if (type === "email") return "email";
      if (type === "tel") return "tel";
      if (props.name && (props.name.toLowerCase().includes("phone") || props.name.toLowerCase().includes("mobile"))) return "tel";
      if (type === "number") {
        if (props.step === "0.01" || props.step === "any") return "amount";
        return "number";
      }
      return type;
    }, [isSearchField, dataType, nameOnly, textOnly, type, props.step, props.name]);

    const isNumberField =
      !isSearchField &&
      (validationType === "number" ||
      validationType === "amount" ||
      validationType === "integer" ||
      type === "number");

    const isTextField =
      !isSearchField &&
      (validationType === "name" ||
      validationType === "text-only" ||
      validationType === "city" ||
      nameOnly ||
      textOnly);

    const isPhoneField =
      !isSearchField &&
      (validationType === "tel" ||
      validationType === "phone" ||
      type === "tel" ||
      Boolean(props.name && (props.name.toLowerCase().includes("phone") || props.name.toLowerCase().includes("mobile"))));

    const runValidation = (val) => {
      const res = validateFieldValue(validationType, val, {
        required,
        textOnly: isTextField,
        fieldName: props.placeholder || props.name || "Field",
        min: props.min ? Number(props.min) : 0,
        max: props.max ? Number(props.max) : Infinity,
        maxLength: props.maxLength || (isSearchField ? 50 : undefined),
        allowZero: props.min === undefined || Number(props.min) <= 0,
        isSearch: isSearchField
      });
      return res.isValid ? null : res.error;
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      // Search fields: prevent exceeding 50 characters and prevent repeated characters
      if (isSearchField) {
        const target = e.target;
        const maxLen = props.maxLength || 50;
        const selStart = target.selectionStart ?? 0;
        const selEnd = target.selectionEnd ?? 0;
        const currentVal = props.value !== undefined ? String(props.value) : (target.value || "");
        const isReplacing = selEnd > selStart;

        if (!isReplacing && currentVal.length >= maxLen) {
          e.preventDefault();
          setLocalError(`Search query cannot exceed ${maxLen} characters.`);
          if (onKeyDown) onKeyDown(e);
          return;
        }

        const before = currentVal.slice(0, selStart);
        const after = currentVal.slice(selEnd);
        const nextVal = before + e.key + after;
        if (isRepeatedSearchQuery(nextVal)) {
          e.preventDefault();
          setLocalError("Search query contains invalid repeated characters.");
          if (onKeyDown) onKeyDown(e);
          return;
        }

        if (localError) setLocalError(null);
        if (onKeyDown) onKeyDown(e);
        return;
      }

      // 1. Text entered on Number Field
      if (isNumberField) {
        const isDecimalAllowed = props.step === "0.01" || props.step === "any" || validationType === "amount";
        const isValidChar = /[0-9]/.test(e.key) || (isDecimalAllowed && e.key === ".");

        if (!isValidChar) {
          e.preventDefault();
          setLocalError("Number fields allow numbers only; invalid text is not allowed.");
          if (onKeyDown) onKeyDown(e);
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
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }

      // 3. Letters entered or exceeding 10 digits on Phone Field
      if (isPhoneField) {
        if (/[a-zA-Z]/.test(e.key)) {
          e.preventDefault();
          setLocalError("Phone number must contain numbers only.");
          if (onKeyDown) onKeyDown(e);
          return;
        }
        if (/^[0-9]$/.test(e.key)) {
          const target = e.target;
          const selStart = target.selectionStart ?? 0;
          const selEnd = target.selectionEnd ?? 0;
          if (selEnd === selStart) {
            const currentVal = target.value || "";
            const cleanDigits = currentVal.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
            if (cleanDigits.length >= 10) {
              e.preventDefault();
              setLocalError("Mobile/Phone number must be 10 digits only.");
              if (onKeyDown) onKeyDown(e);
              return;
            }
          }
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    const handlePaste = (e) => {
      const pasteText = e.clipboardData?.getData("text") || "";

      if (isSearchField) {
        const target = e.target;
        const maxLen = props.maxLength || 50;
        const selStart = target.selectionStart ?? 0;
        const selEnd = target.selectionEnd ?? 0;
        const currentVal = props.value !== undefined ? String(props.value) : (target.value || "");
        const before = currentVal.slice(0, selStart);
        const after = currentVal.slice(selEnd);
        const nextVal = before + pasteText + after;

        if (isRepeatedSearchQuery(nextVal)) {
          e.preventDefault();
          setLocalError("Search query contains invalid repeated characters.");
          if (onPaste) onPaste(e);
          return;
        }

        if (nextVal.length > maxLen) {
          e.preventDefault();
          setLocalError(`Search query cannot exceed ${maxLen} characters.`);
          if (onPaste) onPaste(e);
          return;
        }

        if (localError) setLocalError(null);
        if (onPaste) onPaste(e);
        return;
      }

      if (isNumberField) {
        if (/[a-zA-Z]/.test(pasteText) || (pasteText.trim() !== "" && isNaN(Number(pasteText)))) {
          e.preventDefault();
          setLocalError("Number fields allow numbers only; invalid text is not allowed.");
          if (onPaste) onPaste(e);
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
          if (onPaste) onPaste(e);
          return;
        }
      }

      if (isPhoneField) {
        if (/[a-zA-Z]/.test(pasteText)) {
          e.preventDefault();
          setLocalError("Phone number must contain numbers only.");
          if (onPaste) onPaste(e);
          return;
        }
        const cleanPasteDigits = pasteText.replace(/^(\+91|0)/, "").replace(/\D/g, "");
        const target = e.target;
        const selStart = target.selectionStart ?? 0;
        const selEnd = target.selectionEnd ?? 0;
        const currentVal = target.value || "";
        const before = currentVal.slice(0, selStart);
        const after = currentVal.slice(selEnd);
        const combinedDigits = (before + cleanPasteDigits + after).replace(/^(\+91|0)/, "").replace(/\D/g, "");
        if (combinedDigits.length > 10) {
          e.preventDefault();
          const allowedLen = Math.max(0, 10 - (before + after).replace(/^(\+91|0)/, "").replace(/\D/g, "").length);
          const textToInsert = cleanPasteDigits.slice(0, allowedLen);
          const newValue = before + textToInsert + after;
          target.value = newValue;
          const event = new Event("input", { bubbles: true });
          target.dispatchEvent(event);
          setLocalError("Mobile/Phone number must be 10 digits only.");
          if (onPaste) onPaste(e);
          return;
        }
      }

      if (onPaste) onPaste(e);
    };

    const handleChange = (e) => {
      const val = e.target.value;

      if (isSearchField) {
        const maxLen = props.maxLength || 50;
        if (val.length > maxLen) {
          setLocalError(`Search query cannot exceed ${maxLen} characters.`);
        } else if (isRepeatedSearchQuery(val)) {
          setLocalError("Search query contains invalid repeated characters.");
        } else {
          setLocalError(null);
        }
        if (onChange) onChange(e);
        return;
      }

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
        const digitsOnly = val.replace(/^(\+91|0)/, "").replace(/[\s-]/g, "");
        if (/[a-zA-Z]/.test(val)) {
          setLocalError("Phone number must contain numbers only.");
        } else if (digitsOnly.length > 10) {
          setLocalError("Mobile/Phone number must be 10 digits only.");
        } else if (touched && digitsOnly.length > 0 && digitsOnly.length < 10) {
          setLocalError("Mobile/Phone number must be exactly 10 digits.");
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
      if (isSearchField) {
        const val = e.target.value;
        const maxLen = props.maxLength || 50;
        if (val.length > maxLen) {
          setLocalError(`Search query cannot exceed ${maxLen} characters.`);
        } else if (isRepeatedSearchQuery(val)) {
          setLocalError("Search query contains invalid repeated characters.");
        } else {
          setLocalError(null);
        }
        if (onBlur) onBlur(e);
        return;
      }
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
              maxLength={isSearchField ? (props.maxLength || 50) : props.maxLength}
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
          {activeError && (
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
              <span style={{ color: "#dc2626" }}>{activeError}</span>
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="w-full">
        <input
          type={type}
          maxLength={isSearchField ? (props.maxLength || 50) : props.maxLength}
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
        {activeError && (
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
            <span style={{ color: "#dc2626" }}>{activeError}</span>
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };