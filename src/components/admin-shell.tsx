"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  Bot,
  Building2,
  BellRing,
  CalendarCheck,
  Circle,
  FileText,
  History,
  LayoutGrid,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import type { MenuGroup } from "@/lib/admin-menu";

type Hit = { href: string; label: string; kind: string };

/** One icon per menu page (decorative; the text label stays). */
const menuIcons: Record<string, LucideIcon> = {
  "/admin": CalendarCheck,
  "/admin/orders": ShoppingBag,
  "/admin/leads": MessageSquare,
  "/admin/customers": Users,
  "/admin/sections": LayoutGrid,
  "/admin/published": PackageCheck,
  "/admin/services": Wrench,
  "/admin/campaigns": Megaphone,
  "/admin/discounts": Ticket,
  "/admin/pulse": Newspaper,
  "/admin/assistant": Bot,
  "/admin/content": FileText,
  "/admin/company-profile": Building2,
  "/admin/banners": BellRing,
  "/admin/reports/sales": BarChart3,
  "/admin/reports/profit": TrendingUp,
  "/admin/activity": History,
  "/admin/settings": Truck,
  "/admin/staff": ShieldCheck,
};
const groupSlug = (label: string) => label.toLowerCase().replace(/\s+/g, "-");

/** Side menu + search around every admin page. Pages keep their own permission checks. */
export function AdminShell({
  menu,
  live,
  name,
  role,
  children,
}: {
  menu: MenuGroup[];
  live: boolean;
  name: string;
  role: string;
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const isOn = (href: string) =>
    href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);

  // Quick search: every menu page this person can open, plus shortcuts that search orders, customers
  // or the activity log for the typed text (each only when that page is in their menu). At most 8 results.

  const pages = useMemo(
    () => menu.flatMap(g => g.items.map(i => ({ href: i.href, label: i.label, kind: "PAGE" }))),
    [menu],
  );
  const canOrders = pages.some(p => p.href === "/admin/orders"),
    canLog = pages.some(p => p.href === "/admin/activity"),
    canCustomers = pages.some(p => p.href === "/admin/customers");
  // Name of the page being viewed, shown in the phone top bar (longest matching menu link wins).
  const current =
    pages.filter(p => isOn(p.href)).sort((a, b) => b.href.length - a.href.length)[0]?.label ??
    "Admin";
  // The menu group (area) of the page being viewed: colours the breadcrumb and the page accents.
  const area = menu.find(g => g.items.some(i => i.label === current));
  const term = q.trim();
  const hits: Hit[] = [
    ...(term && canOrders
      ? [
          {
            href: `/admin/orders?q=${encodeURIComponent(term)}`,
            label: `Find order “${term}” (code, name, phone or Trx ID)`,
            kind: "ORDERS",
          },
        ]
      : []),
    ...(term && canCustomers
      ? [
          {
            href: `/admin/customers?q=${encodeURIComponent(term)}`,
            label: `Find customer “${term}”`,
            kind: "CUSTOMERS",
          },
        ]
      : []),
    ...(term && canLog
      ? [
          {
            href: `/admin/activity?q=${encodeURIComponent(term)}`,
            label: `Search the activity log for “${term}”`,
            kind: "LOG",
          },
        ]
      : []),
    ...pages.filter(p => !term || p.label.toLowerCase().includes(term.toLowerCase())),
  ].slice(0, 8);

  // Close the menu and search when the page changes, and clear search when it opens (intended effect state syncs).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
    setSearch(false);
  }, [path]);
  useEffect(() => {
    if (search) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQ("");
      setTimeout(() => input.current?.focus(), 0);
    }
  }, [search]);
  useEffect(() => {
    // Ctrl/⌘ K, or "/" when not typing in a field, opens the search; Escape closes it.

    const onKey = (e: KeyboardEvent) => {
      const typing =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") {
        setSearch(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // While the phone menu is open the page behind it does not scroll.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  const closeMenu = () => {
    setOpen(false);
    toggle.current?.focus();
  };
  const go = (href: string) => {
    setSearch(false);
    router.push(href);
  };

  return (
    <div className="admin-shell">
      <div className="admin-mobilebar">
        <button
          ref={toggle}
          type="button"
          className="admin-menu-toggle"
          aria-expanded={open}
          aria-controls="admin-side"
          aria-label="Open admin menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={20} aria-hidden="true" />
          <span>{current}</span>
        </button>
        <button
          type="button"
          className="admin-mobilebar-search"
          aria-label="Search the admin"
          onClick={() => setSearch(true)}
        >
          <Search size={20} aria-hidden="true" />
        </button>
      </div>
      <nav
        id="admin-side"
        className={`admin-side${open ? " is-open" : ""}`}
        aria-label="Admin menu"
      >
        <div className="admin-side-brand">
          <span className="admin-side-logo" aria-hidden="true" />
          <strong>OANRO</strong>
          <small>ADMIN</small>
          <button
            type="button"
            className="admin-side-close"
            aria-label="Close admin menu"
            onClick={closeMenu}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="admin-side-search" onClick={() => setSearch(true)}>
          <Search size={16} aria-hidden="true" />
          <span>Search anything</span>
          <kbd>/</kbd>
        </button>
        {menu.map(g => (
          <div key={g.label} className="admin-side-group" data-group={groupSlug(g.label)}>
            <p>{g.label}</p>
            {g.items.map(i => (
              <Link
                key={i.href}
                href={i.href}
                className={`admin-side-link${isOn(i.href) ? " is-on" : ""}`}
                aria-current={isOn(i.href) ? "page" : undefined}
              >
                <span className="admin-side-label">
                  {(() => {
                    const Icon = menuIcons[i.href] ?? Circle;
                    return <Icon size={18} aria-hidden="true" />;
                  })()}
                  {i.label}
                </span>
                {i.count ? (
                  <span className="admin-side-count" aria-label={`${i.count} waiting`}>
                    {i.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
        <div className={`admin-side-store${live ? " is-live" : ""}`}>
          <span>
            <i aria-hidden="true" />
            Store: {live ? "live" : "preview mode"}
          </span>
          {/* OANRO_STORE_LIVE only hides prices from Google; checkout opens once a payment number is saved. */}
          <small>
            {live
              ? "Prices are shown to Google."
              : "Prices hidden from Google. Checkout works once a payment number is saved."}
          </small>
        </div>
        <div className="admin-side-user">
          <span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{name}</strong>
            <small>{role}</small>
          </div>
        </div>
      </nav>
      {open && <div className="admin-scrim" aria-hidden="true" onClick={closeMenu} />}
      <div className="admin-content" data-area={area ? groupSlug(area.label) : undefined}>
        {area && (
          <p className="admin-crumb">
            <span className="admin-crumb-chip">{area.label}</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{current}</span>
          </p>
        )}
        {children}
      </div>
      {search && (
        <div className="admin-search-backdrop" onClick={() => setSearch(false)}>
          <div
            className="admin-search"
            role="dialog"
            aria-modal="true"
            aria-label="Search the admin"
            onClick={e => e.stopPropagation()}
          >
            <form
              onSubmit={e => {
                e.preventDefault();
                if (hits[0]) go(hits[0].href);
              }}
            >
              <Search size={18} aria-hidden="true" />
              <input
                ref={input}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Order code, customer, phone, page…"
                aria-label="Search"
                maxLength={60}
              />
              <button
                type="button"
                className="btn btn-neutral btn-sm"
                onClick={() => setSearch(false)}
              >
                Esc
              </button>
            </form>
            <ul>
              {hits.map(h => (
                <li key={h.href}>
                  <button type="button" onClick={() => go(h.href)}>
                    <span>{h.label}</span>
                    <small>{h.kind}</small>
                  </button>
                </li>
              ))}
            </ul>
            {!hits.length && <p>Nothing found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
