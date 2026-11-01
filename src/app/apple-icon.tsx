import { ImageResponse } from "next/og";
import { Mark } from "./icon";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iPhone/iPad home-screen icon: the same mark as icon.tsx at 180 × 180. */
export default function AppleIcon() {
  return new ImageResponse(<Mark px={180} />, size);
}
