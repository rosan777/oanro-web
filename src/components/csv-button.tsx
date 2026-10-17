"use client";
import { ActionIcon } from "./action-icon";
/** Downloads the given rows as a CSV file (opens in Excel / Google Sheets). Built in the browser; nothing is sent anywhere. */
export function CsvButton({ filename, rows, label = "Download CSV" }: { filename: string; rows: (string | number | null)[][]; label?: string }) {
  function download() {
    const cell = (v: string | number | null) => { if (typeof v === "number") return String(v); const s = v === null ? "" : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s; };
    // BOM so Excel reads Bangla text and the ৳ sign correctly.
    const blob = new Blob(["﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" className="btn btn-neutral btn-sm" onClick={download}><ActionIcon name="download" />{label}</button>;
}
