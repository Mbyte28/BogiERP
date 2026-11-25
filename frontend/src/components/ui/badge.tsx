import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold leading-4",
  {
    variants: {
      variant: {
        default: "bg-primary-50 text-primary-600",
        success: "bg-success/15 text-[#3d8f83]",
        danger: "bg-danger/15 text-[#c75f53]",
        warning: "bg-warning/20 text-[#a87733]",
        info: "bg-info/10 text-info",
        outline: "border border-line text-ink-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
