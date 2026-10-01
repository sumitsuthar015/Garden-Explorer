/**
 * Fire-and-forget celebrations.
 *
 * Any component can call `celebrate()` from an event handler; the single
 * <CelebrationLayer /> mounted in the public layout draws the confetti. Keeping
 * it an event bus means no provider or prop drilling through the learning flow.
 */

export type CelebrationSize = "small" | "big";

type Listener = (size: CelebrationSize) => void;

const listeners = new Set<Listener>();

export function celebrate(size: CelebrationSize = "small"): void {
  for (const listener of listeners) listener(size);
}

export function onCelebrate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
