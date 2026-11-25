import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  side = "left",
  title = "Menú",
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  side?: "left" | "bottom";
  title?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="sheet-overlay fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(
          "fixed z-50 flex flex-col bg-surface p-5 outline-none",
          side === "left"
            ? "sheet-left inset-y-0 left-0 h-dvh w-[min(86vw,320px)] rounded-r-3xl"
            : "sheet-bottom inset-x-0 bottom-0 max-h-[85dvh] rounded-t-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-xl text-ink-soft outline-none transition-colors hover:bg-app hover:text-ink focus-visible:ring-2 focus-visible:ring-primary-500/40">
          <X size={20} strokeWidth={1.8} />
          <span className="sr-only">Cerrar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
