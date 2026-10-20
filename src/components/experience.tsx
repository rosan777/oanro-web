"use client";

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { Localized } from "./locale";

const MotionContext = createContext({ paused: false, toggle: () => {} });
const query = "(prefers-reduced-motion: reduce)";
function subscribe(callback: () => void) { const media = window.matchMedia(query); media.addEventListener("change", callback); return () => media.removeEventListener("change", callback); }
function preference() { return window.matchMedia(query).matches; }
function serverPreference() { return true; }
export function useMotion() {
  const context = useContext(MotionContext);
  const reduced = useSyncExternalStore(subscribe, preference, serverPreference);
  return { ...context, allowed: !context.paused && !reduced, reduced };
}
export function Experience({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  return <MotionContext.Provider value={{ paused, toggle: () => setPaused(p => !p) }}><div data-motion={paused ? "paused" : "running"}>{children}</div></MotionContext.Provider>;
}
export function MotionToggle() { const { paused, reduced, toggle } = useMotion(); return <button type="button" className="quiet-button" onClick={toggle} disabled={reduced}>{reduced ? <Localized en="Reduced motion enabled" bn="কম অ্যানিমেশন চালু" /> : paused ? <Localized en="Enable motion" bn="অ্যানিমেশন চালু করুন" /> : <Localized en="Pause motion" bn="অ্যানিমেশন থামান" />}</button>; }

export function Intro() {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (window.matchMedia(query).matches) return;
    try { if (sessionStorage.getItem("oanro-intro-v2")) return; } catch { return; }
    const frame = requestAnimationFrame(() => node?.showModal());
    const timer = window.setTimeout(() => { node?.close(); try { sessionStorage.setItem("oanro-intro-v2", "seen"); } catch {} }, 1000);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); node?.close(); };
  }, []);
  function close() { dialog.current?.close(); try { sessionStorage.setItem("oanro-intro-v2", "seen"); } catch {} }
  return <dialog ref={dialog} className="intro-screen" aria-label="OANRO welcome" onCancel={close}>
    <div className="intro-center"><div className="energy-ring" /><div className="logo-flip"><Image src="/logo.svg" alt="OANRO" width={100} height={100} /></div><p>OANRO</p><span><Localized en="Preparing experience" bn="অভিজ্ঞতা প্রস্তুত হচ্ছে" /></span><div className="intro-progress"><i /></div><button onClick={close} type="button"><Localized en="Skip intro" bn="ইন্ট্রো বাদ দিন" /></button></div>
  </dialog>;
}

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { allowed } = useMotion();
  useEffect(() => {
    const node = ref.current;
    if (!node || !allowed) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { node.classList.add("reveal-enter"); observer.unobserve(node); } }, { threshold: 0.12 });
    observer.observe(node); return () => observer.disconnect();
  }, [allowed]);
  return <div ref={ref} className={className}>{children}</div>;
}
