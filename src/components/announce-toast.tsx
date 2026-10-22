"use client";
import { useEffect, useState, type ReactNode } from "react";

// Phones and tablets: the announcement bar becomes a small floating card above the bottom tab bar, instead of taking room above the header.
// It shows once per visit, a moment after the page loads, closes itself after 12 seconds, and stays closed for the visit once dismissed.
export function AnnounceToast({ children, closeLabel }: { children: ReactNode; closeLabel: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 1024px), (hover: none), (pointer: coarse)").matches) return;
    try { if (sessionStorage.getItem("oanro-announce-seen")) return; } catch { /* storage blocked: still show once */ }
    const show = setTimeout(() => setOpen(true), 1500);
    const hide = setTimeout(() => close(), 13500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, []);
  function close() { setOpen(false); try { sessionStorage.setItem("oanro-announce-seen", "1"); } catch { /* ignore */ } }
  return <div className={`announce-toast${open ? " is-open" : ""}`} aria-hidden={!open} role="status">
    <div className="announce-toast-body">{children}</div>
    <button type="button" className="announce-toast-close" onClick={close} aria-label={closeLabel} tabIndex={open ? 0 : -1}>×</button>
  </div>;
}
