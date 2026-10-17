// Small, dependency-free charts for the admin reports. Server-rendered (no client JS), accessible:
// every chart has a text title and the exact numbers are always printed next to each bar or point.
import Link from "next/link";
import { formatPrice } from "@/lib/catalog";
import { ActionIcon, type ActionIconName } from "./action-icon";

export const fmtCount = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const pct = (now: number, before: number) => before === 0 ? (now === 0 ? 0 : null) : Math.round((now - before) / Math.abs(before) * 1000) / 10;

/** Range tabs as plain links, so the page works without JavaScript and each view has its own URL. */
export function RangeTabs({ base, current }: { base: string; current: string }) {
  const tabs: [string, string][] = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["365d", "12 months"], ["all", "All time"]];
  return <nav className="report-range" aria-label="Time period">{tabs.map(([id, label]) =>
    <Link key={id} href={`${base}?range=${id}`} aria-current={current === id ? "page" : undefined} scroll={false}>{label}</Link>)}</nav>;
}

/** Headline number with an optional change versus the previous period of the same length. */
export function StatCard({ icon, label, value, now, before, tone = "neutral", hint, invert = false }: { icon: ActionIconName; label: string; value: string; now?: number; before?: number | null; tone?: "neutral" | "good" | "bad" | "brand"; hint?: string; invert?: boolean }) {
  const change = before === undefined || before === null || now === undefined ? undefined : pct(now, before);
  const up = change !== undefined && change !== null && change > 0, down = change !== undefined && change !== null && change < 0;
  const good = invert ? down : up, bad = invert ? up : down;
  return <div className={`stat-card is-${tone}`}>
    <span className="stat-icon"><ActionIcon name={icon} size={18} /></span>
    <small>{label}</small>
    <strong>{value}</strong>
    {change !== undefined && <span className={`stat-change ${good ? "is-good" : bad ? "is-bad" : ""}`}>
      {change === null ? "New this period" : change === 0 ? "No change vs previous period" : <><ActionIcon name={up ? "trend-up" : "trend-down"} size={14} />{up ? "+" : ""}{change}% vs previous period</>}
    </span>}
    {hint && <span className="stat-hint">{hint}</span>}
  </div>;
}

export type Bar = { label: string; sub?: string; value: number; display: string; tone?: "brand" | "gold" | "good" | "bad" | "muted" };
/** Horizontal bar list. Handles negative values (losses) by drawing them in red from the same baseline. */
export function BarList({ title, bars, empty = "Nothing to show for this period yet." }: { title: string; bars: Bar[]; empty?: string }) {
  const max = Math.max(1, ...bars.map(b => Math.abs(b.value)));
  return <figure className="bar-list">
    <figcaption>{title}</figcaption>
    {!bars.length ? <p className="report-empty">{empty}</p> : <ol>{bars.map((b, i) =>
      <li key={i}>
        <span className="bar-label"><span>{b.label}</span>{b.sub && <small>{b.sub}</small>}</span>
        <span className="bar-track" aria-hidden="true"><i className={`is-${b.value < 0 ? "bad" : b.tone ?? "brand"}`} style={{ width: `${Math.max(b.value === 0 ? 0 : 2, Math.abs(b.value) / max * 100)}%` }} /></span>
        <span className={`bar-value${b.value < 0 ? " is-bad" : ""}`}>{b.display}</span>
      </li>)}</ol>}
  </figure>;
}

/** Line chart over time: revenue, and optionally profit. Points are labelled in a table for screen readers. */
export function TrendChart({ title, points, monthly, showProfit = false }: { title: string; points: { key: string; revenue: number; profit?: number }[]; monthly: boolean; showProfit?: boolean }) {
  if (points.length < 2) return null;
  const W = 640, H = 200, P = { l: 8, r: 8, t: 14, b: 26 };
  const values = points.flatMap(p => showProfit ? [p.revenue, p.profit ?? 0] : [p.revenue]);
  const max = Math.max(1, ...values), min = Math.min(0, ...values);
  const x = (i: number) => P.l + i * (W - P.l - P.r) / (points.length - 1);
  const y = (v: number) => P.t + (max - v) * (H - P.t - P.b) / (max - min);
  const line = (f: (p: typeof points[number]) => number) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(f(p)).toFixed(1)}`).join(" ");
  const label = (k: string) => monthly ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(k.slice(5, 7)) - 1] + (k.slice(5, 7) === "01" ? ` ${k.slice(0, 4)}` : "") : `${Number(k.slice(8, 10))}/${Number(k.slice(5, 7))}`;
  const every = Math.ceil(points.length / 8);
  return <figure className="trend-chart">
    <figcaption>{title}
      <span className="trend-legend"><span><i className="is-brand" />Revenue</span>{showProfit && <span><i className="is-gold" />Net profit</span>}</span>
    </figcaption>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} preserveAspectRatio="none">
      {[0, .25, .5, .75, 1].map(f => <line key={f} x1={P.l} x2={W - P.r} y1={P.t + f * (H - P.t - P.b)} y2={P.t + f * (H - P.t - P.b)} className="grid" />)}
      {min < 0 && <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="zero" />}
      <path d={`${line(p => p.revenue)} L${x(points.length - 1)},${y(Math.max(min, 0))} L${x(0)},${y(Math.max(min, 0))} Z`} className="area" />
      <path d={line(p => p.revenue)} className="series is-brand" />
      {showProfit && <path d={line(p => p.profit ?? 0)} className="series is-gold" />}
      {points.map((p, i) => i % every === 0 || i === points.length - 1 ? <text key={p.key} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{label(p.key)}</text> : null)}
    </svg>
    <details className="trend-table"><summary>Show numbers</summary>
      <table><thead><tr><th scope="col">{monthly ? "Month" : "Day"}</th><th scope="col">Revenue</th>{showProfit && <th scope="col">Net profit</th>}</tr></thead>
        <tbody>{points.map(p => <tr key={p.key}><td>{p.key}</td><td>{formatPrice(p.revenue)}</td>{showProfit && <td>{formatPrice(p.profit ?? 0)}</td>}</tr>)}</tbody></table>
    </details>
  </figure>;
}

/** Share split as one stacked bar (e.g. bKash vs Nagad). */
export function SplitBar({ title, parts }: { title: string; parts: { label: string; value: number; display: string; tone: string }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return <figure className="split-bar">
    <figcaption>{title}</figcaption>
    <div className="split-track" aria-hidden="true">{total > 0 && parts.map(p => <i key={p.label} className={`is-${p.tone}`} style={{ width: `${p.value / total * 100}%` }} />)}</div>
    <ul>{parts.map(p => <li key={p.label}><i className={`is-${p.tone}`} aria-hidden="true" /><strong>{p.label}</strong> {p.display}{total > 0 && <small> · {Math.round(p.value / total * 100)}%</small>}</li>)}</ul>
  </figure>;
}
