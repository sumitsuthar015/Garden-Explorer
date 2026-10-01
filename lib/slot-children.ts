import * as React from "react";

/**
 * React streams elements that cross a server/client boundary as lazily wrapped
 * references. When such an element is handed to Radix's `Slot` (every
 * `asChild` component), `Slot` unwraps exactly one wrapper and then checks for a
 * single valid element child. Nested wrappers are common in the RSC payload —
 * `Slot` then finds another lazy wrapper instead of an element and throws:
 *
 *   "Slot failed to slot onto its children. Expected a single React element
 *    child or `Slottable`."
 *
 * Resolving the wrappers ourselves (the same way React's renderer resolves a
 * lazy node — by calling its `_init`) restores the single element `Slot`
 * expects. If a chunk is not available yet, `_init` throws it, React suspends
 * the render and retries once the data has arrived.
 */

const REACT_LAZY_TYPE = Symbol.for("react.lazy");

interface LazyLike {
  $$typeof?: symbol;
  _payload?: unknown;
  _init?: (payload: unknown) => unknown;
}

function isLazyLike(value: unknown): value is LazyLike {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as LazyLike).$$typeof === REACT_LAZY_TYPE &&
    "_payload" in value
  );
}

/** Guards against pathological cycles in a malformed stream. */
const MAX_UNWRAP_DEPTH = 8;

/**
 * Returns the element inside any lazily streamed wrappers around `children`.
 * Anything that is not a lazy wrapper is returned untouched, so this is a no-op
 * for ordinary (already resolved) children and for non-`asChild` usage.
 */
export function resolveSlotChildren(children: React.ReactNode): React.ReactNode {
  let node: React.ReactNode = children;

  for (let depth = 0; depth < MAX_UNWRAP_DEPTH && isLazyLike(node); depth += 1) {
    const init = node._init;
    if (typeof init !== "function") return children;

    const next: unknown = init(node._payload);
    if (!React.isValidElement(next) && !isLazyLike(next)) {
      // Not a slottable element — hand the original value to `Slot` so the
      // error (if any) keeps pointing at the real call site.
      return children;
    }
    node = next as React.ReactNode;
  }

  return node;
}
