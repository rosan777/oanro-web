"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon } from "./action-icon";
/** Profit page: the bKash/Nagad fee percent (what the payment service keeps from money received). */
export function FeeSetting({ percent }: { percent: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(percent)); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/costs", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feePercent: value }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) { setMsg("Saved. Profit below now includes this fee."); router.refresh(); } else setMsg("Enter a number from 0 to 10, like 1.85.");
  }
  return <form className="shipping-cost fee-setting" onSubmit={e => { e.preventDefault(); void save(); }}>
    <label>bKash/Nagad fee (%)<input type="number" min={0} max={10} step={0.01} inputMode="decimal" value={value} disabled={busy} onChange={e => setValue(e.target.value)} /></label>
    <button className="btn btn-neutral btn-sm" disabled={busy || value === String(percent)}><ActionIcon name="save" />Save fee</button>
    <small>The share the payment service keeps (cash-out or merchant charge) on money received through bKash/Nagad. 0 = no fee.</small>
    {msg && <small role="status">{msg}</small>}
  </form>;
}
