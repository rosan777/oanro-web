"use client";
import { useRef, useState, type ReactNode } from "react";
import { MessageCircle, X } from "lucide-react";
import { useT } from "./locale";

/**
 * Green button that opens a form in the centre of the window: it appears lightly blurred and grey,
 * then sharpens into full colour over a warm off-white haze. Native modal dialog, so Escape,
 * focus trapping and the backdrop come from the browser. Used for every inquiry form on the site.
 */
export function FormPopup({ label, dialogLabel, children, icon }: { label: ReactNode; dialogLabel: string; children: ReactNode; icon?: ReactNode }) {
  const t = useT();
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  function open() { setClosing(false); dialog.current?.showModal(); button.current?.blur(); }
  function close() {
    const d = dialog.current; if (!d?.open) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { d.close(); return; }
    setClosing(true);
    window.setTimeout(() => { d.close(); setClosing(false); button.current?.focus(); }, 420);
  }
  return <>
    <button ref={button} type="button" className="button brand-button message-reveal-trigger" aria-haspopup="dialog" onClick={open}>
      {icon ?? <MessageCircle size={17} />}{label}
    </button>
    <dialog ref={dialog} className={`message-pop${closing ? " is-closing" : ""}`} aria-label={dialogLabel}
      onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) close(); }}>
      <button type="button" className="message-pop-close" aria-label={t("Close", "বন্ধ করুন")} onClick={close}><X size={20} /></button>
      {children}
    </dialog>
  </>;
}
