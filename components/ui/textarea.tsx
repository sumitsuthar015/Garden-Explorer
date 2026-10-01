import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "flex min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm leading-relaxed text-foreground transition-colors",
          "placeholder:text-muted-foreground/85",
          "focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring/60",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "aria-[invalid=true]:border-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Textarea };
