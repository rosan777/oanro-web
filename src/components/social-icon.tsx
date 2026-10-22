import { AtSign, Facebook, Globe, Instagram, Linkedin, MessageCircle, MessagesSquare, Music2, Pin, Send, Twitter, Youtube, type LucideIcon } from "lucide-react";
import type { Social, SocialPlatform } from "@/lib/site-content-data";

const icons: Record<SocialPlatform, LucideIcon> = { facebook: Facebook, instagram: Instagram, tiktok: Music2, x: Twitter, youtube: Youtube, linkedin: Linkedin,
  messenger: MessagesSquare, whatsapp: MessageCircle, telegram: Send, threads: AtSign, pinterest: Pin, website: Globe };
export const platformName: Record<SocialPlatform, string> = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", x: "X (Twitter)", youtube: "YouTube", linkedin: "LinkedIn",
  messenger: "Messenger", whatsapp: "WhatsApp", telegram: "Telegram", threads: "Threads", pinterest: "Pinterest", website: "Website" };

/** The owner's uploaded icon if there is one, otherwise a simple built-in icon for the platform. */
export function SocialIcon({ social, size = 20 }: { social: Pick<Social, "platform" | "icon">; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (social.icon) return <img src={social.icon} alt="" width={size} height={size} className="social-img" />;
  const Icon = icons[social.platform] ?? Globe;
  return <Icon size={size} aria-hidden="true" />;
}
/** Row of social links (footer, contact page). */
export function SocialLinks({ socials, className = "social-links" }: { socials: Social[]; className?: string }) {
  if (!socials.length) return null;
  return <ul className={className}>{socials.map((s, i) => <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label || `OANRO on ${platformName[s.platform]}`} title={s.label || platformName[s.platform]}><SocialIcon social={s} /></a></li>)}</ul>;
}
