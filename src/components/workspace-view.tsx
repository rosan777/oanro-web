"use client";

// One client project in the Workspace (approved design): overview with progress, milestones, files,
// approvals and invoices. Data comes from the server already filtered for the viewer; every action
// goes to the Workspace APIs, which check membership again.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Download, FileText, Upload } from "lucide-react";
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

export type WorkspaceData = {
  role: { staff: boolean; manage: boolean; invoices: boolean; client: boolean };
  project: {
    id: string;
    title: string;
    clientName: string;
    projectType: string;
    status: string;
    summary: string;
    startDate: string | null;
    targetDate: string | null;
  };
  milestones: {
    id: string;
    title: string;
    description: string;
    dueDate: string | null;
    status: string;
  }[];
  files: {
    id: string;
    name: string;
    mime: string;
    size: number;
    visibility: string;
    createdAt: string;
    uploadedBy: string | null;
  }[];
  approvals: {
    id: string;
    title: string;
    description: string;
    status: string;
    clientComment: string;
    fileId: string | null;
    createdAt: string;
  }[];
  invoices: {
    id: string;
    number: string;
    status: string;
    issueDate: string | null;
    dueDate: string | null;
    total: number;
    note: string;
    paymentMethod: string | null;
    paymentReference: string | null;
    voidReason?: string;
    lines: { id: string; description: string; quantity: number; unitPrice: number }[];
  }[];
};

const tabs = ["overview", "milestones", "files", "approvals", "invoices"] as const;
type Tab = (typeof tabs)[number];

const size = (n: number) =>
  n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

export function WorkspaceView({
  data,
  initialTab,
  payTo,
  uploads,
}: {
  data: WorkspaceData;
  initialTab: string;
  payTo: { bkash: string; nagad: string };
  uploads: boolean;
}) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    tabs.includes(initialTab as Tab) ? (initialTab as Tab) : "overview",
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { project, milestones, files, approvals, invoices } = data;
  const done = milestones.filter(m => m.status === "done").length;
  const progress = milestones.length ? Math.round((done / milestones.length) * 100) : 0;
  const current = milestones.find(m => m.status !== "done");
  const waiting = approvals.filter(a => a.status === "requested");
  const unpaid = invoices.filter(i => i.status === "issued");
  const errorText = (code?: string, field?: string) =>
    field === "comment"
      ? t("Please tell us what to change.", "কী পরিবর্তন চান লিখুন।")
      : field === "reference"
        ? t(
            "Enter the transaction reference (letters and numbers).",
            "ট্রানজেকশন রেফারেন্স দিন (অক্ষর ও সংখ্যা)।",
          )
        : field === "file"
          ? t(
              "Use a PDF, PNG, JPG, WEBP or ZIP file up to 4 MB.",
              "৪ MB পর্যন্ত PDF, PNG, JPG, WEBP বা ZIP ফাইল দিন।",
            )
          : code === "STORAGE_UNAVAILABLE"
            ? t("File uploads are not available right now.", "এই মুহূর্তে ফাইল আপলোড চালু নেই।")
            : code === "PROJECT_FULL"
              ? t(
                  "This project has reached its 100 MB file limit.",
                  "এই প্রজেক্টের ১০০ MB ফাইলের সীমা পূর্ণ।",
                )
              : code === "ALREADY_DECIDED"
                ? t("This request was already answered.", "এই অনুরোধের উত্তর আগেই দেওয়া হয়েছে।")
                : t(
                    "Something went wrong. Please try again.",
                    "কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।",
                  );

  async function send(url: string, init: RequestInit, ok: string) {
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch(url, init).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { error?: string; field?: string };
    setBusy(false);
    if (!res?.ok) {
      setError(errorText(body.error, body.field));
      return false;
    }
    setMessage(ok);
    router.refresh();
    return true;
  }
  const post = (url: string, body: unknown, ok: string) =>
    send(
      url,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
      ok,
    );

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError(errorText(undefined, "file"));
      return;
    }
    const body = new FormData();
    body.set("file", file);
    if (
      await send(
        `/api/workspace/projects/${project.id}/files`,
        { method: "POST", body },
        t("File uploaded.", "ফাইল আপলোড হয়েছে।"),
      )
    )
      form.reset();
  }

  const menu: [Tab, string, number?][] = [
    ["overview", t("Overview", "সারসংক্ষেপ")],
    ["milestones", t("Milestones", "মাইলস্টোন"), milestones.length],
    ["files", t("Files", "ফাইল"), files.length],
    ["approvals", t("Approvals", "অনুমোদন"), waiting.length],
    ["invoices", t("Invoices", "ইনভয়েস"), unpaid.length],
  ];
  return (
    <div className="o-workspace-grid">
      <aside className="o-workspace-side">
        <span className="o-avatar" aria-hidden="true">
          O.
        </span>
        <h2>{project.title}</h2>
        <p>
          {projectTypeLabel(project.projectType, bn)} · {projectStatusLabel(project.status, bn)}
        </p>
        <nav aria-label={t("Project sections", "প্রজেক্টের অংশ")}>
          {menu.map(([id, label, n]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
              {n ? <small>{n}</small> : <ArrowUpRight size={15} aria-hidden="true" />}
            </button>
          ))}
        </nav>
        {data.role.staff && (
          <Link className="o-underlined" href={`/admin/projects/${project.id}`}>
            {t("Manage in admin", "অ্যাডমিনে পরিচালনা")}
          </Link>
        )}
      </aside>
      <div className="o-workspace-main">
        <div role="status" aria-live="polite">
          {message && <p className="o-alert o-alert-ok">{message}</p>}
          {error && <p className="checkout-error">{error}</p>}
        </div>

        {tab === "overview" && (
          <>
            <div className="o-project-progress">
              <span className="o-eyebrow">
                {current
                  ? t(
                      `CURRENT STAGE / ${current.title.toUpperCase()}`,
                      `বর্তমান ধাপ / ${current.title}`,
                    )
                  : t("PROJECT STATUS", "প্রজেক্টের অবস্থা")}
              </span>
              <h2>
                {progress === 100
                  ? t("All milestones done.", "সব মাইলস্টোন সম্পন্ন।")
                  : t("Good progress. Clear next steps.", "ভালো অগ্রগতি। পরের ধাপ পরিষ্কার।")}
              </h2>
              <div
                className="o-progress-track"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t("Milestones done", "সম্পন্ন মাইলস্টোন")}
              >
                <i style={{ width: `${progress}%` }} />
              </div>
              <p>
                {t(
                  `${done} of ${milestones.length} milestones complete`,
                  `${milestones.length}টির মধ্যে ${done}টি মাইলস্টোন সম্পন্ন`,
                )}
                {project.targetDate ? ` · ${t("Target", "লক্ষ্য")} ${project.targetDate}` : ""}
              </p>
              {project.summary && <p className="o-muted">{project.summary}</p>}
            </div>
            <div className="o-workspace-bottom">
              <div className="o-panel">
                <h3>{t("Your project checklist", "আপনার প্রজেক্ট চেকলিস্ট")}</h3>
                {milestones.length ? (
                  <ul className="o-checklist">
                    {milestones.map(m => (
                      <li key={m.id} className={m.status === "done" ? "done" : ""}>
                        <span className="o-check-circle" aria-hidden="true">
                          {m.status === "done" && <Check size={13} />}
                        </span>
                        <span>
                          {m.title}
                          <small>
                            {milestoneStatusLabel(m.status, bn)}
                            {m.dueDate ? ` · ${m.dueDate}` : ""}
                          </small>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="o-muted">
                    {t(
                      "Milestones appear here once the plan is agreed.",
                      "পরিকল্পনা ঠিক হলে মাইলস্টোন এখানে দেখাবে।",
                    )}
                  </p>
                )}
              </div>
              <div className="o-panel">
                <h3>{t("Ready for your review", "আপনার রিভিউর জন্য প্রস্তুত")}</h3>
                {waiting.length || unpaid.length ? (
                  <>
                    {waiting.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        className="o-file"
                        onClick={() => setTab("approvals")}
                      >
                        <span aria-hidden="true">✓</span>
                        <div>
                          <b>{a.title}</b>
                          <small>{t("Approval requested", "অনুমোদন চাওয়া হয়েছে")}</small>
                        </div>
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </button>
                    ))}
                    {unpaid.map(i => (
                      <button
                        key={i.id}
                        type="button"
                        className="o-file"
                        onClick={() => setTab("invoices")}
                      >
                        <span aria-hidden="true">৳</span>
                        <div>
                          <b>{i.number}</b>
                          <small>
                            {formatPrice(i.total, locale)} · {invoiceStatusLabel(i.status, bn)}
                          </small>
                        </div>
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="o-muted">
                    {t(
                      "Nothing waiting for you right now.",
                      "এই মুহূর্তে আপনার জন্য কিছু অপেক্ষায় নেই।",
                    )}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "milestones" && (
          <div className="o-panel">
            <h2>{t("Milestones", "মাইলস্টোন")}</h2>
            {milestones.length ? (
              <ol className="o-milestones">
                {milestones.map(m => (
                  <li key={m.id} className={`is-${m.status}`}>
                    <b>{m.title}</b>
                    <span className="o-status">{milestoneStatusLabel(m.status, bn)}</span>
                    {m.dueDate && (
                      <small>
                        {t("Due", "শেষ তারিখ")} {m.dueDate}
                      </small>
                    )}
                    {m.description && <p>{m.description}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="o-muted">{t("No milestones yet.", "এখনো কোনো মাইলস্টোন নেই।")}</p>
            )}
          </div>
        )}

        {tab === "files" && (
          <div className="o-panel">
            <h2>{t("Files", "ফাইল")}</h2>
            {files.length ? (
              <ul className="o-row-list">
                {files.map(f => (
                  <li key={f.id}>
                    <div>
                      <b>
                        <FileText size={16} aria-hidden="true" /> {f.name}
                      </b>
                      <small>
                        {size(f.size)} ·{" "}
                        {new Date(f.createdAt).toLocaleDateString(bn ? "bn-BD" : "en-GB")}
                        {f.uploadedBy ? ` · ${f.uploadedBy}` : ""}
                        {f.visibility === "staff" ? ` · ${t("Staff only", "শুধু স্টাফ")}` : ""}
                      </small>
                    </div>
                    <a
                      className="o-button secondary"
                      href={`/api/workspace/files/${f.id}`}
                      download
                    >
                      {t("Download", "ডাউনলোড")} <Download size={15} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="o-muted">{t("No files yet.", "এখনো কোনো ফাইল নেই।")}</p>
            )}
            {(data.role.client || data.role.manage) &&
              (uploads ? (
                <form className="o-upload" onSubmit={upload}>
                  <label>
                    {t(
                      "Share a file with OANRO (PDF, PNG, JPG, WEBP or ZIP, up to 4 MB)",
                      "OANRO-কে ফাইল দিন (PDF, PNG, JPG, WEBP বা ZIP, ৪ MB পর্যন্ত)",
                    )}
                    <input
                      name="file"
                      type="file"
                      required
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,application/pdf,image/png,image/jpeg,image/webp,application/zip"
                    />
                  </label>
                  <button className="o-button" disabled={busy}>
                    {busy ? t("Uploading…", "আপলোড হচ্ছে…") : t("Upload", "আপলোড")}{" "}
                    <Upload size={16} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <p className="o-muted">
                  {t(
                    "File uploads are not available right now. Email files to us instead.",
                    "এই মুহূর্তে ফাইল আপলোড চালু নেই। ফাইল ইমেইলে পাঠান।",
                  )}
                </p>
              ))}
          </div>
        )}

        {tab === "approvals" && (
          <div className="o-panel">
            <h2>{t("Approvals", "অনুমোদন")}</h2>
            {approvals.length ? (
              approvals.map(a => (
                <article key={a.id} className="o-approval">
                  <div className="o-section-line">
                    <h3>{a.title}</h3>
                    <span className="o-status">{approvalStatusLabel(a.status, bn)}</span>
                  </div>
                  {a.description && <p>{a.description}</p>}
                  {a.fileId && (
                    <a className="o-underlined" href={`/api/workspace/files/${a.fileId}`} download>
                      {t("Download the file to review", "রিভিউর ফাইল ডাউনলোড করুন")}
                    </a>
                  )}
                  {a.clientComment && <blockquote>{a.clientComment}</blockquote>}
                  {a.status === "requested" && data.role.client && (
                    <form
                      className="o-form"
                      onSubmit={async e => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const decision = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                          "value",
                        );
                        await post(
                          `/api/workspace/approvals/${a.id}`,
                          { decision, comment: f.get("comment") },
                          decision === "approved"
                            ? t("Thank you, approved.", "ধন্যবাদ, অনুমোদিত।")
                            : t("Thanks, we will make the changes.", "ধন্যবাদ, আমরা পরিবর্তন করব।"),
                        );
                      }}
                    >
                      <label>
                        {t(
                          "Comment (needed when you ask for changes)",
                          "মন্তব্য (পরিবর্তন চাইলে লিখুন)",
                        )}
                        <textarea name="comment" rows={3} maxLength={2000} />
                      </label>
                      <div className="o-step-actions">
                        <button
                          className="o-button secondary"
                          name="decision"
                          value="changes_requested"
                          disabled={busy}
                        >
                          {t("Ask for changes", "পরিবর্তন চাই")}
                        </button>
                        <button
                          className="o-button"
                          name="decision"
                          value="approved"
                          disabled={busy}
                        >
                          {t("Approve", "অনুমোদন দিন")} <Check size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))
            ) : (
              <p className="o-muted">
                {t("No approval requests yet.", "এখনো কোনো অনুমোদনের অনুরোধ নেই।")}
              </p>
            )}
          </div>
        )}

        {tab === "invoices" && (
          <div className="o-panel">
            <h2>{t("Invoices", "ইনভয়েস")}</h2>
            {invoices.length ? (
              invoices.map(i => (
                <article key={i.id} className="o-invoice">
                  <div className="o-section-line">
                    <h3>{i.number}</h3>
                    <span className="o-status">{invoiceStatusLabel(i.status, bn)}</span>
                  </div>
                  <table>
                    <caption className="o-sr">
                      {t(`Invoice ${i.number}`, `ইনভয়েস ${i.number}`)}
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">{t("Description", "বিবরণ")}</th>
                        <th scope="col">{t("Qty", "পরিমাণ")}</th>
                        <th scope="col">{t("Price", "দাম")}</th>
                        <th scope="col">{t("Amount", "মোট")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {i.lines.map(l => (
                        <tr key={l.id}>
                          <td>{l.description}</td>
                          <td>{l.quantity}</td>
                          <td>{formatPrice(l.unitPrice, locale)}</td>
                          <td>{formatPrice(l.unitPrice * l.quantity, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={3}>
                          {t("Total", "মোট")}
                        </th>
                        <td>{formatPrice(i.total, locale)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <small className="o-muted">
                    {i.issueDate ? `${t("Issued", "ইস্যু")} ${i.issueDate}` : ""}
                    {i.dueDate ? ` · ${t("Due", "শেষ তারিখ")} ${i.dueDate}` : ""}
                    {" · "}
                    {t(
                      "A request for payment; not a tax invoice.",
                      "পেমেন্টের অনুরোধ; ট্যাক্স ইনভয়েস নয়।",
                    )}
                  </small>
                  {i.note && <p>{i.note}</p>}
                  {i.status === "payment_submitted" && (
                    <p className="o-muted">
                      {t(
                        `We are checking your payment reference ${i.paymentReference ?? ""}.`,
                        `আপনার পেমেন্ট রেফারেন্স ${i.paymentReference ?? ""} যাচাই করছি।`,
                      )}
                    </p>
                  )}
                  {i.status === "issued" && data.role.client && (
                    <form
                      className="o-form o-form-grid"
                      onSubmit={async e => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        await post(
                          `/api/workspace/invoices/${i.id}`,
                          { method: f.get("method"), reference: f.get("reference") },
                          t(
                            "Thanks. We will confirm your payment soon.",
                            "ধন্যবাদ। শিগগিরই পেমেন্ট নিশ্চিত করব।",
                          ),
                        );
                      }}
                    >
                      <p className="wide o-muted">
                        {[
                          payTo.bkash && `bKash ${payTo.bkash}`,
                          payTo.nagad && `Nagad ${payTo.nagad}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        {payTo.bkash || payTo.nagad ? " · " : ""}
                        {t(
                          "or bank transfer as agreed. Then enter the reference here.",
                          "অথবা নির্ধারিত ব্যাংক ট্রান্সফার। তারপর এখানে রেফারেন্স দিন।",
                        )}
                      </p>
                      <label>
                        {t("Paid with", "যেভাবে পরিশোধ")}
                        <select name="method" required defaultValue="">
                          <option value="" disabled>
                            {t("Choose…", "বেছে নিন…")}
                          </option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="bank">{t("Bank transfer", "ব্যাংক ট্রান্সফার")}</option>
                        </select>
                      </label>
                      <label>
                        {t("Transaction reference", "ট্রানজেকশন রেফারেন্স")}
                        <input
                          name="reference"
                          required
                          minLength={4}
                          maxLength={40}
                          pattern="[A-Za-z0-9-]{4,40}"
                          autoComplete="off"
                        />
                      </label>
                      <button className="o-button wide" disabled={busy}>
                        {t("Report payment", "পেমেন্ট জানান")}
                      </button>
                    </form>
                  )}
                </article>
              ))
            ) : (
              <p className="o-muted">{t("No invoices yet.", "এখনো কোনো ইনভয়েস নেই।")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
