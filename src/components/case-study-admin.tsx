"use client";

// Admin → Case studies: write, publish and remove Studio case studies (content.manage). Public only when
// published; the client's name appears only when "The client agreed" is ticked.

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "./locale";
import { resizePhoto } from "@/lib/photo-resize";

type Row = {
  id: string;
  slug: string;
  status: "draft" | "published" | "hidden";
  titleEn: string;
  titleBn: string;
  summaryEn: string;
  summaryBn: string;
  problemEn: string;
  problemBn: string;
  approachEn: string;
  approachBn: string;
  outcomeEn: string;
  outcomeBn: string;
  clientName: string;
  clientConsent: boolean;
  tags: string[];
  technologies: string[];
  externalUrl: string;
  imageAlt: string;
  displayOrder: number;
  hasImage: boolean;
};

export function CaseStudyAdmin({ initial }: { initial: Row[] }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [image, setImage] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const current = editing && editing !== "new" ? editing : null;

  async function send(body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/case-studies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as {
      caseStudies?: Row[];
      error?: string;
      field?: string;
    };
    setBusy(false);
    if (res?.ok && data.caseStudies) {
      setRows(data.caseStudies);
      setNote({ ok: true, text: ok });
      return true;
    }
    setNote({
      ok: false,
      text:
        data.error === "SLUG_TAKEN"
          ? t("That web address is already used.", "এই ওয়েব ঠিকানা আগেই ব্যবহৃত।")
          : data.field
            ? t(`Please check: ${data.field}`, `এই ঘরটি দেখুন: ${data.field}`)
            : t("Couldn't save. Please try again.", "সংরক্ষণ হয়নি। আবার চেষ্টা করুন।"),
    });
    return false;
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const ok = await send(
      {
        ...f,
        ...(current ? { id: current.id } : {}),
        clientConsent: f.clientConsent === "on",
        displayOrder: Number(f.displayOrder || 0),
        ...(image !== undefined ? { image } : {}),
      },
      t("Saved.", "সংরক্ষিত।"),
    );
    if (ok) {
      setEditing(null);
      setImage(undefined);
    }
  }

  const field = (
    name: keyof Row,
    en: string,
    b: string,
    opts: { long?: boolean; required?: boolean; max?: number } = {},
  ) => (
    <label className={opts.long ? "wide" : undefined}>
      {t(en, b)}
      {opts.long ? (
        <textarea
          name={name}
          rows={3}
          maxLength={opts.max ?? 2000}
          defaultValue={String(current?.[name] ?? "")}
          required={opts.required}
        />
      ) : (
        <input
          name={name}
          maxLength={opts.max ?? 120}
          defaultValue={String(current?.[name] ?? "")}
          required={opts.required}
        />
      )}
    </label>
  );

  return (
    <div className="o-panel">
      {note && (
        <p className={note.ok ? "o-alert o-alert-ok" : "checkout-error"} role="status">
          {note.text}
        </p>
      )}
      {!editing && (
        <button type="button" className="o-button" onClick={() => setEditing("new")}>
          {t("New case study", "নতুন কেস স্টাডি")} <Plus size={16} aria-hidden="true" />
        </button>
      )}
      {editing && (
        <form
          className="o-form o-form-grid o-admin-card"
          onSubmit={save}
          key={current?.id ?? "new"}
        >
          {field("titleEn", "Title (English) *", "শিরোনাম (ইংরেজি) *", { required: true })}
          {field("titleBn", "Title (Bangla)", "শিরোনাম (বাংলা)")}
          <label>
            {t("Web address (slug) *", "ওয়েব ঠিকানা (slug) *")}
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={60}
              defaultValue={current?.slug}
            />
          </label>
          <label>
            {t("Status", "অবস্থা")}
            <select name="status" defaultValue={current?.status ?? "draft"}>
              <option value="draft">{t("Draft (not public)", "খসড়া (প্রকাশিত নয়)")}</option>
              <option value="published">{t("Published", "প্রকাশিত")}</option>
              <option value="hidden">{t("Hidden", "লুকানো")}</option>
            </select>
          </label>
          {field("summaryEn", "Summary (English)", "সারসংক্ষেপ (ইংরেজি)", { long: true, max: 400 })}
          {field("summaryBn", "Summary (Bangla)", "সারসংক্ষেপ (বাংলা)", { long: true, max: 400 })}
          {field("problemEn", "The problem (English)", "সমস্যা (ইংরেজি)", { long: true })}
          {field("problemBn", "The problem (Bangla)", "সমস্যা (বাংলা)", { long: true })}
          {field("approachEn", "Our approach (English)", "আমাদের পদ্ধতি (ইংরেজি)", { long: true })}
          {field("approachBn", "Our approach (Bangla)", "আমাদের পদ্ধতি (বাংলা)", { long: true })}
          {field(
            "outcomeEn",
            "Outcome (English, verified facts only)",
            "ফলাফল (ইংরেজি, শুধু যাচাই করা তথ্য)",
            { long: true },
          )}
          {field("outcomeBn", "Outcome (Bangla)", "ফলাফল (বাংলা)", { long: true })}
          {field("clientName", "Client name", "ক্লায়েন্টের নাম")}
          <label className="o-check">
            <input type="checkbox" name="clientConsent" defaultChecked={current?.clientConsent} />
            {t("The client agreed to be named publicly", "ক্লায়েন্ট প্রকাশ্যে নাম দিতে সম্মত")}
          </label>
          <label>
            {t("Tags (comma separated)", "ট্যাগ (কমা দিয়ে)")}
            <input name="tags" maxLength={300} defaultValue={current?.tags.join(", ")} />
          </label>
          <label>
            {t("Technologies (comma separated)", "প্রযুক্তি (কমা দিয়ে)")}
            <input
              name="technologies"
              maxLength={300}
              defaultValue={current?.technologies.join(", ")}
            />
          </label>
          <label>
            {t("Live project link (https, optional)", "লাইভ প্রজেক্ট লিংক (https, ঐচ্ছিক)")}
            <input
              name="externalUrl"
              type="url"
              maxLength={300}
              defaultValue={current?.externalUrl}
            />
          </label>
          <label>
            {t("Order on the page", "পেজে ক্রম")}
            <input
              name="displayOrder"
              type="number"
              min={0}
              max={10000}
              defaultValue={current?.displayOrder ?? 0}
            />
          </label>
          <label>
            {t("Photo (JPG, PNG or WEBP)", "ছবি (JPG, PNG বা WEBP)")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async e => {
                const file = e.currentTarget.files?.[0];
                if (file) setImage(await resizePhoto(file, 1600).catch(() => undefined));
              }}
            />
            {current?.hasImage && image === undefined && (
              <button type="button" className="o-underlined" onClick={() => setImage(null)}>
                {t("Remove current photo", "বর্তমান ছবি সরান")}
              </button>
            )}
          </label>
          {field("imageAlt", "Photo description (alt text)", "ছবির বর্ণনা (alt টেক্সট)", {
            max: 200,
          })}
          <div className="o-step-actions wide">
            <button
              type="button"
              className="o-button secondary"
              onClick={() => {
                setEditing(null);
                setImage(undefined);
              }}
            >
              {t("Cancel", "বাতিল")}
            </button>
            <button className="o-button" disabled={busy}>
              {busy ? t("Saving…", "সংরক্ষণ হচ্ছে…") : t("Save case study", "কেস স্টাডি সংরক্ষণ")}
            </button>
          </div>
        </form>
      )}
      <ul className="o-row-list">
        {rows.map(r => (
          <li key={r.id}>
            <div>
              <b>{bn && r.titleBn ? r.titleBn : r.titleEn}</b>
              <small>
                /{r.slug} ·{" "}
                {r.status === "published"
                  ? t("Published", "প্রকাশিত")
                  : r.status === "hidden"
                    ? t("Hidden", "লুকানো")
                    : t("Draft", "খসড়া")}
                {r.clientName
                  ? ` · ${r.clientName}${r.clientConsent ? "" : t(" (not shown)", " (দেখানো হয় না)")}`
                  : ""}
              </small>
            </div>
            <span className="o-row-actions">
              <button
                type="button"
                className="o-button secondary"
                onClick={() => {
                  setEditing(r);
                  setImage(undefined);
                }}
              >
                {t("Edit", "সম্পাদনা")}
              </button>
              <button
                type="button"
                className="o-icon-button"
                aria-label={t(`Delete ${r.titleEn}`, `${r.titleEn} মুছুন`)}
                onClick={() => {
                  if (
                    window.confirm(
                      t(
                        `Delete “${r.titleEn}”? This cannot be undone.`,
                        `“${r.titleEn}” মুছবেন? এটি ফেরানো যাবে না।`,
                      ),
                    )
                  )
                    void send({ action: "delete", id: r.id }, t("Deleted.", "মুছে ফেলা হয়েছে।"));
                }}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      {!rows.length && !editing && (
        <p className="o-muted">
          {t(
            "No case studies yet. Until one is published, the Studio page shows the company profile's portfolio note (projects shared privately).",
            "এখনো কোনো কেস স্টাডি নেই। প্রকাশ না হওয়া পর্যন্ত স্টুডিও পেজে কোম্পানি প্রোফাইলের পোর্টফোলিও নোট (প্রজেক্ট ব্যক্তিগতভাবে শেয়ার) দেখায়।",
          )}
        </p>
      )}
    </div>
  );
}
