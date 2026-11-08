"use client";

// Staff screens for client projects (admin → Client projects). The buttons shown follow the viewer's
// project permissions, but every action is checked again by /api/admin/projects on the server.

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import Link from "./locale-link";
import { useLocale } from "./locale";
import { formatPrice } from "@/lib/catalog";
import {
  approvalStatusLabel,
  invoiceStatusLabel,
  milestoneStatusLabel,
  projectStatusLabel,
  projectTypeLabel,
} from "@/lib/workspace-labels";
import type { WorkspaceData } from "./workspace-view";

type Admin = WorkspaceData & {
  project: WorkspaceData["project"] & { leadId: string | null };
  members: { id: string; email: string; acceptedAt: string | null; expiresAt: string | null }[];
  activity: { action: string; reason: string; createdAt: string; actor: string | null }[];
};

const projectStatuses = [
  "planning",
  "in_progress",
  "in_review",
  "completed",
  "on_hold",
  "cancelled",
];
const milestoneStatuses = ["todo", "in_progress", "in_review", "done"];
const projectTypes = ["website", "ecommerce", "mobile-app", "software", "strategy", "other"];

function useApi() {
  const router = useRouter();
  const { locale } = useLocale();
  const bn = locale === "bn";
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  async function call(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as {
      id?: string;
      error?: string;
      field?: string;
    };
    setBusy(false);
    if (!res?.ok) {
      setNote({
        ok: false,
        text:
          data.error === "INVALID_INPUT"
            ? bn
              ? `এই ঘরটি ঠিক করুন: ${data.field}`
              : `Please check the field: ${data.field}`
            : data.error === "NOT_ALLOWED" || data.error === "FORBIDDEN"
              ? bn
                ? "এই কাজের অনুমতি আপনার নেই।"
                : "You don't have permission for this."
              : data.error === "INVALID_STATE"
                ? bn
                  ? "এই অবস্থায় এটি করা যায় না।"
                  : "That isn't possible in the current state."
                : bn
                  ? "সংরক্ষণ হয়নি। আবার চেষ্টা করুন।"
                  : "Couldn't save. Please try again.",
      });
      return null;
    }
    setNote({ ok: true, text: ok });
    router.refresh();
    return data;
  }
  const status = note && (
    <p className={note.ok ? "o-alert o-alert-ok" : "checkout-error"} role="status">
      {note.text}
    </p>
  );
  return { call, busy, status, setNote };
}

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? "wide" : undefined}>
      {label}
      {children}
    </label>
  );
}

/** Admin → Client projects: list and "New project". */
export function ProjectList({
  projects,
  canManage,
}: {
  projects: {
    id: string;
    title: string;
    clientName: string;
    status: string;
    projectType: string;
    targetDate: string | null;
    updatedAt: string;
  }[];
  canManage: boolean;
}) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const router = useRouter();
  const { call, busy, status } = useApi();
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("active");
  const shown = projects.filter(p =>
    filter === "all"
      ? true
      : filter === "active"
        ? !["completed", "cancelled"].includes(p.status)
        : p.status === filter,
  );
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const done = await call(
      { action: "create", ...f },
      t("Project created.", "প্রজেক্ট তৈরি হয়েছে।"),
    );
    if (done?.id) router.push(`/admin/projects/${done.id}`);
  }
  return (
    <div className="o-panel">
      {status}
      <div className="o-table-tools">
        <label className="o-select">
          {t("Show", "দেখান")}
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="active">{t("Active projects", "চলমান প্রজেক্ট")}</option>
            <option value="all">{t("All projects", "সব প্রজেক্ট")}</option>
            {projectStatuses.map(s => (
              <option key={s} value={s}>
                {projectStatusLabel(s, bn)}
              </option>
            ))}
          </select>
        </label>
        {canManage && !creating && (
          <button type="button" className="o-button" onClick={() => setCreating(true)}>
            {t("New project", "নতুন প্রজেক্ট")} <Plus size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      {creating && (
        <form className="o-form o-form-grid o-admin-card" onSubmit={create}>
          <Field label={t("Project title *", "প্রজেক্টের নাম *")}>
            <input name="title" required maxLength={120} />
          </Field>
          <Field label={t("Client name", "ক্লায়েন্টের নাম")}>
            <input name="clientName" maxLength={120} />
          </Field>
          <Field label={t("Type", "ধরন")}>
            <select name="projectType" defaultValue="website">
              {projectTypes.map(s => (
                <option key={s} value={s}>
                  {projectTypeLabel(s, bn)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("Target date", "লক্ষ্য তারিখ")}>
            <input name="targetDate" type="date" />
          </Field>
          <Field label={t("Summary (the client sees this)", "সারসংক্ষেপ (ক্লায়েন্ট দেখবেন)")} wide>
            <textarea name="summary" rows={3} maxLength={2000} />
          </Field>
          <div className="o-step-actions wide">
            <button type="button" className="o-button secondary" onClick={() => setCreating(false)}>
              {t("Cancel", "বাতিল")}
            </button>
            <button className="o-button" disabled={busy}>
              {t("Create project", "প্রজেক্ট তৈরি করুন")}
            </button>
          </div>
        </form>
      )}
      <div className="o-table-wrap">
        <table className="o-admin-table">
          <caption className="o-sr">{t("Client projects", "ক্লায়েন্ট প্রজেক্ট")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("Project", "প্রজেক্ট")}</th>
              <th scope="col">{t("Client", "ক্লায়েন্ট")}</th>
              <th scope="col">{t("Status", "অবস্থা")}</th>
              <th scope="col">{t("Target", "লক্ষ্য")}</th>
              <th scope="col">
                <span className="o-sr">{t("Open", "খুলুন")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(p => (
              <tr key={p.id}>
                <td>
                  <b>{p.title}</b>
                  <small>{projectTypeLabel(p.projectType, bn)}</small>
                </td>
                <td>{p.clientName || "—"}</td>
                <td>
                  <span className="o-status">{projectStatusLabel(p.status, bn)}</span>
                </td>
                <td>{p.targetDate ?? "—"}</td>
                <td>
                  <Link href={`/admin/projects/${p.id}`}>{t("Open", "খুলুন")} →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && (
          <p className="o-table-empty">
            {t("No projects here yet.", "এখানে এখনো কোনো প্রজেক্ট নেই।")}
          </p>
        )}
      </div>
    </div>
  );
}

/** Admin → one client project. */
export function ProjectManager({ data, uploads }: { data: Admin; uploads: boolean }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const { call, busy, status, setNote } = useApi();
  const router = useRouter();
  const { project, milestones, files, approvals, invoices, members, activity, role } = data;
  const pid = project.id;
  const form = (e: FormEvent<HTMLFormElement>) =>
    Object.fromEntries(new FormData(e.currentTarget).entries());
  const [lines, setLines] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);

  async function uploadStaff(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const el = e.currentTarget;
    const f = new FormData(el);
    const file = f.get("file");
    if (!(file instanceof File) || !file.size) return;
    const res = await fetch(`/api/workspace/projects/${pid}/files`, {
      method: "POST",
      body: f,
    }).catch(() => null);
    if (res?.ok) {
      setNote({ ok: true, text: t("File uploaded.", "ফাইল আপলোড হয়েছে।") });
      el.reset();
      router.refresh();
    } else
      setNote({
        ok: false,
        text: t(
          "Upload failed: use PDF, PNG, JPG, WEBP or ZIP up to 4 MB.",
          "আপলোড হয়নি: ৪ MB পর্যন্ত PDF, PNG, JPG, WEBP বা ZIP দিন।",
        ),
      });
  }

  return (
    <div className="o-admin-project">
      {status}
      <section className="o-admin-card">
        <h2>{t("Project details", "প্রজেক্টের তথ্য")}</h2>
        {role.manage ? (
          <form
            className="o-form o-form-grid"
            onSubmit={e => {
              e.preventDefault();
              void call({ action: "update", projectId: pid, ...form(e) }, t("Saved.", "সংরক্ষিত।"));
            }}
          >
            <Field label={t("Title *", "নাম *")}>
              <input name="title" required maxLength={120} defaultValue={project.title} />
            </Field>
            <Field label={t("Client name", "ক্লায়েন্টের নাম")}>
              <input name="clientName" maxLength={120} defaultValue={project.clientName} />
            </Field>
            <Field label={t("Type", "ধরন")}>
              <select name="projectType" defaultValue={project.projectType}>
                {projectTypes.map(s => (
                  <option key={s} value={s}>
                    {projectTypeLabel(s, bn)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Status", "অবস্থা")}>
              <select name="status" defaultValue={project.status}>
                {projectStatuses.map(s => (
                  <option key={s} value={s}>
                    {projectStatusLabel(s, bn)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("Start date", "শুরুর তারিখ")}>
              <input name="startDate" type="date" defaultValue={project.startDate ?? ""} />
            </Field>
            <Field label={t("Target date", "লক্ষ্য তারিখ")}>
              <input name="targetDate" type="date" defaultValue={project.targetDate ?? ""} />
            </Field>
            <Field
              label={t("Summary (the client sees this)", "সারসংক্ষেপ (ক্লায়েন্ট দেখবেন)")}
              wide
            >
              <textarea name="summary" rows={3} maxLength={2000} defaultValue={project.summary} />
            </Field>
            <div className="o-step-actions wide">
              {project.leadId && (
                <Link href="/admin/leads">{t("From an inquiry", "একটি ইনকোয়ারি থেকে")}</Link>
              )}
              <button className="o-button" disabled={busy}>
                {t("Save details", "তথ্য সংরক্ষণ")}
              </button>
            </div>
          </form>
        ) : (
          <p>
            {project.title} · {projectStatusLabel(project.status, bn)}
          </p>
        )}
      </section>

      <section className="o-admin-card">
        <h2>{t("Client access", "ক্লায়েন্টের প্রবেশাধিকার")}</h2>
        <ul className="o-row-list">
          {members.map(m => (
            <li key={m.id}>
              <div>
                <b>{m.email}</b>
                <small>
                  {m.acceptedAt
                    ? t("Joined", "যোগ দিয়েছেন")
                    : t("Invited, not joined yet", "আমন্ত্রিত, এখনো যোগ দেননি")}
                </small>
              </div>
              {role.manage && (
                <button
                  type="button"
                  className="o-icon-button"
                  aria-label={t(`Remove ${m.email}`, `${m.email} সরান`)}
                  onClick={() => {
                    if (
                      window.confirm(
                        t(
                          `Remove ${m.email} from this project?`,
                          `${m.email}-কে এই প্রজেক্ট থেকে সরাবেন?`,
                        ),
                      )
                    )
                      void call(
                        { action: "member-remove", projectId: pid, id: m.id },
                        t("Removed.", "সরানো হয়েছে।"),
                      );
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {!members.length && (
          <p className="o-muted">
            {t("No client has access yet.", "এখনো কোনো ক্লায়েন্টের প্রবেশাধিকার নেই।")}
          </p>
        )}
        {role.manage && (
          <form
            className="o-inline-form"
            onSubmit={e => {
              e.preventDefault();
              const el = e.currentTarget;
              void call(
                { action: "invite", projectId: pid, email: form(e).email },
                t("Invitation sent.", "আমন্ত্রণ পাঠানো হয়েছে।"),
              ).then(r => r && el.reset());
            }}
          >
            <Field label={t("Invite a client by email", "ইমেইলে ক্লায়েন্টকে আমন্ত্রণ")}>
              <input name="email" type="email" required maxLength={200} />
            </Field>
            <button className="o-button" disabled={busy}>
              {t("Send invitation", "আমন্ত্রণ পাঠান")}
            </button>
          </form>
        )}
      </section>

      <section className="o-admin-card">
        <h2>{t("Milestones", "মাইলস্টোন")}</h2>
        {milestones.map((m, i) => (
          <form
            key={m.id}
            className="o-form o-milestone-row"
            onSubmit={e => {
              e.preventDefault();
              void call(
                { action: "milestone", projectId: pid, id: m.id, displayOrder: i, ...form(e) },
                t("Saved.", "সংরক্ষিত।"),
              );
            }}
          >
            <input
              name="title"
              required
              maxLength={160}
              defaultValue={m.title}
              aria-label={t("Milestone title", "মাইলস্টোনের নাম")}
              disabled={!role.manage}
            />
            <select
              name="status"
              defaultValue={m.status}
              aria-label={t("Status", "অবস্থা")}
              disabled={!role.manage}
            >
              {milestoneStatuses.map(s => (
                <option key={s} value={s}>
                  {milestoneStatusLabel(s, bn)}
                </option>
              ))}
            </select>
            <input
              name="dueDate"
              type="date"
              defaultValue={m.dueDate ?? ""}
              aria-label={t("Due date", "শেষ তারিখ")}
              disabled={!role.manage}
            />
            {role.manage && (
              <>
                <button className="o-button secondary" disabled={busy}>
                  {t("Save", "সংরক্ষণ")}
                </button>
                <button
                  type="button"
                  className="o-icon-button"
                  aria-label={t(`Delete ${m.title}`, `${m.title} মুছুন`)}
                  onClick={() => {
                    if (
                      window.confirm(
                        t(`Delete the milestone “${m.title}”?`, `“${m.title}” মাইলস্টোনটি মুছবেন?`),
                      )
                    )
                      void call(
                        { action: "milestone-delete", projectId: pid, id: m.id },
                        t("Deleted.", "মুছে ফেলা হয়েছে।"),
                      );
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </>
            )}
            <textarea
              name="description"
              rows={2}
              maxLength={2000}
              defaultValue={m.description}
              aria-label={t("Description", "বিবরণ")}
              disabled={!role.manage}
            />
          </form>
        ))}
        {role.manage && (
          <form
            className="o-form o-milestone-row"
            onSubmit={e => {
              e.preventDefault();
              const el = e.currentTarget;
              void call(
                {
                  action: "milestone",
                  projectId: pid,
                  displayOrder: milestones.length,
                  ...form(e),
                },
                t("Milestone added.", "মাইলস্টোন যোগ হয়েছে।"),
              ).then(r => r && el.reset());
            }}
          >
            <input
              name="title"
              required
              maxLength={160}
              placeholder={t("New milestone", "নতুন মাইলস্টোন")}
              aria-label={t("New milestone title", "নতুন মাইলস্টোনের নাম")}
            />
            <select name="status" defaultValue="todo" aria-label={t("Status", "অবস্থা")}>
              {milestoneStatuses.map(s => (
                <option key={s} value={s}>
                  {milestoneStatusLabel(s, bn)}
                </option>
              ))}
            </select>
            <input name="dueDate" type="date" aria-label={t("Due date", "শেষ তারিখ")} />
            <button className="o-button" disabled={busy}>
              {t("Add", "যোগ করুন")} <Plus size={15} aria-hidden="true" />
            </button>
          </form>
        )}
      </section>

      <section className="o-admin-card">
        <h2>{t("Files", "ফাইল")}</h2>
        <ul className="o-row-list">
          {files.map(f => (
            <li key={f.id}>
              <div>
                <b>{f.name}</b>
                <small>
                  {Math.max(1, Math.round(f.size / 1024))} KB · {f.uploadedBy ?? ""} ·{" "}
                  {f.visibility === "staff"
                    ? t("Staff only", "শুধু স্টাফ")
                    : t("Shared with client", "ক্লায়েন্টের সাথে শেয়ার")}
                </small>
              </div>
              <span className="o-row-actions">
                <a
                  className="o-icon-button"
                  href={`/api/workspace/files/${f.id}`}
                  download
                  aria-label={t(`Download ${f.name}`, `${f.name} ডাউনলোড`)}
                >
                  <Download size={16} aria-hidden="true" />
                </a>
                {role.manage && (
                  <button
                    type="button"
                    className="o-icon-button"
                    aria-label={t(`Delete ${f.name}`, `${f.name} মুছুন`)}
                    onClick={() => {
                      if (window.confirm(t(`Delete “${f.name}”?`, `“${f.name}” মুছবেন?`)))
                        void call(
                          { action: "file-delete", projectId: pid, id: f.id },
                          t("Deleted.", "মুছে ফেলা হয়েছে।"),
                        );
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {!files.length && <p className="o-muted">{t("No files yet.", "এখনো কোনো ফাইল নেই।")}</p>}
        {role.manage &&
          (uploads ? (
            <form className="o-upload" onSubmit={uploadStaff}>
              <label>
                {t(
                  "Upload (PDF, PNG, JPG, WEBP, ZIP · 4 MB)",
                  "আপলোড (PDF, PNG, JPG, WEBP, ZIP · ৪ MB)",
                )}
                <input name="file" type="file" required />
              </label>
              <label>
                {t("Who can see it", "কে দেখতে পারবে")}
                <select name="visibility" defaultValue="shared">
                  <option value="shared">
                    {t("Shared with client", "ক্লায়েন্টের সাথে শেয়ার")}
                  </option>
                  <option value="staff">{t("Staff only", "শুধু স্টাফ")}</option>
                </select>
              </label>
              <button className="o-button" disabled={busy}>
                {t("Upload", "আপলোড")} <Upload size={15} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <p className="o-muted">
              {t(
                "File storage is not configured in this environment.",
                "এই পরিবেশে ফাইল স্টোরেজ সেট করা নেই।",
              )}
            </p>
          ))}
      </section>

      <section className="o-admin-card">
        <h2>{t("Approvals", "অনুমোদন")}</h2>
        <ul className="o-row-list">
          {approvals.map(a => (
            <li key={a.id}>
              <div>
                <b>{a.title}</b>
                <small>
                  {approvalStatusLabel(a.status, bn)}
                  {a.clientComment ? ` · “${a.clientComment}”` : ""}
                </small>
              </div>
            </li>
          ))}
        </ul>
        {!approvals.length && (
          <p className="o-muted">
            {t("No approval requests yet.", "এখনো কোনো অনুমোদনের অনুরোধ নেই।")}
          </p>
        )}
        {role.manage && (
          <form
            className="o-form o-form-grid"
            onSubmit={e => {
              e.preventDefault();
              const el = e.currentTarget;
              void call(
                { action: "approval", projectId: pid, ...form(e) },
                t(
                  "Approval requested; the client is emailed.",
                  "অনুমোদন চাওয়া হয়েছে; ক্লায়েন্টকে ইমেইল করা হয়েছে।",
                ),
              ).then(r => r && el.reset());
            }}
          >
            <Field label={t("What should the client approve? *", "ক্লায়েন্ট কী অনুমোদন করবেন? *")}>
              <input name="title" required maxLength={160} />
            </Field>
            <Field
              label={t("Attach a shared file (optional)", "শেয়ার করা ফাইল যুক্ত করুন (ঐচ্ছিক)")}
            >
              <select name="fileId" defaultValue="">
                <option value="">{t("No file", "ফাইল নেই")}</option>
                {files
                  .filter(f => f.visibility === "shared")
                  .map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={t("Details", "বিস্তারিত")} wide>
              <textarea name="description" rows={2} maxLength={2000} />
            </Field>
            <button className="o-button wide" disabled={busy}>
              {t("Request approval", "অনুমোদন চান")}
            </button>
          </form>
        )}
      </section>

      <section className="o-admin-card">
        <h2>{t("Invoices", "ইনভয়েস")}</h2>
        <p className="o-muted">
          {t(
            "Requests for payment, paid manually (bKash, Nagad or bank). Not tax invoices.",
            "পেমেন্টের অনুরোধ, হাতে পরিশোধ (বিকাশ, নগদ বা ব্যাংক)। ট্যাক্স ইনভয়েস নয়।",
          )}
        </p>
        {invoices.map(i => (
          <article key={i.id} className="o-invoice">
            <div className="o-section-line">
              <h3>
                {i.number} · {formatPrice(i.total, locale)}
              </h3>
              <span className="o-status">{invoiceStatusLabel(i.status, bn)}</span>
            </div>
            <small className="o-muted">
              {i.lines.map(l => `${l.description} × ${l.quantity}`).join(" · ")}
              {i.paymentReference
                ? ` · ${t("Reference", "রেফারেন্স")}: ${i.paymentMethod} ${i.paymentReference}`
                : ""}
              {i.voidReason ? ` · ${i.voidReason}` : ""}
            </small>
            {role.invoices && (
              <div className="o-row-actions">
                {i.status === "draft" && (
                  <button
                    type="button"
                    className="o-button"
                    disabled={busy}
                    onClick={() => void invoiceAct(i.id, "issue")}
                  >
                    {t("Issue to client", "ক্লায়েন্টকে পাঠান")}
                  </button>
                )}
                {i.status === "payment_submitted" && (
                  <>
                    <button
                      type="button"
                      className="o-button"
                      disabled={busy}
                      onClick={() => void invoiceAct(i.id, "confirm")}
                    >
                      {t("Confirm payment", "পেমেন্ট নিশ্চিত করুন")}
                    </button>
                    <button
                      type="button"
                      className="o-button secondary"
                      disabled={busy}
                      onClick={() => void invoiceAct(i.id, "reject")}
                    >
                      {t("Reference not found", "রেফারেন্স পাওয়া যায়নি")}
                    </button>
                  </>
                )}
                {["draft", "issued", "payment_submitted"].includes(i.status) && (
                  <button
                    type="button"
                    className="o-button secondary"
                    disabled={busy}
                    onClick={() => {
                      const reason = window.prompt(
                        t("Why is this invoice cancelled?", "ইনভয়েসটি কেন বাতিল?"),
                      );
                      if (reason) void invoiceAct(i.id, "void", reason);
                    }}
                  >
                    {t("Cancel invoice", "ইনভয়েস বাতিল")}
                  </button>
                )}
              </div>
            )}
          </article>
        ))}
        {!invoices.length && (
          <p className="o-muted">{t("No invoices yet.", "এখনো কোনো ইনভয়েস নেই।")}</p>
        )}
        {role.invoices && (
          <form
            className="o-form o-invoice-form"
            onSubmit={e => {
              e.preventDefault();
              const f = form(e);
              void call(
                { action: "invoice", projectId: pid, dueDate: f.dueDate, note: f.note, lines },
                t(
                  "Draft invoice created. Check it, then issue it to the client.",
                  "খসড়া ইনভয়েস তৈরি হয়েছে। দেখে নিয়ে ক্লায়েন্টকে পাঠান।",
                ),
              ).then(r => r && setLines([{ description: "", quantity: 1, unitPrice: 0 }]));
            }}
          >
            <h3>{t("New invoice", "নতুন ইনভয়েস")}</h3>
            {lines.map((l, i) => (
              <div className="o-invoice-line" key={i}>
                <input
                  required
                  maxLength={300}
                  placeholder={t("Description", "বিবরণ")}
                  aria-label={t(`Line ${i + 1} description`, `লাইন ${i + 1} বিবরণ`)}
                  value={l.description}
                  onChange={e =>
                    setLines(x =>
                      x.map((y, j) => (j === i ? { ...y, description: e.target.value } : y)),
                    )
                  }
                />
                <input
                  type="number"
                  min={1}
                  max={10000}
                  required
                  aria-label={t(`Line ${i + 1} quantity`, `লাইন ${i + 1} পরিমাণ`)}
                  value={l.quantity}
                  onChange={e =>
                    setLines(x =>
                      x.map((y, j) => (j === i ? { ...y, quantity: Number(e.target.value) } : y)),
                    )
                  }
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  required
                  aria-label={t(`Line ${i + 1} unit price (৳)`, `লাইন ${i + 1} একক দাম (৳)`)}
                  value={l.unitPrice}
                  onChange={e =>
                    setLines(x =>
                      x.map((y, j) => (j === i ? { ...y, unitPrice: Number(e.target.value) } : y)),
                    )
                  }
                />
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="o-icon-button"
                    aria-label={t(`Remove line ${i + 1}`, `লাইন ${i + 1} সরান`)}
                    onClick={() => setLines(x => x.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="o-underlined"
              onClick={() => setLines(x => [...x, { description: "", quantity: 1, unitPrice: 0 }])}
            >
              + {t("Add a line", "লাইন যোগ করুন")}
            </button>
            <div className="o-form-grid">
              <Field label={t("Due date", "শেষ তারিখ")}>
                <input name="dueDate" type="date" />
              </Field>
              <Field label={t("Note for the client", "ক্লায়েন্টের জন্য নোট")}>
                <input name="note" maxLength={1000} />
              </Field>
            </div>
            <p>
              {t("Total", "মোট")}:{" "}
              <b>
                {formatPrice(
                  lines.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0),
                  locale,
                )}
              </b>{" "}
              <small className="o-muted">
                {t("(calculated again on the server)", "(সার্ভারে আবার হিসাব হবে)")}
              </small>
            </p>
            <button className="o-button" disabled={busy}>
              {t("Create draft invoice", "খসড়া ইনভয়েস তৈরি করুন")}
            </button>
          </form>
        )}
      </section>

      {activity.length > 0 && (
        <section className="o-admin-card">
          <h2>{t("Project activity", "প্রজেক্টের কার্যক্রম")}</h2>
          <ul className="o-row-list">
            {activity.map((a, i) => (
              <li key={i}>
                <div>
                  <b>{a.action.replace(/^project\./, "")}</b>
                  <small>
                    {a.actor ?? "—"} ·{" "}
                    {new Date(a.createdAt).toLocaleString(bn ? "bn-BD" : "en-GB", {
                      timeZone: "Asia/Dhaka",
                    })}{" "}
                    · {a.reason.replace(/^[0-9a-f-]{36}\s?/, "")}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );

  function invoiceAct(id: string, step: "issue" | "confirm" | "reject" | "void", reason?: string) {
    return call(
      { action: "invoice-action", id, step, ...(reason ? { reason } : {}) },
      step === "issue"
        ? t(
            "Invoice issued; the client is emailed.",
            "ইনভয়েস পাঠানো হয়েছে; ক্লায়েন্টকে ইমেইল করা হয়েছে।",
          )
        : step === "confirm"
          ? t(
              "Payment confirmed; the client is emailed.",
              "পেমেন্ট নিশ্চিত; ক্লায়েন্টকে ইমেইল করা হয়েছে।",
            )
          : t("Done.", "সম্পন্ন।"),
    );
  }
}
