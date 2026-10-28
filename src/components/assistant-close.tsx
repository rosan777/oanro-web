import type { CSSProperties } from "react";

/**
 * The assistant's close symbol (owner's design, rocket-close-download.html): a tilted rocket whose round window is an X,
 * with a flickering flame and three thin streaks passing by. Plain SVG, no external files. Motion is CSS (assistant.css)
 * and stops for reduced motion and the site's Pause motion switch.
 */
export function CloseRocket({ style }: { style?: CSSProperties }) {
  return <>
    <i className="asst-streak s1" aria-hidden="true" /><i className="asst-streak s2" aria-hidden="true" /><i className="asst-streak s3" aria-hidden="true" />
    <svg className="asst-rocket" viewBox="0 0 64 64" fill="none" aria-hidden="true" focusable="false" style={style}>
      <g transform="rotate(39 32 32)" stroke="#154a3b" strokeWidth="2" strokeLinejoin="round">
        <path d="M23 35 14 47l10-2 5 7 3-13M41 35l9 12-10-2-5 7-3-13" fill="#83c9a7" />
        <path d="M32 5C20 15 20 28 24 41h16c4-13 4-26-8-36Z" fill="#f5f2e7" />
        <path d="m26 12 6-7 6 7" fill="#a7dbbb" />
        <circle cx="32" cy="25" r="9" fill="#d8eadb" />
        <path d="m27 20 10 10m0-10L27 30" stroke="#174b3d" strokeWidth="3" strokeLinecap="round" />
        <path className="asst-flame" d="M28 44q-5 8 4 15 9-7 4-15Z" fill="#e44e44" stroke="#ab332d" />
        <path d="M30 46q-2 4 2 9 4-5 2-9" fill="#ffad78" stroke="none" />
      </g>
    </svg>
  </>;
}
