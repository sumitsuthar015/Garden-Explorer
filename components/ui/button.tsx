"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";

import { resolveSlotChildren } from "@/lib/slot-children";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,box-shadow,transform,color] duration-150 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_6px_16px_-10px_rgb(47_107_79/0.9)] hover:bg-[#2a6047]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-[#628c67]",
        warm: "bg-warm text-warm-foreground shadow-[0_6px_16px_-10px_rgb(231_183_91/0.95)] hover:bg-[#dfab45]",
        outline:
          "border border-border bg-card text-foreground shadow-soft hover:border-primary/40 hover:bg-accent/60",
        soft: "bg-accent text-accent-foreground hover:bg-[#d8e9da]",
        ghost: "text-foreground hover:bg-accent/70",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[#9d2019] shadow-[0_6px_16px_-10px_rgb(179_38_30/0.9)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm [&_svg]:size-4",
        default: "h-11 px-4 text-sm [&_svg]:size-4",
        lg: "h-12 px-6 text-base [&_svg]:size-5",
        xl: "h-14 px-7 text-base [&_svg]:size-5",
        icon: "size-11 [&_svg]:size-5",
        "icon-sm": "size-9 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner, sets `aria-busy` and disables the button. */
  loading?: boolean;
  loadingLabel?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    loadingLabel,
    disabled,
    children,
    ...props
  },
  ref,
) {
  const Comp = asChild ? Slot : "button";

  if (asChild) {
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        data-loading={loading || undefined}
        {...props}
      >
        {/* `Slot` needs exactly one element child; resolve streamed wrappers first. */}
        {resolveSlotChildren(children)}
      </Comp>
    );
  }

  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Comp>
  );
});

export { Button, buttonVariants };
