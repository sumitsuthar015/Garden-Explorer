import { describe, expect, it } from "vitest";

import { urlOrEmptySchema } from "@/lib/validation/common";

describe("urlOrEmptySchema", () => {
  it("turns an empty value into null", () => {
    expect(urlOrEmptySchema.parse("")).toBeNull();
  });

  it("accepts full URLs and the site's own garden photos", () => {
    expect(urlOrEmptySchema.parse("https://res.cloudinary.com/demo/image.jpg")).toBe(
      "https://res.cloudinary.com/demo/image.jpg",
    );
    expect(urlOrEmptySchema.parse("/images/garden/gate.jpg")).toBe("/images/garden/gate.jpg");
  });

  it("rejects paths that escape the images folder or are not paths at all", () => {
    for (const value of ["/images/../.env.local", "//evil.example/x.jpg", "images/gate.jpg", "/api/secret", "not a url"]) {
      expect(urlOrEmptySchema.safeParse(value).success, value).toBe(false);
    }
  });
});
