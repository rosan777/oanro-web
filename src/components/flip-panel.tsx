"use client";
import type { CSSProperties, ReactNode } from "react";
import { useMotion } from "./experience";
import styles from "./conveyor-effects.module.css";
import { Localized } from "./locale";

export function FlipPanel({ children, title, detail, index = 0 }: { children: ReactNode; title: string; detail: string; index?: number }) {
  const { allowed } = useMotion();
  return <div className={styles.flip} data-allowed={allowed} style={{ "--flip-delay": `${-index * 2.1}s` } as CSSProperties}>
    <div className={styles.rotor}>
      <div className={styles.front}>{children}</div>
      <div className={styles.back} aria-hidden="true"><span>OANRO</span><strong>{title}</strong><p>{detail}</p><small><Localized en="Explore the details ↗" bn="বিস্তারিত দেখুন ↗" /></small></div>
    </div>
  </div>;
}
