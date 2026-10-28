import { randomUUID } from "node:crypto";
import { requireAdminPage } from "@/lib/admin-guard";
import { assistantEnvEnabled, dailyCaps, knownProviders, limits, modelFor, providerOrder, providerSpecs, whisper } from "@/lib/assistant/config";
import { cooldownUntil, isHealthy, providerConfigured } from "@/lib/assistant/providers";
import { getSessionLogs, getSettings, listFaq, listSessions, listUnanswered, usageSince, utcDay } from "@/lib/assistant/store";
import { auditEvent } from "@/lib/db/schema";
import { formatDhaka, fromDhakaInput } from "@/lib/dhaka-time";
import { catalogDb } from "@/lib/store-products";
import { AssistantSettingsForm, FaqEditor, UnansweredList } from "@/components/assistant-admin";
import Link from "next/link";
export const dynamic = "force-dynamic";
export const metadata = { title: "Assistant", robots: { index: false } };

type Search = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const when = (d: Date | string) => formatDhaka(d, "en", { year: true });
const dayStart = (v: string) => { try { return v ? fromDhakaInput(`${v}T00:00`) : null; } catch { return null; } };

export default async function AssistantAdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { session, access } = await requireAdminPage(["assistant.view", "assistant.edit"]);
  const canView = access.permissions.has("assistant.view"), canEdit = access.permissions.has("assistant.edit");
  const db = catalogDb(); const sp = await searchParams;
  const filters = { q: one(sp.q), language: one(sp.language), outcome: one(sp.outcome), provider: one(sp.provider), from: one(sp.from), to: one(sp.to), page: Number(one(sp.page)) || 0 };
  const sessionId = /^[a-f0-9]{32}$/.test(one(sp.session)) ? one(sp.session) : "";

  const settings = await getSettings(db).catch(() => null);
  if (!settings) return <main id="main-content" className="container auth-page"><h1>JUNO bot</h1><p role="alert">The assistant database is not ready or could not be reached. JUNO stays off until this is fixed. Apply the assistant database migration and reload this page. Existing shop pages remain available.</p></main>;
  const [faq, unanswered, usage] = await Promise.all([canEdit ? listFaq(db) : [], listUnanswered(db, false), usageSince(db, 7)]);
  const list = canView ? await listSessions(db, { q: filters.q, language: filters.language || undefined, outcome: filters.outcome || undefined, provider: filters.provider || undefined,
    from: dayStart(filters.from) ?? undefined, to: filters.to ? new Date((dayStart(filters.to)?.getTime() ?? 0) + 864e5) : undefined, page: filters.page }) : null;
  const detail = canView && sessionId ? await getSessionLogs(db, sessionId) : null;
  // Reading chats is itself recorded in the activity log (who looked at which session, never what it said).
  if (detail) await db.insert(auditEvent).values({ id: randomUUID(), actorId: session.user.id, action: "assistant.view-conversation", targetId: sessionId, reason: "opened conversation" });

  const today = utcDay(), todayRows = usage.filter(u => u.day === today);
  const stat = (provider: string, kind: "chat" | "transcribe") => todayRows.find(u => u.provider === provider && u.kind === kind);
  const providers = [...new Set([...providerOrder(), ...knownProviders.filter(p => p !== "gemini" && providerConfigured(p))])];
  const href = (extra: Record<string, string | number>) => `/admin/assistant?${new URLSearchParams(Object.entries({ ...filters, ...extra }).filter(([, v]) => v !== "" && v !== 0).map(([k, v]) => [k, String(v)])).toString()}`;

  return <main id="main-content" className="container auth-page"><h1>Assistant</h1>
    <p className="small-note">The shopping assistant for visitors. Conversations are stored sanitised for 30 days, then deleted automatically. Session IDs are random and are <strong>not</strong> verified customer identities; contact details left through “Ask us to contact me” are in <Link href="/admin/leads">Inquiries</Link>. Times are Asia/Dhaka.</p>

    {canEdit && settings && <><h2 style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Switches and tone</h2>
      <AssistantSettingsForm initial={settings} envEnabled={assistantEnvEnabled()} aiConfigured={providerConfigured("groq") || providerConfigured("cloudflare")} transcription={Boolean(whisper().key)} />
    </>}

    <h2 style={{ fontSize: "1.3rem", marginTop: "1.5rem" }}>Usage today</h2>
    <p className="small-note">Counted by OANRO per UTC day (it starts at 6:00 AM Dhaka). Providers do not tell us how much free quota is left; their own console is the source of truth. Token counts are as reported by the provider; Cloudflare neurons are not reported, so only requests are capped for it.</p>
    <table className="disc-table"><thead><tr><th>Service</th><th>Model</th><th>Requests</th><th>Tokens in / out</th><th>Audio seconds</th><th>Failures</th><th>Status</th></tr></thead><tbody>
      {providers.map(p => { const s = stat(p, "chat"), caps = dailyCaps(p); const cd = cooldownUntil(p);
        return <tr key={p}><td><strong>{providerSpecs[p].label}</strong><small>{providerSpecs[p].resetNote}</small></td><td>{modelFor(p)}</td><td>{s?.requests ?? 0} / {caps.requests || "off"}</td><td>{s?.inputTokens ?? 0} / {s?.outputTokens ?? 0}<small>cap {caps.tokens || "none"} total</small></td><td>—</td><td>{s?.failures ?? 0}</td>
          <td>{!providerConfigured(p) ? "No key set" : !isHealthy(p) ? `Cooling down until ${when(new Date(cd))} (this server)` : "Ready"}</td></tr>; })}
      <tr><td><strong>Groq Whisper (speech to text)</strong><small>Free limits listed by Groq: 2,000 requests and 28,800 audio seconds per day.</small></td><td>{whisper().model}</td><td>{stat("groq", "transcribe")?.requests ?? 0} / {Number(process.env.ASSISTANT_TRANSCRIBE_DAILY_REQUESTS) || 1500}</td><td>—</td><td>{stat("groq", "transcribe")?.audioSeconds ?? 0} / {limits.audioDailySeconds}</td><td>{stat("groq", "transcribe")?.failures ?? 0}</td><td>{whisper().key ? "Ready" : "No key set"}</td></tr>
    </tbody></table>
    {!assistantEnvEnabled() && <p className="small-note"><strong>The hosting emergency stop is active</strong>, so visitors do not see the assistant yet.</p>}
    <details><summary>Last 7 days</summary><table className="disc-table"><thead><tr><th>Day (UTC)</th><th>Service</th><th>Kind</th><th>Requests</th><th>Tokens in/out</th><th>Audio s</th><th>Failures</th></tr></thead><tbody>
      {usage.map(u => <tr key={`${u.day}${u.provider}${u.kind}`}><td>{u.day}</td><td>{u.provider}</td><td>{u.kind}</td><td>{u.requests}</td><td>{u.inputTokens}/{u.outputTokens}</td><td>{u.audioSeconds}</td><td>{u.failures}</td></tr>)}</tbody></table></details>

    {canEdit && settings && <>
      <h2 style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Answers without AI (FAQ)</h2>
      <FaqEditor initial={faq.map(f => ({ id: f.id, questionEn: f.questionEn, questionBn: f.questionBn, answerEn: f.answerEn, answerBn: f.answerBn, keywords: f.keywords, enabled: f.enabled }))} /></>}

    <h2 style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Unanswered questions ({unanswered.length})</h2>
    <p className="small-note">Questions the assistant could not answer reliably (sanitised excerpts, deleted after 30 days). Add a FAQ answer, then mark them handled.</p>
    <UnansweredList initial={unanswered.map(u => ({ id: u.id, excerpt: u.excerpt, reason: u.reason, language: u.language, createdAt: when(u.createdAt) }))} canResolve={canEdit} />

    {canView && list && <><h2 style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Conversations</h2>
      <form className="disc-form" method="get" action="/admin/assistant">
        <label>Search text<input name="q" defaultValue={filters.q} maxLength={80} /></label>
        <label>From (Dhaka date)<input type="date" name="from" defaultValue={filters.from} /></label>
        <label>To<input type="date" name="to" defaultValue={filters.to} /></label>
        <label>Language<select name="language" defaultValue={filters.language}><option value="">Any</option><option value="en">English</option><option value="bn">Bangla</option><option value="banglish">Banglish</option></select></label>
        <label>Outcome<select name="outcome" defaultValue={filters.outcome}><option value="">Any</option><option value="answered">Answered by AI</option><option value="faq">Answered by FAQ</option><option value="unanswered">Unanswered</option><option value="handoff">Human hand-off</option><option value="error">Error</option></select></label>
        <label>Provider<select name="provider" defaultValue={filters.provider}><option value="">Any</option>{knownProviders.filter(p => p !== "gemini").map(p => <option key={p} value={p}>{providerSpecs[p].label}</option>)}</select></label>
        <button className="btn btn-primary">Filter</button></form>
      {list.sessions.length === 0 ? <p className="small-note">No conversations match.</p> : <table className="disc-table"><thead><tr><th>Session</th><th>Started</th><th>Last message</th><th>Lang</th><th>Outcome</th><th>Messages</th><th /></tr></thead><tbody>
        {list.sessions.map(s => <tr key={s.id}><td><code>{s.id.slice(0, 8)}</code></td><td>{when(s.startedAt)}</td><td>{when(s.lastAt)}</td><td>{s.language}</td><td>{s.outcome}</td><td>{s.messageCount}</td><td><Link className="btn btn-neutral btn-sm" href={href({ session: s.id })}>Open</Link></td></tr>)}</tbody></table>}
      <p className="small-note">{filters.page > 0 && <Link href={href({ page: filters.page - 1 })}>← Newer</Link>} {list.more && <Link href={href({ page: filters.page + 1 })}>Older →</Link>}</p>
      {detail && <section aria-label="Conversation"><h3 style={{ marginTop: "1.5rem" }}>Session <code>{detail.session.id.slice(0, 8)}</code> · {detail.session.outcome}</h3>
        <p className="small-note">Random session ID, not a verified identity. Messages have personal details redacted automatically; redaction is not perfect, so handle this page as private. Opening it was recorded in the activity log.</p>
        <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: ".5rem" }}>{detail.logs.map(l => <li key={l.id} style={{ padding: ".5rem .75rem", borderRadius: 10, background: l.role === "user" ? "#e8efe9" : "#fff", border: "1px solid #deded8" }}>
          <small><strong>{l.role === "user" ? "Visitor" : "Assistant"}</strong> · {when(l.createdAt)} · {l.language}{l.role === "assistant" ? ` · ${l.source}${l.provider ? ` · ${l.provider}/${l.model}` : ""}${l.inputTokens || l.outputTokens ? ` · ${l.inputTokens}/${l.outputTokens} tokens` : ""}` : ""}</small><div style={{ whiteSpace: "pre-wrap" }}>{l.content}</div></li>)}</ol></section>}
    </>}
  </main>;
}
