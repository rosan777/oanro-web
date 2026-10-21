"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Menu, Search, X } from "lucide-react";
import type { MenuGroup } from "@/lib/admin-menu";

type Hit = { href: string; label: string; kind: string };

/** Side menu + search around every admin page. Pages keep their own permission checks. */
export function AdminShell({ menu, live, name, role, children }: { menu: MenuGroup[]; live: boolean; name: string; role: string; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const isOn = (href: string) => href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`);
  const pages = useMemo(() => menu.flatMap(g => g.items.map(i => ({ href: i.href, label: i.label, kind: "PAGE" }))), [menu]);
  const canOrders = pages.some(p => p.href === "/admin/orders"), canLog = pages.some(p => p.href === "/admin/activity"), canCustomers = pages.some(p => p.href === "/admin/customers");
  const term = q.trim();
  const hits: Hit[] = [
    ...(term && canOrders ? [{ href: `/admin/orders?q=${encodeURIComponent(term)}`, label: `Find order “${term}” (code, name, phone or Trx ID)`, kind: "ORDERS" }] : []),
    ...(term && canCustomers ? [{ href: `/admin/customers?q=${encodeURIComponent(term)}`, label: `Find customer “${term}”`, kind: "CUSTOMERS" }] : []),
    ...(term && canLog ? [{ href: `/admin/activity?q=${encodeURIComponent(term)}`, label: `Search the activity log for “${term}”`, kind: "LOG" }] : []),
    ...pages.filter(p => !term || p.label.toLowerCase().includes(term.toLowerCase())),
  ].slice(0, 8);

  // Close the menu and search when the page changes, and clear search when it opens (intended effect state syncs).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); setSearch(false); }, [path]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (search) { setQ(""); setTimeout(() => input.current?.focus(), 0); } }, [search]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setSearch(true); }
      if (e.key === "Escape") setSearch(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (href: string) => { setSearch(false); router.push(href); };

  return <div className="admin-shell">
    <button type="button" className="admin-menu-toggle" aria-expanded={open} aria-controls="admin-side" onClick={() => setOpen(v => !v)}>{open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}Admin menu</button>
    <nav id="admin-side" className={`admin-side${open ? " is-open" : ""}`} aria-label="Admin menu">
      <div className="admin-side-brand"><span className="admin-side-logo" aria-hidden="true" /><strong>OANRO</strong><small>ADMIN</small></div>
      <button type="button" className="admin-side-search" onClick={() => setSearch(true)}><Search size={16} aria-hidden="true" /><span>Search anything</span><kbd>/</kbd></button>
      {menu.map(g => <div key={g.label} className="admin-side-group" data-group={g.label.toLowerCase().replace(/\s+/g, "-")}>
        <p>{g.label}</p>
        {g.items.map(i => <Link key={i.href} href={i.href} className={`admin-side-link${isOn(i.href) ? " is-on" : ""}`} aria-current={isOn(i.href) ? "page" : undefined}>
          <span>{i.label}</span>{i.count ? <span className="admin-side-count" aria-label={`${i.count} waiting`}>{i.count}</span> : null}
        </Link>)}
      </div>)}
      <div className={`admin-side-store${live ? " is-live" : ""}`}>
        <span><i aria-hidden="true" />Store: {live ? "live" : "preview mode"}</span>
        <small>{live ? "Customers can order." : "Customers can browse, checkout is off."}</small>
      </div>
      <div className="admin-side-user"><span aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span><div><strong>{name}</strong><small>{role}</small></div></div>
    </nav>
    <div className="admin-content">{children}</div>
    {search && <div className="admin-search-backdrop" onClick={() => setSearch(false)}>
      <div className="admin-search" role="dialog" aria-modal="true" aria-label="Search the admin" onClick={e => e.stopPropagation()}>
        <form onSubmit={e => { e.preventDefault(); if (hits[0]) go(hits[0].href); }}>
          <Search size={18} aria-hidden="true" />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Order code, customer, phone, page…" aria-label="Search" maxLength={60} />
          <button type="button" className="btn btn-neutral btn-sm" onClick={() => setSearch(false)}>Esc</button>
        </form>
        <ul>{hits.map(h => <li key={h.href}><button type="button" onClick={() => go(h.href)}><span>{h.label}</span><small>{h.kind}</small></button></li>)}</ul>
        {!hits.length && <p>Nothing found.</p>}
      </div>
    </div>}
  </div>;
}
