import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, type, ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-[inset_0_1px_1px_rgb(31_41_51/0.03)] transition-colors",
          "placeholder:text-muted-foreground/85",
          "file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-accent file:px-3 file:text-sm file:font-medium file:text-accent-foreground",
          "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring/60",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:outline-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };
