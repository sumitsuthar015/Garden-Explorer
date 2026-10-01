import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative flex w-full gap-3 rounded-lg border px-4 py-3.5 text-sm [&_svg]:size-5 [&_svg]:shrink-0 [&>svg]:translate-y-0.5",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-[#c7dbec] bg-[#eef5fb] text-[#1c4a6f]",
        success: "border-[#bfe0cc] bg-[#eef8f1] text-[#1f5c3a]",
        warning: "border-[#f0dcae] bg-[#fdf6e6] text-[#7a5210]",
        destructive: "border-[#f0c0bd] bg-[#fdefee] text-[#8f231d]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("mb-1 leading-none font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("leading-relaxed text-balance [&_p]:leading-relaxed", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
