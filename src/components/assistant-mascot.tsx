import type { CSSProperties } from "react";

export type MascotState = "idle" | "wave" | "thinking" | "listening" | "speaking";
/**
 * The OANRO assistant icon: the owner's animated rocket recoloured to the site palette (public/assistant/rocket-mint.svg, a plain SVG with built-in motion).
 * Visitors who prefer reduced motion get a still copy (rocket-mint-static.svg). Per-state motion (hop, think, listen) is CSS in assistant.css.
 */
export function AssistantMascot({ state = "idle", size = 56, style }: { state?: MascotState; size?: number; style?: CSSProperties }) {
  return <span className={`asst-mascot is-${state}`} aria-hidden="true" style={{ width: size, height: size, ...style }}>
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet="/assistant/rocket-mint-static.svg" />
      <img src="/assistant/rocket-mint.svg" alt="" width={size} height={size} decoding="async" draggable={false} />
    </picture>
  </span>;
}
