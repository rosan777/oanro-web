"use client";

import { Printer } from "lucide-react";

/** Opens the browser's print dialog (customers can also "Save as PDF" there). */
export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" className="o-button secondary" onClick={() => window.print()}>
      {label} <Printer size={16} aria-hidden="true" />
    </button>
  );
}
