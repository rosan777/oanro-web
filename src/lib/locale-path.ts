// Language-prefixed URLs: English lives at /path, Bangla at /bn/path. Shared by server and browser code.
export type Locale = "en" | "bn";

export function isBnPath(path: string) { return path === "/bn" || path.startsWith("/bn/") || path.startsWith("/bn?") || path.startsWith("/bn#"); }

/** Removes a leading /bn so the result is the English path. */
export function stripLocale(path: string) {
  if (!isBnPath(path)) return path;
  const rest = path.slice(3);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

/** The same page in the given language: "/products/x" -> "/bn/products/x", "/" -> "/bn", "/#contact" -> "/bn#contact". */
export function localePath(path: string, locale: Locale) {
  const base = stripLocale(path);
  if (locale === "en" || base.startsWith("/api")) return base;
  if (base === "/") return "/bn";
  if (base.startsWith("/#") || base.startsWith("/?")) return `/bn${base.slice(1)}`;
  return `/bn${base}`;
}
