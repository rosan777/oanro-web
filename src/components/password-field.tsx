"use client";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useLocale } from "./locale";

/**
 * Password input with a Show/Hide button.
 *
 * - The password is hidden by default. Only this component's own state decides whether it is visible;
 *   nothing is stored, logged or sent anywhere.
 * - The input stays uncontrolled: switching `type` between "password" and "text" keeps what was typed.
 * - The button is `type="button"`, so pressing it never submits the form.
 * - All other input props (name, autoComplete, minLength, pattern ...) are passed through unchanged,
 *   so browser validation and password managers behave exactly as before.
 */
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & { label: ReactNode; hint?: ReactNode };

export function PasswordField({ label, hint, ...inputProps }: Props) {
  const { locale } = useLocale();
  const bn = locale === "bn";
  const [visible, setVisible] = useState(false);
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  return <div className="password-field">
    <label htmlFor={inputId}>{label}</label>
    <div className="password-input">
      <input {...inputProps} id={inputId} type={visible ? "text" : "password"} aria-describedby={hint ? hintId : undefined} autoCapitalize="none" spellCheck={false} />
      <button type="button" className="password-toggle" onClick={() => setVisible(v => !v)} aria-controls={inputId}
        aria-label={visible ? (bn ? "পাসওয়ার্ড লুকান" : "Hide password") : (bn ? "পাসওয়ার্ড দেখান" : "Show password")}>
        {visible ? (bn ? "লুকান" : "Hide") : (bn ? "দেখান" : "Show")}
      </button>
    </div>
    {hint ? <small id={hintId}>{hint}</small> : null}
  </div>;
}
