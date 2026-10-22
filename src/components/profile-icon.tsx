// Icons the admin can choose in Admin → Company profile (names listed in lib/company-profile-data.ts).
import { Activity, BadgeCheck, Bot, Boxes, BriefcaseBusiness, Building2, ChartLine, Check, Cloud, CloudCog, CloudUpload, CodeXml, Cpu, Database, FlaskConical,
  Globe, GraduationCap, Layers, LayoutDashboard, LifeBuoy, LockKeyhole, Mail, Microchip, MonitorSmartphone, Network, Newspaper, Plug, Puzzle, RefreshCw,
  Rocket, Scale, ServerCog, Settings, ShieldCheck, ShoppingBag, ShoppingCart, Smartphone, Sparkles, Target, Telescope, Users, Workflow, Zap, type LucideIcon } from "lucide-react";
import type { ProfileIconName } from "@/lib/company-profile-data";

const map: Record<ProfileIconName, LucideIcon> = {
  "cpu": Cpu, "life-buoy": LifeBuoy, "cloud-cog": CloudCog, "briefcase": BriefcaseBusiness, "target": Target, "telescope": Telescope, "code": CodeXml,
  "shopping-bag": ShoppingBag, "layout-dashboard": LayoutDashboard, "bot": Bot, "layers": Layers, "server-cog": ServerCog, "microchip": Microchip,
  "monitor-smartphone": MonitorSmartphone, "workflow": Workflow, "cloud-upload": CloudUpload, "network": Network, "activity": Activity, "flask": FlaskConical,
  "boxes": Boxes, "plug": Plug, "chart": ChartLine, "sparkles": Sparkles, "shopping-cart": ShoppingCart, "scale": Scale, "cloud": Cloud, "building": Building2,
  "shield-check": ShieldCheck, "newspaper": Newspaper, "graduation-cap": GraduationCap, "puzzle": Puzzle, "badge-check": BadgeCheck, "refresh": RefreshCw,
  "lock": LockKeyhole, "mail": Mail, "globe": Globe, "users": Users, "rocket": Rocket, "zap": Zap, "database": Database, "smartphone": Smartphone,
  "settings": Settings, "check": Check,
};
export function ProfileIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = map[name as ProfileIconName];
  return Icon ? <Icon size={size} strokeWidth={1.8} aria-hidden /> : null;
}
