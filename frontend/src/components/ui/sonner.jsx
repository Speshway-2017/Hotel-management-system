import { Toaster as Sonner } from "sonner";



const Toaster = ({ ...props }) => {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-navy group-[.toaster]:border-navy/10 group-[.toaster]:shadow-lift font-ui text-xs font-medium rounded-xl",
          description: "group-[.toast]:text-navy/70 text-[11px]",
          actionButton: "group-[.toast]:bg-purple group-[.toast]:text-white text-xs font-bold rounded-lg px-2.5 py-1",
          cancelButton: "group-[.toast]:bg-cream/40 group-[.toast]:text-navy text-xs font-medium rounded-lg"
        }
      }}
      {...props}
    />
  );
};

export { Toaster };