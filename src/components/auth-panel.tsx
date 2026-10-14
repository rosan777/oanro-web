"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "./locale";

type Mode = "login" | "signup" | "forgot" | "reset";
export function AuthPanel({ google, resetToken }: { google: boolean; resetToken?: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const bn = locale === "bn";
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : "login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      if (mode === "forgot") {
        await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setMessage(bn ? "অ্যাকাউন্ট থাকলে reset নির্দেশনা ইমেইলে যাবে।" : "If the account exists, reset instructions will be emailed.");
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({ newPassword: password, token: resetToken! });
        setMessage(result.error ? (bn ? "লিংকটি ব্যবহার করা যায়নি। নতুন reset link নিন।" : "Unable to reset. Request a new reset link.") : (bn ? "Password বদলেছে। এখন sign in করুন।" : "Password changed. You can now sign in."));
      } else if (mode === "signup") {
        const result = await authClient.signUp.email({ name: String(form.get("name") ?? "").trim(), email, password, callbackURL: "/account" });
        setMessage(result.error ? (bn ? "অ্যাকাউন্ট তৈরি করা যায়নি। তথ্য যাচাই করুন অথবা sign in/reset ব্যবহার করুন।" : "Unable to create account. Check your details or use sign in/password reset.") : (bn ? "ইমেইলের verification link খুলে তারপর sign in করুন।" : "Open the verification link in your email, then sign in."));
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) setMessage(bn ? "Sign in হয়নি। তথ্য ও email verification যাচাই করুন।" : "Sign in failed. Check your details and email verification.");
        else { router.replace("/account"); router.refresh(); }
      }
    } catch { setMessage(bn ? "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Connection failed. Please try again."); }
    finally { setBusy(false); }
  }
  async function googleLogin() {
    setBusy(true); setMessage("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/account", errorCallbackURL: "/sign-in" });
      if (result.error) setMessage(bn ? "Google sign in হয়নি। আবার চেষ্টা করুন।" : "Google sign in failed. Please try again.");
    } catch { setMessage(bn ? "সংযোগে সমস্যা হয়েছে।" : "Connection failed."); }
    finally { setBusy(false); }
  }
  return <section className="auth-card">
    <h1>{mode === "signup" ? (bn ? "অ্যাকাউন্ট তৈরি করুন" : "Create account") : mode === "forgot" || mode === "reset" ? (bn ? "Password reset" : "Reset password") : (bn ? "OANRO-তে sign in" : "Sign in to OANRO")}</h1>
    <form onSubmit={submit}>
      {mode === "signup" && <label>{bn ? "পুরো নাম" : "Full name"}<input name="name" autoComplete="name" required maxLength={150} /></label>}
      {mode !== "reset" && <label>{bn ? "ইমেইল" : "Email"}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      {mode !== "forgot" && <label>{bn ? "পাসওয়ার্ড" : "Password"}<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 12} maxLength={128} required />{mode !== "login" && <small>{bn ? "কমপক্ষে ১২ অক্ষর" : "At least 12 characters"}</small>}</label>}
      <button className="button brand-button" disabled={busy}>{busy ? (bn ? "অপেক্ষা করুন…" : "Please wait…") : mode === "login" ? (bn ? "Sign in" : "Sign in") : mode === "signup" ? (bn ? "অ্যাকাউন্ট তৈরি" : "Create account") : (bn ? "চালিয়ে যান" : "Continue")}</button>
    </form>
    {google && mode === "login" && <button className="button" disabled={busy} onClick={googleLogin}>{bn ? "Google দিয়ে sign in" : "Continue with Google"}</button>}
    <div className="auth-links">{(["login", "signup", "forgot"] as const).filter(x => x !== mode).map(x => <button disabled={busy} key={x} onClick={() => { setMode(x); setMessage(""); }}>{x === "login" ? "Sign in" : x === "signup" ? (bn ? "নতুন অ্যাকাউন্ট" : "Create account") : (bn ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?")}</button>)}</div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
export function SignOut() {
  const router = useRouter();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return <><button className="button" disabled={busy} onClick={async () => {
    setBusy(true); setFailed(false);
    try { const result = await authClient.signOut(); if (result.error) setFailed(true); else { router.replace("/sign-in"); router.refresh(); } }
    catch { setFailed(true); } finally { setBusy(false); }
  }}>{locale === "bn" ? "সাইন আউট" : "Sign out"}</button>{failed && <p role="alert">{locale === "bn" ? "সাইন আউট হয়নি। আবার চেষ্টা করুন।" : "Sign out failed. Please retry."}</p>}</>;
}
