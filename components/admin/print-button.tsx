"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Triggers the browser print dialog. Hidden when the page is printed. */
export function PrintButton({ label = "Print this sign" }: { label?: string }) {
  return (
    <Button
      variant="warm"
      size="sm"
      className="print-hidden"
      onClick={() => {
        window.print();
      }}
    >
      <Printer aria-hidden="true" />
      {label}
    </Button>
  );
}
