"use client";
import { useState, type FormEvent } from "react";

type Settings = { enabled: boolean; voice: boolean; tracking: boolean; tone: string; handoffNote: string };
type Faq = { id: string; questionEn: string; questionBn: string; answerEn: string; answerBn: string; keywords: string; enabled: boolean };
const send = (url: string, method: string, body: object) => fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, data: await r.json().catch(() => ({})) as Record<string, unknown> })).catch(() => ({ ok: false, data: {} as Record<string, unknown> }));

/** Switches and tone. The server checks the permission again; hiding this form is not the protection. */
export function AssistantSettingsForm({ initial, envEnabled, aiConfigured, transcription }: { initial: Settings; envEnabled: boolean; aiConfigured: boolean; transcription: boolean }) {
  const [s, setS] = useState(initial); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await send("/api/admin/assistant/settings", "PUT", s); setBusy(false);
    setMsg(r.ok ? "Saved. It can take up to a minute to reach every visitor." : "Could not save.");
  }
  const sw = (key: "enabled" | "voice" | "tracking", label: string, hint: string) => <label className="disc-check" style={{ alignItems: "flex-start" }}><input type="checkbox" checked={s[key]} onChange={e => setS({ ...s, [key]: e.target.checked })} /><span><strong>{label}</strong><br /><small>{hint}</small></span></label>;
  return <form className="disc-form" onSubmit={save}>
    {!envEnabled && <p className="small-note wide" role="status"><strong>Not live on this server:</strong> the environment switch <code>ASSISTANT_ENABLED</code> is not <code>true</code>, so visitors cannot see the assistant whatever you choose here.</p>}
    {!aiConfigured && <p className="small-note wide">No AI provider key is configured. The assistant still answers FAQ and rule questions, searches products and offers human help, but cannot write AI answers.</p>}
    {sw("enabled", "Assistant on", "Shows the mascot and answers questions. Off: the server refuses every chat request.")}
    {sw("voice", "Voice on", transcription ? "Dictation and conversation buttons, and Groq Whisper transcription." : "Buttons are shown; Groq Whisper is not configured, so Auto language falls back to browser recognition.")}
    {sw("tracking", "Order tracking form on", "Lets visitors look up an order with its number and phone, inside the assistant.")}
    <label className="wide">Tone (style only)<input value={s.tone} maxLength={300} onChange={e => setS({ ...s, tone: e.target.value })} placeholder="Warm, short and practical" /></label>
    <label className="wide">Note shown with human help (optional)<input value={s.handoffNote} maxLength={300} onChange={e => setS({ ...s, handoffNote: e.target.value })} placeholder="e.g. Our team replies during business hours" /></label>
    <button className="btn btn-primary" disabled={busy}>Save settings</button><p className="small-note" role="status">{msg}</p>
  </form>;
}

/** Answers given without AI. Edits take effect for visitors within about a minute. */
export function FaqEditor({ initial }: { initial: Faq[] }) {
  const [rows, setRows] = useState(initial); const [editing, setEditing] = useState<Faq | null>(null); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy(true); setMsg("");
    const r = await send("/api/admin/assistant/faq", "POST", { id: editing?.id, questionEn: f.get("questionEn"), questionBn: f.get("questionBn"), answerEn: f.get("answerEn"), answerBn: f.get("answerBn"), keywords: f.get("keywords"), enabled: f.get("enabled") === "on" });
    setBusy(false);
    if (r.ok && Array.isArray(r.data.faq)) { setRows(r.data.faq as Faq[]); setEditing(null); form.reset(); setMsg("Saved."); } else setMsg("Please check the fields (question and English answer are required).");
  }
  async function remove(id: string) {
    if (!window.confirm("Delete this answer?")) return; setBusy(true);
    const r = await send("/api/admin/assistant/faq", "DELETE", { id }); setBusy(false);
    if (r.ok && Array.isArray(r.data.faq)) setRows(r.data.faq as Faq[]); else setMsg("Could not delete.");
  }
  const e = editing;
  return <section className="disc-wrap">
    <form className="disc-form" onSubmit={submit} key={e?.id ?? "new"}>
      <label className="wide">Question (English)<input name="questionEn" required maxLength={200} defaultValue={e?.questionEn} placeholder="Do you offer gift wrapping?" /></label>
      <label className="wide">Question (Bangla, optional)<input name="questionBn" maxLength={200} defaultValue={e?.questionBn} /></label>
      <label className="wide">Answer (English)<textarea name="answerEn" required maxLength={800} rows={3} defaultValue={e?.answerEn} /></label>
      <label className="wide">Answer (Bangla, optional)<textarea name="answerBn" maxLength={800} rows={3} defaultValue={e?.answerBn} /></label>
      <label className="wide">Extra matching words (comma separated)<input name="keywords" maxLength={300} defaultValue={e?.keywords} placeholder="gift, wrap, উপহার" /></label>
      <label className="disc-check"><input type="checkbox" name="enabled" defaultChecked={e ? e.enabled : true} /> On</label>
      <button className="btn btn-primary" disabled={busy}>{e ? "Save changes" : "Add answer"}</button>
      {e && <button type="button" className="btn btn-neutral" onClick={() => setEditing(null)}>Cancel</button>}
      <p className="small-note" role="status">{msg}</p>
    </form>
    <p className="small-note">Delivery, payment and return answers come from <em>Payment &amp; delivery</em> settings automatically; only add answers for other questions. An answer is used only when a visitor&apos;s question clearly matches it.</p>
    {rows.length === 0 ? <p className="small-note">No custom answers yet.</p> : <table className="disc-table"><thead><tr><th>Question</th><th>Answer</th><th>Status</th><th /></tr></thead>
      <tbody>{rows.map(r => <tr key={r.id} className={r.enabled ? "" : "is-off"}><td><strong>{r.questionEn}</strong>{r.questionBn && <small>{r.questionBn}</small>}</td><td>{r.answerEn}</td><td>{r.enabled ? "On" : "Off"}</td>
        <td><button type="button" className="btn btn-neutral btn-sm" onClick={() => setEditing(r)}>Edit</button> <button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => remove(r.id)}>Delete</button></td></tr>)}</tbody></table>}
  </section>;
}

type Unanswered = { id: string; excerpt: string; reason: string; language: string; createdAt: string };
export function UnansweredList({ initial, canResolve }: { initial: Unanswered[]; canResolve: boolean }) {
  const [rows, setRows] = useState(initial); const [msg, setMsg] = useState("");
  async function resolve(id: string) { const r = await send("/api/admin/assistant/unanswered", "POST", { id }); if (r.ok) { setRows(x => x.filter(y => y.id !== id)); setMsg("Marked as handled."); } else setMsg("Could not update."); }
  if (!rows.length) return <p className="small-note">No open unanswered questions.{msg && ` ${msg}`}</p>;
  return <><table className="disc-table"><thead><tr><th>When (Dhaka)</th><th>Question (sanitised)</th><th>Why</th><th>Lang</th><th /></tr></thead>
    <tbody>{rows.map(r => <tr key={r.id}><td>{r.createdAt}</td><td>{r.excerpt}</td><td>{r.reason}</td><td>{r.language}</td><td>{canResolve && <button type="button" className="btn btn-neutral btn-sm" onClick={() => resolve(r.id)}>Mark handled</button>}</td></tr>)}</tbody></table><p className="small-note" role="status">{msg}</p></>;
}
