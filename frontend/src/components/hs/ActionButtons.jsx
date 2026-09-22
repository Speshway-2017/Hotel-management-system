import React from "react";
import {
  Eye,
  Pencil,
  Trash2,
  CalendarPlus,
  LogIn,
  LogOut,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Clock,
  Sparkles,
  Check,
  X,
  BedDouble,
  CreditCard,
  Star,
  Download,
  RotateCcw,
  Banknote,
  RefreshCw
} from "lucide-react";
import { cn } from "@/utils/utils";

/**
 * Standard semantic color themes for dashboard action buttons/icons
 */
const variantStyles = {
  // View / Info (Sleek Purple/Indigo)
  view: "bg-purple/10 text-purple border-purple/20 hover:bg-purple hover:text-white hover:border-purple",
  info: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
  
  // Edit / Primary (Sleek Navy/Brand)
  edit: "bg-navy/5 text-navy border-navy/15 hover:bg-navy hover:text-white hover:border-navy",
  primary: "bg-navy text-white border-navy hover:bg-navy-deep hover:text-white hover:border-navy-deep",
  
  // Success / Check-In / Approve (Emerald)
  success: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
  checkin: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
  approve: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600",
  
  // Warning / Check-Out / Settle (Amber / Warm)
  checkout: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600",
  warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600",
  
  // Extend stay (Violet / Indigo pill)
  extend: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600",
  
  // Danger / Delete / Reject / Cancel (Rose / Red)
  danger: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600",
  delete: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600",
  reject: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600",
  cancel: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white hover:border-rose-600",
  
  // Processing / Payout in Progress (Blue)
  processing: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600",
  process: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600",
  
  // Refunded / Settled (Purple)
  refunded: "bg-purple/10 text-purple border-purple/20 hover:bg-purple hover:text-white hover:border-purple",
  refund: "bg-purple/10 text-purple border-purple/20 hover:bg-purple hover:text-white hover:border-purple",
  
  // Secondary / Outline / Ghost
  secondary: "bg-muted/40 text-navy border-muted/80 hover:bg-navy hover:text-white hover:border-navy",
  outline: "bg-white text-navy border-muted hover:bg-navy hover:text-white hover:border-navy",
  ghost: "bg-transparent text-muted-foreground border-transparent hover:bg-navy hover:text-white"
};

/**
 * Universal ActionIcon / ActionButton Component
 *
 * Displays icon-only by default in a uniform square size (size-7, 28px x 28px).
 * Displays a clean action tooltip on hover.
 * Icon is size-3.5 (14px x 14px), perfectly centered.
 */
import { useNavigate } from "react-router-dom";

export function ActionIcon({
  icon: Icon,
  label,
  variant = "view",
  onClick,
  to,
  href,
  disabled = false,
  title,
  iconOnly = true,
  showLabel = false,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      onClick(e);
    } else if (to || href) {
      const destination = to || href;
      if (destination.startsWith('http://') || destination.startsWith('https://') || destination.startsWith('//')) {
        window.location.href = destination;
      } else {
        navigate(destination);
      }
    }
  };

  const styleClass = variantStyles[variant] || variantStyles.view;
  const tooltipText = title || label || "Action";
  const isIconOnly = iconOnly && !showLabel;

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      title={tooltipText}
      aria-label={tooltipText}
      className={cn(
        "relative inline-flex items-center justify-center rounded-lg border text-xs font-bold leading-none font-ui select-none shrink-0 shadow-2xs transition-all duration-150 cursor-pointer",
        isIconOnly ? "size-7 w-7 h-7 min-w-7 min-h-7 max-w-7 max-h-7 p-0" : "h-7 min-h-7 px-2.5 gap-1.5 whitespace-nowrap",
        disabled ? "opacity-50 pointer-events-none cursor-not-allowed" : styleClass,
        className
      )}
      style={{
        width: isIconOnly ? "28px" : undefined,
        height: "28px",
        minWidth: isIconOnly ? "28px" : undefined,
        minHeight: "28px",
        maxWidth: isIconOnly ? "28px" : undefined,
        maxHeight: "28px"
      }}
      {...props}
    >
      {Icon && <Icon className="size-3.5 w-3.5 h-3.5 min-w-3.5 min-h-3.5 shrink-0 transition-colors duration-150 text-current" />}
      {!isIconOnly && label && <span className="ml-1.5 text-current">{label}</span>}
      {children}
    </button>
  );
}

// Export ActionButton as an alias pointing directly to ActionIcon for universal compatibility
export const ActionButton = ActionIcon;

/**
 * ActionGroup container for table action columns.
 * Orders icons strictly left-to-right with consistent spacing (gap-1.5) and prevents wrapping.
 */
export function ActionGroup({
  children,
  align = "left",
  className = "",
  ...props
}) {
  const alignClass = align === "right" 
    ? "justify-end text-right ml-auto" 
    : align === "center" 
    ? "justify-center text-center mx-auto" 
    : "justify-start text-left";

  return (
    <div
      className={cn(
        "flex flex-row items-center gap-1.5 flex-nowrap shrink-0 whitespace-nowrap leading-none",
        alignClass,
        className
      )}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start",
        marginLeft: align === "right" ? "auto" : undefined,
        marginRight: align === "center" ? "auto" : undefined
      }}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Pre-configured action button/icon shortcuts with standardized icons, labels, tooltips, and variants
 */
export function ViewActionIcon({ label = "View", title = "View Details", ...props }) {
  return <ActionIcon icon={Eye} label={label} title={title} variant="view" {...props} />;
}
export const ViewActionButton = ViewActionIcon;

export function EditActionIcon({ label = "Edit", title = "Edit Record", ...props }) {
  return <ActionIcon icon={Pencil} label={label} title={title} variant="edit" {...props} />;
}
export const EditActionButton = EditActionIcon;

export function DeleteActionIcon({ label = "Delete", title = "Delete Record", ...props }) {
  return <ActionIcon icon={Trash2} label={label} title={title} variant="delete" {...props} />;
}
export const DeleteActionButton = DeleteActionIcon;

export function CheckInActionIcon({ label = "Check-In", title = "Process Check-In", ...props }) {
  return <ActionIcon icon={LogIn} label={label} title={title} variant="checkin" {...props} />;
}
export const CheckInActionButton = CheckInActionIcon;

export function CheckOutActionIcon({ label = "Check-Out", title = "Process Check-Out", ...props }) {
  return <ActionIcon icon={LogOut} label={label} title={title} variant="checkout" {...props} />;
}
export const CheckOutActionButton = CheckOutActionIcon;

export function ExtendActionIcon({ label = "Extend", title = "Extend Stay", ...props }) {
  return <ActionIcon icon={CalendarPlus} label={label} title={title} variant="extend" {...props} />;
}
export const ExtendActionButton = ExtendActionIcon;

export function ApproveActionIcon({ label = "Approve", title = "Approve Request", ...props }) {
  return <ActionIcon icon={CheckCircle2} label={label} title={title} variant="approve" {...props} />;
}
export const ApproveActionButton = ApproveActionIcon;

export function RejectActionIcon({ label = "Reject", title = "Reject Request", ...props }) {
  return <ActionIcon icon={XCircle} label={label} title={title} variant="reject" {...props} />;
}
export const RejectActionButton = RejectActionIcon;

export function DetailsActionIcon({ label = "Details", title = "View Details", ...props }) {
  return <ActionIcon icon={FileText} label={label} title={title} variant="info" {...props} />;
}
export const DetailsActionButton = DetailsActionIcon;

export function AssignActionIcon({ label = "Assign", title = "Assign Room / Guest", ...props }) {
  return <ActionIcon icon={BedDouble} label={label} title={title} variant="primary" {...props} />;
}
export const AssignActionButton = AssignActionIcon;

export function DownloadActionIcon({ label = "Download", title = "Download Record", ...props }) {
  return <ActionIcon icon={Download} label={label} title={title} variant="info" {...props} />;
}
export const DownloadActionButton = DownloadActionIcon;

export function RefundActionIcon({ label = "Refund", title = "Request Refund", ...props }) {
  return <ActionIcon icon={RotateCcw} label={label} title={title} variant="warning" {...props} />;
}
export const RefundActionButton = RefundActionIcon;

export function ProcessActionIcon({ label = "Process", title = "Initiate Payout / Mark as Processing", ...props }) {
  return <ActionIcon icon={RefreshCw} label={label} title={title} variant="processing" {...props} />;
}
export const ProcessActionButton = ProcessActionIcon;

export function MarkRefundedActionIcon({ label = "Refunded", title = "Complete Refund / Mark as Refunded", ...props }) {
  return <ActionIcon icon={CheckCircle2} label={label} title={title} variant="refunded" {...props} />;
}
export const MarkRefundedActionButton = MarkRefundedActionIcon;

export function PaymentActionIcon({ label = "Payment", title = "View Payment Details", ...props }) {
  return <ActionIcon icon={CreditCard} label={label} title={title} variant="info" {...props} />;
}
export const PaymentActionButton = PaymentActionIcon;

export function FeedbackActionIcon({ label = "Feedback", title = "Submit Stay Feedback", ...props }) {
  return <ActionIcon icon={Star} label={label} title={title} variant="warning" {...props} />;
}
export const FeedbackActionButton = FeedbackActionIcon;


