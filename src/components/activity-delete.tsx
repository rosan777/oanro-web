"use client";
import { useAdminText } from "./admin-text";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Owner only (the page shows these buttons only to the owner; the server checks again). */
async function send(body: object) {
  const res = await fetch("/api/admin/activity", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res;
}

/** Says why a delete failed, so an old page or an expired sign-in is not reported as "not the owner". */
function failText(res: Response | null) {
  if (!res) return "Couldn't reach the server. Check the connection and try again.";
  if (res.status === 404) return "Already deleted. The list has been refreshed.";
  if (res.status === 403)
    return "Not allowed. Your sign-in may have expired: sign in again as the owner (with your two-step code) and retry.";
  return "Couldn't delete right now. Refresh the page and try again.";
}

/** Small "Delete" button beside one log entry; asks once before deleting. */
export function ActivityDeleteOne({ id }: { id: string }) {
  const tr = useAdminText();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-danger btn-sm activity-delete"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Delete this activity entry? This can't be undone.")) return;
        setBusy(true);
        setFailed(false);
        const res = await send({ id });
        if (res?.ok || res?.status === 404) router.refresh();
        else {
          setFailed(true);
          window.alert(failText(res));
        }
        setBusy(false);
      }}
    >
      {failed ? tr("Try again") : tr("Delete")}
    </button>
  );
}

/** Delete the whole log: type DELETE to confirm. The deletion is recorded as the first new entry. */
export function ActivityDeleteAll({ total }: { total: number }) {
  const tr = useAdminText();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  if (!open)
    return (
      <button type="button" className="btn btn-danger" onClick={() => setOpen(true)}>
        Delete all activity ({total})
      </button>
    );
  return (
    <section className="activity-delete-all" aria-label={tr("Delete all activity")}>
      <p>
        This permanently deletes all {total} activity entries. Products, orders, customers and
        everything else stay as they are. One new entry will record that you did it.
      </p>
      <label>
        {tr("Type DELETE to confirm")}
        <input value={typed} onChange={e => setTyped(e.target.value)} autoComplete="off" />
      </label>
      <div className="product-form-actions">
        <button
          type="button"
          className="btn btn-danger-solid"
          disabled={busy || typed.trim() !== "DELETE"}
          onClick={async () => {
            setBusy(true);
            setMsg("");
            const res = await send({ all: true, confirm: typed.trim() });
            if (res?.ok) {
              setOpen(false);
              setTyped("");
            } else setMsg(failText(res));
            // Refresh either way so the entry count on the page is current.
            router.refresh();
            setBusy(false);
          }}
        >
          {tr("Delete everything")}
        </button>
        <button
          type="button"
          className="btn btn-neutral"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          {tr("Cancel")}
        </button>
      </div>
      {msg && <p className="security-msg is-error">{msg}</p>}
    </section>
  );
}
