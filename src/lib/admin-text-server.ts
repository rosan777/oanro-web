// Server-page version of useAdminText(): the same Bangla dictionary, chosen by the request language.
import { adminBangla } from "./admin-bangla";

export const adminTextFor = (locale: "en" | "bn") => (en: string) =>
  locale === "bn" ? (adminBangla[en] ?? en) : en;
