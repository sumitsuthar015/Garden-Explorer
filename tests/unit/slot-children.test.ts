import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { resolveSlotChildren } from "@/lib/slot-children";

/**
 * React streams elements that cross a server/client boundary as lazily wrapped
 * references, sometimes nested. Radix `Slot` only unwraps one wrapper, which is
 * what produced "Slot failed to slot onto its children" on the home page.
 */

const LAZY = Symbol.for("react.lazy");

/** A stand-in for React's lazy wrapper — same shape, synchronous `_init`. */
function lazyWrapper(resolve: () => unknown) {
  return { $$typeof: LAZY, _payload: "payload", _init: resolve };
}

/** The wrappers are intentionally not real React values, hence the cast. */
const asNode = (value: unknown) => value as ReactNode;

const element = createElement("a", { href: "/explore" }, "Explore");

describe("resolveSlotChildren", () => {
  it("returns ordinary children untouched", () => {
    expect(resolveSlotChildren(element)).toBe(element);
    expect(resolveSlotChildren("text")).toBe("text");
    expect(resolveSlotChildren(null)).toBe(null);
  });

  it("unwraps a single lazy wrapper to the element inside", () => {
    expect(resolveSlotChildren(asNode(lazyWrapper(() => element)))).toBe(element);
  });

  it("unwraps nested lazy wrappers — the case that broke `Slot`", () => {
    const nested = lazyWrapper(() => lazyWrapper(() => element));
    expect(resolveSlotChildren(asNode(nested))).toBe(element);
  });

  it("hands the original value back when there is no `_init` to call", () => {
    const broken = { $$typeof: LAZY, _payload: "payload" };
    expect(resolveSlotChildren(asNode(broken))).toBe(broken);
  });

  it("gives up when unwrapping yields something that is not an element", () => {
    const notAnElement = lazyWrapper(() => ({ not: "an element" }));
    expect(resolveSlotChildren(asNode(notAnElement))).toBe(notAnElement);
  });

  it("does not loop forever on a self-referencing wrapper", () => {
    const cyclic: { $$typeof: symbol; _payload: string; _init: () => unknown } = {
      $$typeof: LAZY,
      _payload: "payload",
      _init: () => cyclic,
    };
    expect(resolveSlotChildren(asNode(cyclic))).toBe(cyclic);
  });
});
