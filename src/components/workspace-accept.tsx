"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "./locale";
import { localePath } from "@/lib/locale-path";

/** Accepts a Workspace invitation for the signed-in account. */
export function AcceptInvite({ token, email }: { token: string; email: string }) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const messages: Record<string, string> = {
    WRONG_ACCOUNT: bn
      ? `এই আমন্ত্রণ অন্য ইমেইলের জন্য। আপনি ${email} দিয়ে সাইন ইন করেছেন।`
      : `This invitation is for a different email. You are signed in as ${email}.`,
    EMAIL_NOT_VERIFIED: bn ? "আগে আপনার ইমেইল ভেরিফাই করুন।" : "Verify your email address first.",
    NOT_FOUND: bn
      ? "আমন্ত্রণটি পাওয়া যায়নি বা মেয়াদ শেষ। নতুন আমন্ত্রণ চান।"
      : "This invitation was not found or has expired. Ask us for a new one.",
  };
  return (
    <>
      <p>{bn ? `সাইন ইন করা আছে: ${email}` : `Signed in as ${email}.`}</p>
      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="o-button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          const res = await fetch("/api/workspace/accept", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => null);
          const data = (await res?.json().catch(() => ({}))) as {
            projectId?: string;
            error?: string;
          };
          setBusy(false);
          if (res?.ok && data.projectId)
            router.push(localePath(`/workspace/${data.projectId}`, locale));
          else
            setError(
              messages[data.error ?? ""] ??
                (bn ? "কিছু একটা সমস্যা হয়েছে।" : "Something went wrong."),
            );
        }}
      >
        {busy ? (bn ? "যোগ হচ্ছে…" : "Joining…") : bn ? "আমন্ত্রণ গ্রহণ করুন" : "Accept invitation"}
      </button>
    </>
  );
}
