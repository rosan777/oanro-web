"use client";
import { useAdminText } from "./admin-text";
import { useRouter } from "next/navigation";
import { budgetLabel, projectTypeLabel, timelineLabel } from "@/lib/workspace-labels";
import { useState } from "react";
import type { InboxLead, LeadStatus } from "@/lib/lead-store";
import { useAdminCall } from "./admin-ui";
import { formatDhaka } from "@/lib/dhaka-time";

const statuses: LeadStatus[] = ["new", "contacted", "qualified", "won", "lost", "closed"];
const statusText: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Interested",
  won: "Won (sale made)",
  lost: "Lost",
  closed: "Closed",
};
const kindText: Record<InboxLead["kind"], string> = {
  product: "Product inquiry",
  restock: "Notify when back",
  service: "Service inquiry",
  general: "General message",
  privacy: "Privacy request",
};
const when = (iso: string) => formatDhaka(iso, "en", { year: true });

/** Inquiry inbox: filter by status, change status, assign to a team member, add notes and reply by email (needs leads.manage). */
export function LeadInbox({
  initial,
  people,
  signoff,
  canManage,
  canProject = false,
}: {
  initial: InboxLead[];
  people: { id: string; name: string }[];
  /** The team's saved sign-off for email replies. */
  signoff: string;
  canManage: boolean;
  /** Staff with projects.manage can turn an inquiry into a client project. */
  canProject?: boolean;
}) {
  const tr = useAdminText();
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<LeadStatus | "all" | "open">("open");
  const [view, setView] = useState<"list" | "board">("list");
  const [note, setNote] = useState<Record<string, string>>({});
  const { busy, notice, call } = useAdminCall<{ leads: InboxLead[] }>(
    "/api/admin/leads",
    { note: tr("Note") },
    d => setLeads(d.leads),
  );

  // "open" hides inquiries that are won, lost or closed.

  const shown = leads.filter(l =>
    filter === "all"
      ? true
      : filter === "open"
        ? !["won", "lost", "closed"].includes(l.status)
        : l.status === filter,
  );
  const count = (s: LeadStatus) => leads.filter(l => l.status === s).length;
  return (
    <section className="admin-sections lead-inbox">
      <div className="lead-filters" role="group" aria-label={tr("Filter inquiries")}>
        {(["open", "all", ...statuses] as const).map(f => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "open"
              ? `Open (${leads.filter(l => !["won", "lost", "closed"].includes(l.status)).length})`
              : f === "all"
                ? `All (${leads.length})`
                : `${statusText[f]} (${count(f)})`}
          </button>
        ))}
      </div>
      <div className="lead-filters" role="group" aria-label={tr("View")}>
        <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
          {tr("List")}
        </button>
        <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>
          {tr("Board")}
        </button>
      </div>
      {view === "board" && (
        <div className="o-kanban lead-board" aria-label={tr("Inquiries by status")}>
          {statuses.map(st => (
            <section key={st} aria-labelledby={`lead-col-${st}`}>
              <h3 id={`lead-col-${st}`}>
                {statusText[st]}
                <span>{count(st)}</span>
              </h3>
              {leads
                .filter(l => l.status === st)
                .map(l => (
                  <article key={l.id} className="o-kanban-card">
                    <span className="o-status">{kindText[l.kind]}</span>
                    <h4>{l.name}</h4>
                    <p>
                      {[
                        l.subject && !l.subject.startsWith("privacy:") ? l.subject : "",
                        projectTypeLabel(l.projectType, false),
                      ]
                        .filter(Boolean)
                        .join(" · ") || l.message.slice(0, 80)}
                    </p>
                    <small>{when(l.createdAt)}</small>
                    {canManage && (
                      <label>
                        <span className="o-sr">Move {l.name} to</span>
                        <select
                          value={l.status}
                          disabled={busy}
                          onChange={e =>
                            call(
                              "PATCH",
                              { id: l.id, status: e.target.value },
                              `Moved to ${statusText[e.target.value as LeadStatus].toLowerCase()}.`,
                            )
                          }
                        >
                          {statuses.map(s => (
                            <option key={s} value={s}>
                              {statusText[s]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </article>
                ))}
            </section>
          ))}
        </div>
      )}
      {view === "list" && !canManage && (
        <p className="admin-callout">
          You can view inquiries. Changing status, assigning or adding notes needs the “Handle
          inquiries” permission.
        </p>
      )}
      {view === "list" && shown.length === 0 && <p>{tr("No inquiries here.")}</p>}
      <ul className="admin-product-list" hidden={view !== "list"}>
        {shown.map(l => (
          <li key={l.id} className={`lead-card status-${l.status}`}>
            <details>
              <summary>
                <span className={`switch-badge small ${l.status === "new" ? "is-on" : "is-off"}`}>
                  {statusText[l.status]}
                </span>{" "}
                <strong>{l.name}</strong> · {kindText[l.kind]}
                {l.subject
                  ? ` · ${l.subject.startsWith("payment") ? `Payment / refund${l.subject.includes(":") ? ` · ${l.subject.slice(8)}` : ""}` : l.subject.replace(/^privacy:/, "")}`
                  : ""}
                <small> · {when(l.createdAt)}</small>
              </summary>
              <dl className="lead-details">
                {l.phone && (
                  <>
                    <dt>{tr("Phone")}</dt>
                    <dd>
                      <a href={`tel:${l.phone}`}>{l.phone}</a>
                      {l.preferredContact === "whatsapp" && (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={`https://wa.me/${l.phone.replace(/\D/g, "").replace(/^0/, "880")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {tr("WhatsApp")}
                          </a>
                        </>
                      )}
                    </dd>
                  </>
                )}
                {l.email && (
                  <>
                    <dt>{tr("Email")}</dt>
                    <dd>
                      <a href={`mailto:${l.email}`}>{l.email}</a>
                    </dd>
                  </>
                )}
                {l.subject.startsWith("Shop assistant") && (
                  <>
                    <dt>{tr("Source")}</dt>
                    <dd>
                      <strong>{tr("Shop assistant chat")}</strong>
                      {l.subject.includes(" · ") ? (
                        <>
                          {" "}
                          · page{" "}
                          <a href={l.subject.split(" · ")[1]} target="_blank" rel="noreferrer">
                            {l.subject.split(" · ")[1]}
                          </a>
                        </>
                      ) : (
                        ""
                      )}
                    </dd>
                  </>
                )}
                <dt>{tr("Prefers")}</dt>
                <dd>{l.preferredContact}</dd>
                {l.productSlug && (
                  <>
                    <dt>{tr("Product")}</dt>
                    <dd>
                      <a href={`/products/${l.productSlug}`} target="_blank" rel="noreferrer">
                        {l.subject}
                      </a>
                      {l.size ? ` · ${l.size}` : ""}
                      {l.quantity ? ` · qty ${l.quantity}` : ""}
                    </dd>
                  </>
                )}
                {(l.projectType || l.budgetRange || l.timeline) && (
                  <>
                    <dt>{tr("Project brief")}</dt>
                    <dd>
                      {[
                        projectTypeLabel(l.projectType, false),
                        budgetLabel(l.budgetRange, false),
                        timelineLabel(l.timeline, false),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </dd>
                  </>
                )}
                {l.userId && (
                  <>
                    <dt>{tr("Account")}</dt>
                    <dd>{tr("Sent while signed in")}</dd>
                  </>
                )}
                {l.message && (
                  <>
                    <dt>{tr("Message")}</dt>
                    <dd className="lead-message">{l.message}</dd>
                  </>
                )}
                <dt>{tr("Language")}</dt>
                <dd>{l.locale === "bn" ? tr("Bangla") : tr("English")}</dd>
              </dl>
              {canProject && (l.kind === "service" || l.kind === "general") && (
                <button
                  type="button"
                  className="btn btn-neutral btn-sm"
                  onClick={async () => {
                    const res = await fetch("/api/admin/projects", {
                      method: "POST",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ action: "create", leadId: l.id, clientName: l.name }),
                    }).catch(() => null);
                    const data = (await res?.json().catch(() => ({}))) as { id?: string };
                    if (data.id) router.push(`/admin/projects/${data.id}`);
                  }}
                >
                  {tr("Turn into a client project")}
                </button>
              )}
              <div className="admin-product-actions">
                <label>
                  {tr("Status")}
                  <select
                    value={l.status}
                    disabled={busy || !canManage}
                    onChange={e =>
                      call(
                        "PATCH",
                        { id: l.id, status: e.target.value },
                        `Marked ${statusText[e.target.value as LeadStatus].toLowerCase()}.`,
                      )
                    }
                  >
                    {statuses.map(s => (
                      <option key={s} value={s}>
                        {statusText[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("Assigned to")}
                  <select
                    value={l.assignedTo ?? ""}
                    disabled={busy || !canManage}
                    onChange={e =>
                      call(
                        "PATCH",
                        { id: l.id, assignedTo: e.target.value || null },
                        tr("Assignment saved."),
                      )
                    }
                  >
                    <option value="">{tr("Nobody")}</option>
                    {people.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="lead-notes">
                {l.notes.map(n => (
                  <p key={n.id}>
                    <small>
                      {n.author} · {when(n.createdAt)}
                    </small>
                    {n.body}
                  </p>
                ))}
                {canManage && (
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      if (
                        await call("PATCH", { id: l.id, note: note[l.id] ?? "" }, tr("Note added."))
                      )
                        setNote(x => ({ ...x, [l.id]: "" }));
                    }}
                  >
                    <label className="sr-only" htmlFor={`note-${l.id}`}>
                      {tr("Internal note")}
                    </label>
                    <textarea
                      id={`note-${l.id}`}
                      rows={2}
                      maxLength={2000}
                      placeholder={tr("Internal note (customers never see this)")}
                      value={note[l.id] ?? ""}
                      onChange={e => setNote(x => ({ ...x, [l.id]: e.target.value }))}
                      disabled={busy}
                    />
                    <button
                      type="submit"
                      className="button"
                      disabled={busy || !(note[l.id] ?? "").trim()}
                    >
                      {tr("Add note")}
                    </button>
                  </form>
                )}
              </div>
              {canManage && <LeadReplyForm lead={l} signoff={signoff} onSent={setLeads} />}
            </details>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite">
        {notice}
      </p>
    </section>
  );
}

/** Starting subject and greeting for a reply, in the language the customer wrote in. */
function replyDefaults(l: InboxLead) {
  const bn = l.locale === "bn";
  const about = (l.kind === "product" || l.kind === "service" || l.kind === "restock") && l.subject;
  return {
    subject: bn
      ? about
        ? `Re: ${l.subject} সম্পর্কে আপনার জিজ্ঞাসা`
        : "Re: OANRO-তে আপনার বার্তা"
      : about
        ? `Re: Your inquiry about ${l.subject}`
        : "Re: Your message to OANRO",
    greeting: bn ? `প্রিয় ${l.name},` : `Dear ${l.name},`,
  };
}

/** "Reply by email": subject, greeting, message and sign-off, sent to the customer from support@oanro.com. */
function LeadReplyForm({
  lead,
  signoff,
  onSent,
}: {
  lead: InboxLead;
  signoff: string;
  onSent: (leads: InboxLead[]) => void;
}) {
  const tr = useAdminText();
  const start = replyDefaults(lead);
  const [subject, setSubject] = useState(start.subject),
    [greeting, setGreeting] = useState(start.greeting),
    [body, setBody] = useState(""),
    [closing, setClosing] = useState(signoff);
  const { busy, notice, call } = useAdminCall<{ leads: InboxLead[] }>(
    "/api/admin/leads",
    {
      subject: tr("Subject"),
      greeting: tr("Greeting"),
      body: tr("Message"),
      signoff: tr("Sign-off"),
    },
    d => onSent(d.leads),
  );
  if (!lead.email)
    return (
      <p className="lead-reply-none">
        No email address on this inquiry. Reply by phone
        {lead.preferredContact === "whatsapp" ? " or WhatsApp" : ""}.
      </p>
    );
  const ready = subject.trim().length >= 3 && body.trim().length >= 10;
  const id = (f: string) => `reply-${f}-${lead.id}`;
  return (
    <details className="lead-reply">
      <summary>{tr("Reply by email")}</summary>
      <form
        onSubmit={async e => {
          e.preventDefault();
          if (!window.confirm(`Send this email to ${lead.email}?`)) return;
          if (
            await call(
              "PATCH",
              { id: lead.id, reply: { subject, greeting, body, signoff: closing } },
              `Email sent to ${lead.email}. A copy is saved in the notes above.`,
            )
          )
            setBody("");
        }}
      >
        <p className="lead-reply-route">
          From <strong>support@oanro.com</strong> to <strong>{lead.email}</strong>. When the
          customer answers, it arrives in the support@oanro.com inbox.
        </p>
        <label htmlFor={id("subject")}>{tr("Subject")}</label>
        <input
          id={id("subject")}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          maxLength={150}
          disabled={busy}
        />
        <label htmlFor={id("greeting")}>{tr("Greeting")}</label>
        <input
          id={id("greeting")}
          value={greeting}
          onChange={e => setGreeting(e.target.value)}
          maxLength={120}
          disabled={busy}
        />
        <label htmlFor={id("body")}>{tr("Message")}</label>
        <textarea
          id={id("body")}
          rows={6}
          maxLength={5000}
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={tr("Write your answer to the customer (at least 10 letters).")}
          disabled={busy}
        />
        <label htmlFor={id("signoff")}>{tr("Sign-off")}</label>
        <textarea
          id={id("signoff")}
          rows={3}
          maxLength={300}
          value={closing}
          onChange={e => setClosing(e.target.value)}
          disabled={busy}
        />
        <small>{tr("The sign-off you send with is remembered for the next reply.")}</small>
        <button type="submit" className="btn btn-primary" disabled={busy || !ready}>
          {busy ? tr("Sending…") : tr("Send email")}
        </button>
        {notice && (
          <p role="status" aria-live="polite">
            {notice}
          </p>
        )}
      </form>
    </details>
  );
}
