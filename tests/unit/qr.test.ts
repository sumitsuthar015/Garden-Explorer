import { describe, expect, it } from "vitest";

import { describeScanFailure, extractQrCode, normalizeCode } from "@/lib/qr/extract";
import { qrCodeSchema, qrLookupSchema, regenerateQrCodeSchema } from "@/lib/validation/qr";
import { QR_CODE_PATTERN } from "@/lib/constants";

describe("extractQrCode", () => {
  it("reads the code out of a full printed URL", () => {
    expect(extractQrCode("https://garden.example/q/BUTTERFLY-003")).toBe("BUTTERFLY-003");
    expect(extractQrCode("http://localhost:3000/q/POND-005?trail=water")).toBe("POND-005");
  });

  it("accepts a bare code typed in by hand", () => {
    expect(extractQrCode("butterfly-003")).toBe("BUTTERFLY-003");
    expect(extractQrCode("  ROSE-002  ")).toBe("ROSE-002");
  });

  it("accepts a relative path and a query-string variant", () => {
    expect(extractQrCode("/q/TREES-006")).toBe("TREES-006");
    expect(extractQrCode("https://garden.example/scan?code=COMPOST-007")).toBe("COMPOST-007");
  });

  it("accepts a small JSON payload from custom-printed signs", () => {
    expect(extractQrCode('{"code":"ENTRANCE-001"}')).toBe("ENTRANCE-001");
  });

  it("rejects other websites so visitors are never navigated somewhere odd", () => {
    expect(extractQrCode("https://example.com/menu")).toBeNull();
    expect(extractQrCode("https://example.com/promo/12345")).toBeNull();
  });

  it("rejects empty, oversized and unsafe payloads", () => {
    expect(extractQrCode("")).toBeNull();
    expect(extractQrCode(null)).toBeNull();
    expect(extractQrCode("x".repeat(3000))).toBeNull();
    expect(extractQrCode("../../etc/passwd")).toBeNull();
    expect(extractQrCode("<script>alert(1)</script>")).toBeNull();
  });
});

describe("normalizeCode", () => {
  it("uppercases and removes spaces people type by mistake", () => {
    expect(normalizeCode("  butterfly 003 ")).toBe("BUTTERFLY003");
  });

  it("refuses codes that do not match the printed pattern", () => {
    expect(normalizeCode("-LEADING-DASH")).toBeNull();
    expect(normalizeCode("has_underscore")).toBeNull();
    expect(normalizeCode("emoji🌿")).toBeNull();
    expect(normalizeCode("<script>")).toBeNull();
    expect(normalizeCode("a")).toBeNull();
  });

  it("accepts everything the pattern allows", () => {
    for (const code of ["A1", "BUTTERFLY-003", "STOP-99"]) {
      expect(QR_CODE_PATTERN.test(code)).toBe(true);
      expect(normalizeCode(code)).toBe(code);
    }
  });
});

describe("describeScanFailure", () => {
  it("explains an unreadable label kindly", () => {
    expect(describeScanFailure(null)).toContain("could not be read");
  });

  it("explains that the code belongs to another website", () => {
    expect(describeScanFailure("https://example.com/menu")).toContain("different website");
  });

  it("explains an unrecognised code", () => {
    expect(describeScanFailure("HELLO-THERE")).toContain("not recognised");
  });
});

describe("qrCodeSchema", () => {
  const validInput = {
    publicCode: "butterfly-003",
    locationId: "7f4a0b1c-2d3e-4f50-8a9b-0c1d2e3f4a5b",
    primaryTrailId: null,
    status: "active",
    label: "Butterfly Garden",
  };

  it("normalises a human-typed code to the printed format", () => {
    const result = qrCodeSchema.parse(validInput);
    expect(result.publicCode).toBe("BUTTERFLY-003");
  });

  it("rejects codes with characters that would be ambiguous when printed", () => {
    expect(qrCodeSchema.safeParse({ ...validInput, publicCode: "butterfly 003" }).success).toBe(false);
    expect(qrCodeSchema.safeParse({ ...validInput, publicCode: "🌿" }).success).toBe(false);
    expect(qrCodeSchema.safeParse({ ...validInput, publicCode: "" }).success).toBe(false);
  });

  it("rejects an invalid status or a non-uuid location", () => {
    expect(qrCodeSchema.safeParse({ ...validInput, status: "deleted" }).success).toBe(false);
    expect(qrCodeSchema.safeParse({ ...validInput, locationId: "1" }).success).toBe(false);
  });

  it("validates the path segment before it can reach a database query", () => {
    expect(qrLookupSchema.safeParse({ code: "butterfly-003" }).success).toBe(true);
    expect(qrLookupSchema.safeParse({ code: "../../../etc/passwd" }).success).toBe(false);
    expect(qrLookupSchema.safeParse({ code: "BUTTERFLY 003" }).success).toBe(false);
  });

  it("keeps code regeneration deliberate and clearly labelled", () => {
    const parsed = regenerateQrCodeSchema.parse({ id: validInput.locationId, prefix: "butterfly" });
    expect(parsed.prefix).toBe("BUTTERFLY");
    expect(regenerateQrCodeSchema.safeParse({ id: validInput.locationId }).success).toBe(true);
    expect(
      regenerateQrCodeSchema.safeParse({ id: validInput.locationId, prefix: "with spaces" }).success,
    ).toBe(false);
  });
});
