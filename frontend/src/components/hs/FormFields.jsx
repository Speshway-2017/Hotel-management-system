import React from "react";
import { cn } from "@/utils/utils";
import { validateFieldValue } from "@/schemas/primitives";

export const FormFieldContext = React.createContext(null);

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
  const [childError, setChildError] = React.useState(null);

  // If errorMsg changes from parent form submit, use it; otherwise use live childError from user typing
  const displayError = childError || errorMsg;
  const hasError = status === "error" || Boolean(displayError);

  // Enhance children to inherit error status and parent field binding
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        status: child.props.status || (hasError ? "error" : undefined),
        id: child.props.id || id,
        hasParentFormField: true,
        parentError: errorMsg
      });
    }
    return child;
  });

  // Clean any asterisk from label string to guarantee displaying strictly one asterisk
  const cleanLabel = typeof label === "string" ? label.replace(/\*+/g, "").trim() : label;
  const isRequired = Boolean(required || (typeof label === "string" && label.includes("*")));

  return (
    <FormFieldContext.Provider value={{ setChildError, parentError: errorMsg, hasError, formFieldId: id }}>
      <div className={cn("space-y-1.5 w-full text-left font-sans", className)}>
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-bold uppercase tracking-wider text-muted-foreground/90 select-none"
          >
            {cleanLabel}
            {isRequired && (
              <span className="text-red-600 ml-1 font-bold" style={{ color: "#dc2626" }}>
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">{enhancedChildren}</div>
        {hasError && displayError && (
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
            <span style={{ color: "#dc2626" }}>{displayError}</span>
          </p>
        )}
        {!hasError && helpText && (
          <p className="text-[10px] text-muted-foreground/80">{helpText}</p>
        )}
      </div>
    </FormFieldContext.Provider>
  );
}

export const Input = React.forwardRef(
  (
    {
      className,
      type = "text",
      status,
      icon: Icon,
      suffix,
      textOnly = false,
      nameOnly = false,
      dataType,
      required,
      onBlur,
      onChange,
      onKeyDown,
      onPaste,
      hasParentFormField = false,
      parentError,
      ...props
    },
    ref
  ) => {
    const formContext = React.useContext(FormFieldContext);
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

    const updateError = (err) => {
      setLocalError(err);
      if (formContext?.setChildError) {
        formContext.setChildError(err);
      }
    };

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
      // Allow navigation and shortcut keys
      if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      // 1. Text entered on Number Field
      if (isNumberField) {
        const isDecimalAllowed = props.step === "0.01" || props.step === "any" || validationType === "amount";
        const isValidChar = /[0-9]/.test(e.key) || (isDecimalAllowed && e.key === ".");

        if (!isValidChar) {
          e.preventDefault();
          updateError("Number fields allow numbers only; invalid text is not allowed.");
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
          updateError(err);
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }

      // 3. Letters entered on Phone Field
      if (isPhoneField) {
        if (/[a-zA-Z]/.test(e.key)) {
          e.preventDefault();
          updateError("Phone number must contain numbers only.");
          if (onKeyDown) onKeyDown(e);
          return;
        }
      }

      if (onKeyDown) onKeyDown(e);
    };

    const handlePaste = (e) => {
      const pasteText = e.clipboardData?.getData("text") || "";

      if (isNumberField) {
        if (/[a-zA-Z]/.test(pasteText) || (pasteText.trim() !== "" && isNaN(Number(pasteText)))) {
          e.preventDefault();
          updateError("Number fields allow numbers only; invalid text is not allowed.");
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
          updateError(err);
          if (onPaste) onPaste(e);
          return;
        }
      }

      if (isPhoneField) {
        if (/[a-zA-Z]/.test(pasteText)) {
          e.preventDefault();
          updateError("Phone number must contain numbers only.");
          if (onPaste) onPaste(e);
          return;
        }
      }

      if (onPaste) onPaste(e);
    };

    const handleChange = (e) => {
      const val = e.target.value;

      // Check HTML5 validity badInput (e.g. invalid characters typed into native number input)
      if (e.target.validity?.badInput) {
        updateError("Number fields allow numbers only; invalid text is not allowed.");
        if (onChange) onChange(e);
        return;
      }

      // Live validation on data entry
      if (isNumberField) {
        if (/[a-zA-Z]/.test(val)) {
          updateError("Number fields allow numbers only; invalid text is not allowed.");
        } else if (val !== "" && isNaN(Number(val))) {
          updateError("Number fields allow numbers only; invalid text is not allowed.");
        } else if (val !== "") {
          const err = runValidation(val);
          updateError(err);
        } else {
          updateError(null);
        }
      } else if (isTextField) {
        if (/[0-9]/.test(val)) {
          const err =
            validationType === "name" || nameOnly
              ? "Name must contain letters only; numbers are not allowed."
              : "Text fields allow text only; numbers are not allowed.";
          updateError(err);
        } else if (val.trim().length > 0 && touched) {
          const err = runValidation(val);
          updateError(err);
        } else {
          updateError(null);
        }
      } else if (isPhoneField) {
        if (/[a-zA-Z]/.test(val)) {
          updateError("Phone number must contain numbers only.");
        } else if (val.replace(/\D/g, "").length > 15) {
          updateError("Phone number must be at most 15 digits.");
        } else {
          updateError(null);
        }
      } else if (validationType === "email") {
        if (/\s/.test(val)) {
          updateError("Email cannot contain spaces.");
        } else if (touched || (val.includes("@") && val.includes("."))) {
          const err = runValidation(val);
          updateError(err);
        } else {
          updateError(null);
        }
      } else {
        if (touched || localError) {
          const err = runValidation(val);
          updateError(err);
        }
      }

      if (onChange) onChange(e);
    };

    const handleBlur = (e) => {
      setTouched(true);
      const val = e.target.value;
      const err = runValidation(val);
      updateError(err);
      if (onBlur) onBlur(e);
    };

    const activeError = parentError || localError;
    const hasError = status === "error" || Boolean(activeError) || formContext?.hasError;

    return (
      <div className="w-full">
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
              hasError
                ? "border-red-600 focus:border-red-600 focus:ring-red-600/15"
                : status === "success"
                ? "border-success focus:border-success focus:ring-success/15"
                : "border-[#E7E9EE] hover:border-navy/20 focus:border-navy focus:ring-navy/10",
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
          {suffix && (
            <span className="absolute right-3.5 text-xs font-bold text-muted-foreground pointer-events-none select-none">
              {suffix}
            </span>
          )}
        </div>
        {/* Render standalone error paragraph if not inside FormField */}
        {!formContext && activeError && (
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

export const Select = React.forwardRef(
  ({ className, status, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          className={cn(
            "w-full h-10 pl-3.5 pr-10 border rounded-lg text-sm bg-white font-medium text-navy transition-all duration-200 focus:outline-none focus:ring-2 disabled:bg-[#fcfcfc] disabled:text-muted-foreground/60 disabled:cursor-not-allowed appearance-none cursor-pointer",
            status === "error"
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15"
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
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/15"
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
