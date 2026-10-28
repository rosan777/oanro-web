"use client";
import { ActionIcon } from "./action-icon";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useLocale } from "./locale";
import { PasswordField } from "./password-field";
import { suggestEmailFix } from "@/lib/email-typo";
import Link from "@/components/locale-link";

/** Wait this long before another verification email can be requested. Matches the server limit (3 per 60 s on /send-verification-email). */
const RESEND_COOLDOWN_SECONDS = 60;
type Mode = "login" | "signup" | "forgot" | "reset" | "code";
export function AuthPanel({ google, resetToken, next = "/account" }: { google: boolean; resetToken?: string; next?: string }) {
  const router = useRouter();
  const { locale } = useLocale();
  const bn = locale === "bn";
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : "login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState(false);
  // Sign-up only: "Did you mean ...?" for a probable domain typo. It is a question, never a rule.
  // keptEmail remembers an address the person confirmed as correct, so the next submit goes straight through.
  const [emailFix, setEmailFix] = useState<{ typed: string; suggested: string } | null>(null);
  const keptEmail = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  // Email waiting for verification (after sign-up, or a sign-in with an unverified address) and the resend countdown.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const awaitVerification = (email: string) => { setPendingEmail(email); setCooldown(RESEND_COOLDOWN_SECONDS); };
  // The server answers the same way for unknown, verified and unverified addresses, so this message is neutral too.
  async function resendVerification() {
    if (!pendingEmail || cooldown > 0) return;
    setBusy(true); setMessage("");
    try {
      const result = await authClient.sendVerificationEmail({ email: pendingEmail, callbackURL: next });
      setMessage(result.error
        ? (bn ? "এখন পাঠানো যায়নি। এক মিনিট পরে আবার চেষ্টা করুন।" : "Couldn't send it right now. Please try again in a minute.")
        : (bn ? "যাচাই বাকি থাকলে নতুন লিংক পাঠানো হয়েছে। inbox ও spam ফোল্ডার দেখুন।" : "If this address still needs verifying, a new link is on its way. Check your inbox and spam folder."));
    } catch { setMessage(bn ? "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Connection failed. Please try again."); }
    finally { setBusy(false); setCooldown(RESEND_COOLDOWN_SECONDS); }
  }
  const emailInput = () => formRef.current?.elements.namedItem("email") as HTMLInputElement | null;
  // Step 2 of sign-in for accounts with two-factor on: a 6-digit code from the authenticator app, or a backup code.
  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\s/g, "");
    try {
      const result = backup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code, trustDevice: form.get("trust") === "on" });
      if (result.error) setMessage(bn ? "কোডটি সঠিক নয় বা মেয়াদ শেষ। আবার চেষ্টা করুন।" : "That code didn't work. Check it and try again.");
      else { router.replace(next); router.refresh(); }
    } catch { setMessage(bn ? "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Connection failed. Please try again."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (mode === "signup" && keptEmail.current !== email) {
      const suggested = suggestEmailFix(email);
      setEmailFix(suggested ? { typed: email, suggested } : null);
      if (suggested) { setBusy(false); return; }
    }
    try {
      if (mode === "forgot") {
        await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
        setMessage(bn ? "অ্যাকাউন্ট থাকলে reset নির্দেশনা ইমেইলে যাবে।" : "If the account exists, reset instructions will be emailed.");
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({ newPassword: password, token: resetToken! });
        setMessage(result.error ? (bn ? "লিংকটি ব্যবহার করা যায়নি। নতুন reset link নিন।" : "Unable to reset. Request a new reset link.") : (bn ? "Password বদলেছে। এখন sign in করুন।" : "Password changed. You can now sign in."));
      } else if (mode === "signup") {
        const result = await authClient.signUp.email({ name: String(form.get("name") ?? "").trim(), email, password, callbackURL: next });
        const badDomain = result.error && [result.error.code, result.error.message].includes("EMAIL_DOMAIN_CANNOT_RECEIVE_MAIL");
        setMessage(badDomain ? (bn ? "এই ইমেইলের domain-এ মেইল পৌঁছায় না। বানান যাচাই করুন।" : "This email's domain can't receive mail. Please check the spelling.") : result.error ? (bn ? "অ্যাকাউন্ট তৈরি করা যায়নি। তথ্য যাচাই করুন অথবা sign in/reset ব্যবহার করুন।" : "Unable to create account. Check your details or use sign in/password reset.") : (bn ? "ইমেইলের verification link খুলে তারপর sign in করুন।" : "Open the verification link in your email, then sign in."));
        if (!result.error) awaitVerification(email);
      } else {
        const result = await authClient.signIn.email({ email, password });
        if (result.error) {
          // Only someone who typed the right password gets this answer, so it does not reveal which emails have accounts.
          if (result.error.code === "EMAIL_NOT_VERIFIED") { awaitVerification(email); setMessage(bn ? "আপনার ইমেইল এখনো যাচাই হয়নি। নতুন যাচাইয়ের লিংক পাঠানো হয়েছে, inbox ও spam দেখুন।" : "Your email isn't verified yet. We sent a new verification link: check your inbox and spam folder."); }
          else setMessage(bn ? "Sign in হয়নি। তথ্য ও email verification যাচাই করুন।" : "Sign in failed. Check your details and email verification.");
        }
        else if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) { setMode("code"); setBackup(false); }
        else { router.replace(next); router.refresh(); }
      }
    } catch { setMessage(bn ? "সংযোগে সমস্যা হয়েছে। আবার চেষ্টা করুন।" : "Connection failed. Please try again."); }
    finally { setBusy(false); }
  }
  async function googleLogin() {
    setBusy(true); setMessage("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: next, errorCallbackURL: "/sign-in" });
      if (result.error) setMessage(bn ? "Google sign in হয়নি। আবার চেষ্টা করুন।" : "Google sign in failed. Please try again.");
    } catch { setMessage(bn ? "সংযোগে সমস্যা হয়েছে।" : "Connection failed."); }
    finally { setBusy(false); }
  }
  if (mode === "code") return <section className="auth-card">
    <h1>{bn ? "দুই ধাপের যাচাই" : "Two-step verification"}</h1>
    <p>{backup ? (bn ? "আপনার সেভ করা backup code-গুলোর একটি লিখুন।" : "Enter one of the backup codes you saved.") : (bn ? "Authenticator অ্যাপে OANRO-র ৬ সংখ্যার কোডটি লিখুন।" : "Enter the 6-digit code for OANRO from your authenticator app.")}</p>
    <form onSubmit={verifyCode}>
      <label>{backup ? "Backup code" : (bn ? "৬ সংখ্যার কোড" : "6-digit code")}<input key={String(backup)} name="code" required autoFocus autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} pattern={backup ? undefined : "[0-9]{6}"} maxLength={backup ? 20 : 6} /></label>
      {!backup && <label className="inquiry-consent"><input type="checkbox" name="trust" /><span>{bn ? "এই ডিভাইসে ৩০ দিন আর জিজ্ঞাসা করবে না" : "Don't ask again on this device for 30 days"}</span></label>}
      <button className="button brand-button" disabled={busy}>{busy ? (bn ? "অপেক্ষা করুন…" : "Please wait…") : bn ? "যাচাই করুন" : "Verify"}</button>
    </form>
    <div className="auth-links"><button disabled={busy} onClick={() => { setBackup(b => !b); setMessage(""); }}>{backup ? (bn ? "অ্যাপের কোড ব্যবহার করুন" : "Use the app code") : (bn ? "ফোন নেই? Backup code ব্যবহার করুন" : "No phone? Use a backup code")}</button><button disabled={busy} onClick={() => { setMode("login"); setMessage(""); }}>{bn ? "ফিরে যান" : "Back"}</button></div>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
  return <section className="auth-card">
    <h1>{mode === "signup" ? (bn ? "অ্যাকাউন্ট তৈরি করুন" : "Create account") : mode === "forgot" || mode === "reset" ? (bn ? "Password reset" : "Reset password") : (bn ? "OANRO-তে sign in" : "Sign in to OANRO")}</h1>
    <form ref={formRef} onSubmit={submit}>
      {mode === "signup" && <label>{bn ? "পুরো নাম" : "Full name"}<input name="name" autoComplete="name" required maxLength={150} /></label>}
      {mode !== "reset" && <label>{bn ? "ইমেইল" : "Email"}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>}
      {mode === "signup" && emailFix && <div className="email-hint" role="alert">
        <p>{bn ? "আপনি কি বোঝাতে চেয়েছেন" : "Did you mean"} <strong>{emailFix.suggested}</strong>?</p>
        <div className="email-hint-actions">
          <button type="button" onClick={() => { const input = emailInput(); if (input) input.value = emailFix.suggested; setEmailFix(null); input?.focus(); }}>{bn ? "হ্যাঁ, এটি ব্যবহার করুন" : "Yes, use it"}</button>
          <button type="button" onClick={() => { keptEmail.current = emailFix.typed; setEmailFix(null); formRef.current?.requestSubmit(); }}>{bn ? "না, আমারটাই থাক" : "No, keep mine"}</button>
        </div>
      </div>}
      {mode !== "forgot" && <PasswordField label={bn ? "পাসওয়ার্ড" : "Password"} name="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 8} maxLength={128} required
        {...(mode === "login" ? {} : { pattern: "(?=.*\\p{L})(?=.*\\d).{8,}", title: bn ? "কমপক্ষে ৮ অক্ষর, অক্ষর ও সংখ্যা মিলিয়ে" : "At least 8 characters, mixing letters and numbers" })}
        hint={mode !== "login" ? (bn ? "কমপক্ষে ৮ অক্ষর, অক্ষর ও সংখ্যা মিলিয়ে (যেমন rosan2026)" : "At least 8 characters, mixing letters and numbers (e.g. rosan2026)") : undefined} />}
      {mode === "signup" && <label className="consent-check"><input type="checkbox" name="consent" required /><span>{bn ? <>আমি OANRO-র <Link href="/privacy" target="_blank">প্রাইভেসি নোটিশ</Link> পড়েছি এবং আমার তথ্য ব্যবহারে সম্মতি দিচ্ছি।</> : <>I have read the <Link href="/privacy" target="_blank">Privacy notice</Link> and agree to OANRO using my details for this purpose.</>}</span></label>}
      <button className="button brand-button" disabled={busy}>{busy ? (bn ? "অপেক্ষা করুন…" : "Please wait…") : mode === "login" ? (bn ? "Sign in" : "Sign in") : mode === "signup" ? (bn ? "অ্যাকাউন্ট তৈরি" : "Create account") : (bn ? "চালিয়ে যান" : "Continue")}</button>
    </form>
    {google && mode === "login" && <button className="button" disabled={busy} onClick={googleLogin}>{bn ? "Google দিয়ে sign in" : "Continue with Google"}</button>}
    {google && mode === "login" && <p className="consent-note">{bn ? <>Google দিয়ে চালিয়ে গেলে আপনি আমাদের <Link href="/privacy">প্রাইভেসি নোটিশে</Link> সম্মতি দিচ্ছেন।</> : <>By continuing with Google you agree to our <Link href="/privacy">Privacy notice</Link>.</>}</p>}
    <div className="auth-links">{(["login", "signup", "forgot"] as const).filter(x => x !== mode).map(x => <button disabled={busy} key={x} onClick={() => { setMode(x); setMessage(""); }}>{x === "login" ? "Sign in" : x === "signup" ? (bn ? "নতুন অ্যাকাউন্ট" : "Create account") : (bn ? "পাসওয়ার্ড ভুলে গেছেন?" : "Forgot password?")}</button>)}</div>
    <p role="status" aria-live="polite">{message}</p>
    {pendingEmail && (mode === "login" || mode === "signup") && <div className="resend-box">
      <button type="button" disabled={busy || cooldown > 0} onClick={resendVerification}>
        {cooldown > 0 ? (bn ? `${cooldown} সেকেন্ড পরে আবার পাঠানো যাবে` : `Resend available in ${cooldown}s`) : (bn ? "যাচাইয়ের ইমেইল আবার পাঠান" : "Resend verification email")}
      </button>
    </div>}
  </section>;
}
export function SignOut() {
  const router = useRouter();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return <><button type="button" className="account-btn is-signout" disabled={busy} onClick={async () => {
    setBusy(true); setFailed(false);
    try { const result = await authClient.signOut(); if (result.error) setFailed(true); else { router.replace("/sign-in"); router.refresh(); } }
    catch { setFailed(true); } finally { setBusy(false); }
  }}><ActionIcon name="signout" />{busy ? (locale === "bn" ? "সাইন আউট হচ্ছে…" : "Signing out…") : locale === "bn" ? "সাইন আউট" : "Sign out"}</button>{failed && <p role="alert">{locale === "bn" ? "সাইন আউট হয়নি। আবার চেষ্টা করুন।" : "Sign out failed. Please retry."}</p>}</>;
}
