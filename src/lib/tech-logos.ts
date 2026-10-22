import "server-only";
import * as simpleIcons from "simple-icons";

type SimpleIcon = { path: string; hex: string; title: string };
const all = simpleIcons as unknown as Record<string, SimpleIcon>;
/** Brand logo for a Simple Icons name (e.g. "react", "nextdotjs"); null when the name is unknown. Very light logos are drawn dark so they stay visible. */
export function techLogo(slug: string): { path: string; color: string } | null {
  if (!slug) return null;
  const icon = all["si" + slug.charAt(0).toUpperCase() + slug.slice(1)];
  if (!icon?.path) return null;
  const v = parseInt(icon.hex, 16); const light = ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11 > 215;
  return { path: icon.path, color: light ? "#07090a" : `#${icon.hex}` };
}
