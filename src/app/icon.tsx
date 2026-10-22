import { ImageResponse } from "next/og";
export const size = { width: 512, height: 512 };
export const contentType = "image/png";
/** App icon: the OANRO mark on the brand's dark background (safe margins for round "maskable" icons). */
export default function Icon() { return new ImageResponse(<Mark px={512} />, size); }
export function Mark({ px }: { px: number }) {
  return <div style={{ width: px, height: px, background: "#07090a", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <svg width={px * 0.58} height={px * 0.58} viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#3ddc97" strokeWidth="7" /><path d="M20 73 50 19 81 74H67L50 43 32 74M40 59H66" fill="none" stroke="#3ddc97" strokeWidth="8" strokeLinejoin="miter" /><path d="m65 80 9-14" stroke="#c49a4a" strokeWidth="7" /></svg>
  </div>;
}
