"use client";

// Small building blocks shared by the admin screens: status labels and picker, category picker,
// photo picker, and useAdminCall for sending changes.

import { useState } from "react";
import { resizePhoto } from "@/lib/photo-resize";
import { productStatuses, type ProductStatus } from "@/lib/product-input";
import type { Option } from "@/lib/categories";
import { useLocale } from "./locale";

export const statusLabel: Record<ProductStatus, string> = {
  draft: "Draft (not visible)",
  published: "Published (visible)",
  hidden: "Hidden",
};
/** Bangla status names (statusLabel keeps the English ones for existing callers). */
export const statusLabelBn: Record<ProductStatus, string> = {
  draft: "খসড়া (দেখা যায় না)",
  published: "প্রকাশিত (দেখা যায়)",
  hidden: "লুকানো",
};
const errorText: Record<string, string> = {
  HAS_VARIANTS:
    "This product counts stock per colour/size. Edit the product to change those numbers.",
  COLOR_NOT_FOUND: "Save the product with this colour first, then add its photo.",
  SLUG_TAKEN:
    "That web address is already used (archived items keep theirs). Choose a different one.",
  NOT_FOUND: "This item no longer exists. Refresh the page.",
  CATALOG_NOT_EMPTY: "Demo items can only be imported while the list is empty.",
  COLLECTION_NOT_FOUND: "That section no longer exists. Refresh the page.",
  COLLECTION_NOT_EMPTY: "Move or archive the products in this section first.",
  BUILT_IN: "Built-in sections can be hidden but not archived, and their web address can't change.",
  FORBIDDEN: "Your session expired or you don't have permission. Sign in again.",
  NOT_PENDING: "This order was already reviewed. Refresh the page.",
  REASON_REQUIRED: "Write a short reason (at least 3 letters).",
  REFUND_TOO_HIGH: "A refund can't be more than the money received for this order.",
  OWNER_ONLY: "Only the owner can do this.",
  EMAIL_FAILED:
    "The test email could not be sent. Check SMTP_URL and AUTH_EMAIL_FROM in .env.local, then restart the server.",
  NOT_ALLOWED: "Your role doesn't allow this. Ask the owner for the right permission.",
  NO_EMAIL: "This customer left no email address. Reply by phone or WhatsApp instead.",
  REPLY_NOT_SENT:
    "The email could not be sent, so nothing was saved. Try again in a minute; if it keeps failing, check the mail settings (SMTP_URL, AUTH_EMAIL_FROM) on Vercel.",
  NOT_DRAFT: "Only drafts can be edited with your role. Ask someone to hide or unpublish it first.",
  COURIER_REQUIRED: "Choose or type the courier name.",
  INVALID_STEP:
    "That delivery step is no longer possible (someone may have updated it). Refresh the page.",
};
// The same messages in Bangla, shown when the admin is used in Bangla (/bn/admin).
const errorTextBn: Record<string, string> = {
  HAS_VARIANTS: "এই পণ্যের স্টক রং/সাইজ অনুযায়ী গোনা হয়। সংখ্যা বদলাতে পণ্যটি এডিট করুন।",
  COLOR_NOT_FOUND: "আগে এই রংসহ পণ্যটি সংরক্ষণ করুন, তারপর ছবি দিন।",
  SLUG_TAKEN:
    "এই ওয়েব ঠিকানা আগেই ব্যবহৃত (আর্কাইভ করা আইটেমও নিজের ঠিকানা রাখে)। অন্য একটি বেছে নিন।",
  NOT_FOUND: "এই আইটেমটি আর নেই। পেজটি রিফ্রেশ করুন।",
  CATALOG_NOT_EMPTY: "তালিকা খালি থাকলেই শুধু ডেমো আইটেম আনা যায়।",
  COLLECTION_NOT_FOUND: "এই সেকশনটি আর নেই। পেজটি রিফ্রেশ করুন।",
  COLLECTION_NOT_EMPTY: "আগে এই সেকশনের পণ্যগুলো সরান বা আর্কাইভ করুন।",
  BUILT_IN: "বিল্ট-ইন সেকশন লুকানো যায়, আর্কাইভ করা যায় না, আর এর ওয়েব ঠিকানা বদলায় না।",
  FORBIDDEN: "সেশন শেষ হয়েছে বা অনুমতি নেই। আবার সাইন ইন করুন।",
  NOT_PENDING: "এই অর্ডারটি আগেই দেখা হয়েছে। পেজটি রিফ্রেশ করুন।",
  REASON_REQUIRED: "একটি ছোট কারণ লিখুন (কমপক্ষে ৩ অক্ষর)।",
  REFUND_TOO_HIGH: "এই অর্ডারে পাওয়া টাকার চেয়ে বেশি রিফান্ড দেওয়া যায় না।",
  OWNER_ONLY: "শুধু মালিক এটি করতে পারেন।",
  EMAIL_FAILED:
    "টেস্ট ইমেইল পাঠানো যায়নি। .env.local-এ SMTP_URL ও AUTH_EMAIL_FROM দেখে সার্ভার আবার চালু করুন।",
  NOT_ALLOWED: "আপনার রোলে এটি করা যায় না। মালিকের কাছে সঠিক অনুমতি চান।",
  NO_EMAIL: "এই গ্রাহক কোনো ইমেইল দেননি। ফোন বা হোয়াটসঅ্যাপে উত্তর দিন।",
  REPLY_NOT_SENT:
    "ইমেইল পাঠানো যায়নি, তাই কিছু সংরক্ষণ হয়নি। এক মিনিট পর আবার চেষ্টা করুন; বারবার ব্যর্থ হলে Vercel-এ মেইল সেটিংস (SMTP_URL, AUTH_EMAIL_FROM) দেখুন।",
  NOT_DRAFT: "আপনার রোলে শুধু খসড়া এডিট করা যায়। আগে কাউকে দিয়ে লুকান বা অপ্রকাশিত করান।",
  COURIER_REQUIRED: "কুরিয়ারের নাম বেছে নিন বা লিখুন।",
  INVALID_STEP: "এই ডেলিভারি ধাপ আর সম্ভব নয় (কেউ হয়তো আপডেট করেছেন)। পেজটি রিফ্রেশ করুন।",
};
/** POST/PATCH/DELETE to an admin endpoint with shared busy state and readable error messages. */
export function useAdminCall<T>(
  endpoint: string,
  labels: Record<string, string>,
  onData: (data: T) => void,
) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const bn = useLocale().locale === "bn";
  async function call(
    method: "POST" | "PATCH" | "PUT" | "DELETE",
    body: Record<string, unknown>,
    success: string,
  ) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json().catch(() => ({}))) as T & {
        error?: string;
        field?: string;
      };
      if (!response.ok || result.error) {
        setNotice(
          result.field
            ? bn
              ? `“${labels[result.field] ?? result.field}” ঘরটি দেখুন: খালি, বেশি লম্বা বা সঠিক নয়।`
              : `Check “${labels[result.field] ?? result.field}”: it is missing, too long or not valid.`
            : ((bn ? errorTextBn : errorText)[result.error ?? ""] ??
                (bn
                  ? "সংরক্ষণ হয়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।"
                  : "Could not save. Check your connection and try again.")),
        );
        return false;
      }
      onData(result);
      setNotice(success);
      return true;
    } catch {
      setNotice(
        bn
          ? "সার্ভারে পৌঁছানো যায়নি। আবার চেষ্টা করুন।"
          : "Could not reach the server. Try again.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, setBusy, notice, setNotice, call };
}
/** allowed: statuses this person may switch TO (the current one always stays visible). */
export function StatusSelect({
  value,
  onChange,
  disabled,
  id,
  label,
  allowed,
}: {
  value: ProductStatus;
  onChange: (s: ProductStatus) => void;
  disabled?: boolean;
  id?: string;
  label?: string;
  allowed?: ProductStatus[];
}) {
  const bn = useLocale().locale === "bn";
  return (
    <label>
      {label ?? (bn ? "অবস্থা" : "Status")}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value as ProductStatus)}
      >
        {productStatuses
          .filter(s => s === value || !allowed || allowed.includes(s))
          .map(s => (
            <option key={s} value={s}>
              {(bn ? statusLabelBn : statusLabel)[s]}
            </option>
          ))}
      </select>
    </label>
  );
}
/** Category dropdown from a fixed list, with "Other…" for a custom label. Sets English and Bangla together. */
export function CategoryPicker({
  options,
  en,
  bn,
  disabled,
  onChange,
}: {
  options: Option[];
  en: string;
  bn: string;
  disabled?: boolean;
  onChange: (en: string, bn: string) => void;
}) {
  const known = options.some(o => o.en === en);
  const [other, setOther] = useState(Boolean(en) && !known);
  return (
    <div className="category-picker">
      <label>
        Category
        <select
          value={other ? "__other" : en}
          disabled={disabled}
          onChange={e => {
            if (e.target.value === "__other") {
              setOther(true);
              onChange("", "");
              return;
            }
            setOther(false);
            const hit = options.find(o => o.en === e.target.value);
            onChange(hit?.en ?? "", hit?.bn ?? "");
          }}
        >
          <option value="">Choose a category…</option>
          {options.map(o => (
            <option key={o.en} value={o.en}>
              {o.en} · {o.bn}
            </option>
          ))}
          <option value="__other">Other…</option>
        </select>
      </label>
      {other && (
        <div className="product-form-row">
          <label>
            Custom category
            <input
              value={en}
              maxLength={60}
              disabled={disabled}
              onChange={e => onChange(e.target.value, bn)}
            />
          </label>
          <label>
            ক্যাটাগরি (বাংলা)
            <input
              value={bn}
              maxLength={60}
              disabled={disabled}
              onChange={e => onChange(en, e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
/** Photo chooser: resizes in the browser; value undefined = keep current, null = remove. */
export function PhotoPicker({
  value,
  hasCurrent,
  disabled,
  onChange,
  onError,
  legend = "Photo",
}: {
  value: string | null | undefined;
  hasCurrent: boolean;
  disabled?: boolean;
  onChange: (v: string | null | undefined) => void;
  onError: (m: string) => void;
  legend?: string;
}) {
  const [working, setWorking] = useState(false);
  return (
    <fieldset className="product-photo-field">
      <legend>{legend}</legend>
      {value ? (
        // Local data-URL preview before upload; next/image cannot optimize it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="New photo preview" />
      ) : (
        <p>
          {value === null
            ? "Photo will be removed when you save."
            : hasCurrent
              ? "Current photo will be kept."
              : "No photo yet. A default design is used."}
        </p>
      )}
      <label>
        Choose photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled || working}
          onChange={async e => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (!file) return;
            setWorking(true);
            try {
              onChange(await resizePhoto(file));
            } catch (error) {
              onError(error instanceof Error ? error.message : "Could not process this photo.");
            } finally {
              setWorking(false);
            }
          }}
        />
        <small>
          JPG, PNG or WebP · up to 5 MB · resized automatically. Only use photos you have the right
          to show.
        </small>
      </label>
      {(value || hasCurrent) && value !== null && (
        <button type="button" className="button" disabled={disabled} onClick={() => onChange(null)}>
          Remove photo
        </button>
      )}
    </fieldset>
  );
}
