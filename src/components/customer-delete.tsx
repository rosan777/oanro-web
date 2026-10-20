"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
/** Admin: delete a customer's account (type DELETE to confirm). Blocked while orders are in progress. */
export function CustomerDelete({ id, name, blockers }: { id: string; name: string; blockers: string[] }) {
  const router = useRouter();
  const [typed, setTyped] = useState(""); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  async function remove() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/customers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, confirm: typed.trim(), reason: reason.trim() }) }).catch(() => null);
    const body = await res?.json().catch(() => ({})) as { error?: string } | undefined;
    setBusy(false);
    if (res?.ok) { router.push("/admin/customers"); router.refresh(); return; }
    setMsg(body?.error?.startsWith("ACTIVE_ORDERS") ? `Orders still in progress: ${body.error.slice(14)}. Finish or reject them first.` : body?.error === "FORBIDDEN" ? "You don't have permission to delete customers." : "Couldn't delete the account. Try again.");
  }
  return <section className="profile-card delete-account">
    <h2>Delete account</h2>
    <p>Erases {name || "this customer"}&apos;s name, email, phone, addresses, sign-in methods, two-step setup and inquiry contact details, and signs them out. Their orders stay (anonymized) so reports and accounts stay correct. This can&apos;t be undone and is recorded in the activity log.</p>
    {blockers.length ? <p className="security-msg is-error">Can&apos;t delete yet: orders still in progress ({blockers.join(", ")}). Deliver, return or reject them first.</p> : <div className="delete-confirm">
      <label>Reason (optional, saved in the activity log)<input value={reason} onChange={e => setReason(e.target.value)} maxLength={150} placeholder="e.g. customer asked by email" /></label>
      <label>Type DELETE to confirm<input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" spellCheck={false} /></label>
      <div className="delete-actions"><button type="button" className="btn btn-danger-solid" disabled={busy || typed.trim() !== "DELETE"} onClick={remove}>{busy ? "Deleting…" : "Delete account"}</button></div>
    </div>}
    {msg && <p role="alert" className="security-msg is-error">{msg}</p>}
  </section>;
}
