"use client";
import { useState } from "react";
import { useAdminCall } from "./admin-ui";
import { ActionIcon } from "./action-icon";

type Result = { ok?: boolean; sent?: number; failed?: number; left?: number };
const labels = { subject: "Subject (3–150 letters)", body: "Message (10–5000 letters)" };
/** Owner: write an email to one customer (customerId) or to every customer (count = how many will get it). */
export function CustomerEmail({ customerId, name, count, limit }: { customerId?: string; name?: string; count?: number; limit?: number }) {
  const all = !customerId;
  const [subject, setSubject] = useState(""), [body, setBody] = useState("");
  const { busy, notice, call } = useAdminCall<Result>("/api/admin/customers", labels, () => {});
  const ready = subject.trim().length >= 3 && body.trim().length >= 10;
  const sendOne = async () => { if (await call("POST", { action: "email", id: customerId, subject, body }, `Email sent to ${name || "the customer"}.`)) { setSubject(""); setBody(""); } };
  const test = () => void call("POST", { action: "email-all", test: true, subject, body }, "Test sent to your own email. Check how it looks (and your Spam folder).");
  const sendAll = async () => {
    if (!window.confirm(`Send "${subject.trim()}" to ${count} customer${count === 1 ? "" : "s"}? This can't be undone.`)) return;
    if (await call("POST", { action: "email-all", subject, body }, "Sending finished. See the activity log for the count.")) { setSubject(""); setBody(""); }
  };
  return <section className="profile-card customer-email">
    <h2>{all ? "Email all customers" : "Send an email"}</h2>
    <p>{all
      ? <>Goes to <strong>{count}</strong> customer{count === 1 ? "" : "s"} with a verified email, one email each, from your OANRO address. People who unsubscribed are skipped. Every email has an unsubscribe link at the bottom.{count && limit && count > limit ? ` Only the first ${limit} are sent per click.` : ""}</>
      : <>Goes only to {name || "this customer"}, from your OANRO address. The subject is saved in the activity log; the message is not.</>}</p>
    <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} placeholder={all ? "e.g. New winter collection is here" : "e.g. About your order"} disabled={busy} /></label>
    <label>Message<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={5000} rows={7} placeholder="Write your message. “Hi [name],” and “— Team OANRO” are added for you." disabled={busy} /></label>
    <div className="product-form-actions">
      {all ? <>
        <button type="button" className="btn btn-neutral" disabled={busy || !ready} onClick={test}><ActionIcon name="inquiry" />Send a test to me</button>
        <button type="button" className="btn btn-primary" disabled={busy || !ready || !count} onClick={() => void sendAll()}><ActionIcon name="inquiry" />{busy ? "Sending…" : `Send to ${count} customer${count === 1 ? "" : "s"}`}</button>
      </> : <button type="button" className="btn btn-primary" disabled={busy || !ready} onClick={() => void sendOne()}><ActionIcon name="inquiry" />{busy ? "Sending…" : "Send email"}</button>}
    </div>
    {notice && <p role="status" aria-live="polite">{notice}</p>}
  </section>;
}
