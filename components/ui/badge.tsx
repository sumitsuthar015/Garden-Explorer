import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { resolveSlotChildren } from "@/lib/slot-children";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        soft: "border-transparent bg-accent text-accent-foreground",
        warm: "border-transparent bg-warm/25 text-[#7a5a10]",
        outline: "border-border bg-card text-foreground",
        success: "border-transparent bg-success/15 text-[#1f5c3a]",
        warning: "border-transparent bg-warning/15 text-[#8a4c06]",
        destructive: "border-transparent bg-destructive/12 text-[#93211b]",
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {asChild ? resolveSlotChildren(children) : children}
    </Comp>
  );
}

export { Badge, badgeVariants };
