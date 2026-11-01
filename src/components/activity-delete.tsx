"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Owner only (the page shows these buttons only to the owner; the server checks again). */
async function send(body: object) {
  const res = await fetch("/api/admin/activity", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return res?.ok ?? false;
}

/** Small "Delete" button beside one log entry; asks once before deleting. */
export function ActivityDeleteOne({ id }: { id: string }) {
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
        if (await send({ id })) router.refresh();
        else setFailed(true);
        setBusy(false);
      }}
    >
      {failed ? "Try again" : "Delete"}
    </button>
  );
}

/** Delete the whole log: type DELETE to confirm. The deletion is recorded as the first new entry. */
export function ActivityDeleteAll({ total }: { total: number }) {
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
    <section className="activity-delete-all" aria-label="Delete all activity">
      <p>
        This permanently deletes all {total} activity entries. Products, orders, customers and
        everything else stay as they are. One new entry will record that you did it.
      </p>
      <label>
        Type DELETE to confirm
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
            if (await send({ all: true, confirm: typed.trim() })) {
              setOpen(false);
              setTyped("");
              router.refresh();
            } else setMsg("Couldn't delete. Only the owner can do this.");
            setBusy(false);
          }}
        >
          Delete everything
        </button>
        <button
          type="button"
          className="btn btn-neutral"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          Cancel
        </button>
      </div>
      {msg && <p className="security-msg is-error">{msg}</p>}
    </section>
  );
}
