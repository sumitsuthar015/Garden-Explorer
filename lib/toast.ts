import { toast as sonnerToast } from "sonner";

/**
 * Reusable toast API used by every mutation in the app.
 * Wrapping sonner keeps copy and durations consistent in one place.
 */
const baseOptions = { duration: 4200 } as const;

export const toast = {
  success(message: string, description?: string) {
    sonnerToast.success(message, { ...baseOptions, description });
  },
  error(message: string, description?: string) {
    sonnerToast.error(message, { ...baseOptions, duration: 6000, description });
  },
  warning(message: string, description?: string) {
    sonnerToast.warning(message, { ...baseOptions, description });
  },
  info(message: string, description?: string) {
    sonnerToast.info(message, { ...baseOptions, description });
  },
  /** Promise toast for async mutations with a loading state. */
  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string | ((value: T) => string); error: string },
  ) {
    return sonnerToast.promise(promise, { ...baseOptions, ...messages });
  },
  dismiss(id?: string | number) {
    sonnerToast.dismiss(id);
  },
};

export { sonnerToast };
