import { cn } from "@/lib/utils";

/** Layout-stable loading placeholder. Uses a shimmer unless motion is reduced. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-lg", className)}
      {...props}
    />
  );
}

export { Skeleton };
