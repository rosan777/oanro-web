"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * ON/OFF switch for an admin hub card. Collections toggle Published/Hidden; site sections
 * (Services, Global Pulse) toggle their website_section flag. Both are owner-only and audit-logged.
 */
export function SectionSwitch({ kind, id, on, name }: { kind: "collection" | "site"; id: string; on: boolean; name: string }) {
  const router = useRouter();
  const [state, setState] = useState(on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    const next = !state;
    setBusy(true); setError("");
    try {
      const response = await fetch(kind === "collection" ? "/api/admin/collections" : "/api/admin/sections", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "collection" ? { id, status: next ? "published" : "hidden" } : { code: id, enabled: next }),
      });
      if (!response.ok) throw new Error();
      setState(next); router.refresh();
    } catch { setError("Could not switch. Sign in again and retry."); }
    finally { setBusy(false); }
  }
  return <div className="section-switch">
    <span className={`switch-badge ${state ? "is-on" : "is-off"}`} aria-hidden="true">{state ? "ON" : "OFF"}</span>
    <button type="button" role="switch" aria-checked={state} aria-label={`${name}: ${state ? "on, visible on the website" : "off, hidden from the website"}. Click to turn ${state ? "off" : "on"}.`} disabled={busy} onClick={toggle} className={`switch-track ${state ? "is-on" : ""}`}><span className="switch-thumb" /></button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
