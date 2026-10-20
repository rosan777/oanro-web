import { FeeSetting } from "@/components/fee-setting";
import Link from "next/link";
import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { parseRange, profitReport } from "@/lib/report-store";
import { formatPrice } from "@/lib/catalog";
import { AdminBack } from "@/components/admin-nav";
import { ActionIcon } from "@/components/action-icon";
import { CsvButton } from "@/components/csv-button";
import { BarList, RangeTabs, StatCard, TrendChart, fmtCount } from "@/components/report-charts";
export const dynamic = "force-dynamic";

export default async function ProfitReportPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { access } = await requireAdminPage("profit.read");
  const range = parseRange((await searchParams).range);
  const r = await profitReport(catalogDb(), range);
  const sold = r.rows.filter(x => x.sold > 0);
  const byUnits = [...sold].sort((a, b) => b.sold - a.sold), byProfit = [...sold].sort((a, b) => b.profit - a.profit);
  const losses = r.rows.filter(x => x.loss);
  const csv: (string | number | null)[][] = [["Product", "Section", "Selling price (BDT)", "Cost price (BDT)", "Units sold", "Revenue (BDT)", "Product cost (BDT)", "Profit (BDT)", "Margin %"],
    ...r.rows.map(x => [x.name, x.section, x.price, x.costPrice, x.sold, x.revenue, x.cost, x.profit, x.margin]),
    [], ["Total revenue", r.totals.revenue], ["Product cost", r.totals.productCost], ["Delivery charges collected", r.totals.delivery], ["Courier charges", r.totals.shipping], [`Payment fees (${r.feePercent}%)`, r.totals.fees], ["Refunds", r.totals.refunds], ["Net profit", r.totals.net], ["Net margin %", r.totals.margin]];
  const tone = r.totals.net < 0 ? "bad" : "good";
  return <main id="main-content" className="container auth-page admin-report">
    <AdminBack />
    <header className="report-head">
      <div><p className="eyebrow">Analytics · private</p><h1>Profit &amp; performance</h1><p>Profit = selling price − cost price for every unit sold, plus delivery charges collected, minus what you paid couriers, bKash/Nagad fees and refunds. Cash on delivery counts only after the cash is received. Uses the cost saved on each order, so changing a cost later does not rewrite past profit.</p></div>
      <CsvButton filename={`oanro-profit-${range}.csv`} rows={csv} />
    </header>
    <RangeTabs base="/admin/reports/profit" current={range} />

    {(r.missingCost > 0 || r.missingShipping > 0 || r.pendingCod.orders > 0) && <div className="report-note" role="note"><ActionIcon name="alert" size={18} /><div>
      {r.missingCost > 0 && <p><strong>{r.missingCost} product{r.missingCost === 1 ? " has" : "s have"} no cost price</strong>, so their profit shows too high. {access.permissions.has("costs.manage") ? "Add it in each product's edit form." : "Ask someone with “Cost prices” access to add it."}</p>}
      {r.pendingCod.orders > 0 && <p><strong>{formatPrice(r.pendingCod.amount)} cash on delivery is still with the courier</strong> ({r.pendingCod.orders} order{r.pendingCod.orders === 1 ? "" : "s"}). It is added to revenue and profit when you press “Cash received” on the order.</p>}
      {r.missingShipping > 0 && <p><strong>{r.missingShipping} order{r.missingShipping === 1 ? " has" : "s have"} no courier charge yet.</strong> Until you add it on the <Link href="/admin/orders">Orders</Link> page, the courier cost is assumed equal to the delivery charge (no profit, no loss on delivery).</p>}
    </div></div>}

    <section className="stat-grid" aria-label="Summary">
      <StatCard icon="coin" tone="brand" label="Revenue" value={formatPrice(r.totals.revenue)} now={r.totals.revenue} before={r.previous?.revenue} />
      <StatCard icon="box" label="Product cost" value={formatPrice(r.totals.productCost)} hint={`Gross profit ${formatPrice(r.totals.gross)}`} />
      <StatCard icon="courier" label="Delivery: charged − courier" value={formatPrice(r.totals.delivery - r.totals.shipping)} tone={r.totals.delivery - r.totals.shipping < 0 ? "bad" : "neutral"} hint={`Charged ${formatPrice(r.totals.delivery)} · paid courier ${formatPrice(r.totals.shipping)}`} />
      <StatCard icon="alert" label="Fees & refunds" value={formatPrice(r.totals.fees + r.totals.refunds)} tone={r.totals.fees + r.totals.refunds > 0 ? "bad" : "neutral"} hint={`Payment fees ${formatPrice(r.totals.fees)} (${r.feePercent}%) · refunds ${formatPrice(r.totals.refunds)}`} />
      <StatCard icon="wallet" tone={tone} label="Net profit" value={formatPrice(r.totals.net)} now={r.totals.net} before={r.previous?.net} hint={r.totals.margin === null ? "No sales yet" : `${r.totals.margin}% margin`} />
    </section>

    {access.permissions.has("costs.manage") && <FeeSetting percent={r.feePercent} />}
    {sold.length > 0 && <section className="highlight-grid" aria-label="Highlights">
      <div className="highlight is-good"><ActionIcon name="trend-up" size={18} /><small>Best seller</small><strong>{byUnits[0].name}</strong><span>{fmtCount(byUnits[0].sold)} sold</span></div>
      <div className="highlight is-good"><ActionIcon name="coin" size={18} /><small>Most profit</small><strong>{byProfit[0].name}</strong><span>{formatPrice(byProfit[0].profit)}</span></div>
      <div className="highlight is-bad"><ActionIcon name="trend-down" size={18} /><small>Slowest seller</small><strong>{byUnits.at(-1)!.name}</strong><span>{fmtCount(byUnits.at(-1)!.sold)} sold</span></div>
      <div className="highlight is-bad"><ActionIcon name="alert" size={18} /><small>Least profit</small><strong>{byProfit.at(-1)!.name}</strong><span>{formatPrice(byProfit.at(-1)!.profit)}</span></div>
    </section>}

    {losses.length > 0 && <section className="report-panel is-alert" aria-labelledby="loss-h">
      <h2 id="loss-h"><ActionIcon name="alert" size={18} />Selling at a loss</h2>
      <p>The cost price is higher than the selling price. Every sale loses money.</p>
      <ul className="restock-list">{losses.map(x => <li key={x.id}><strong>{x.name}</strong><span className="stock-pill is-bad">Loses {formatPrice((x.costPrice ?? 0) - x.price)} per unit</span><small>sells {formatPrice(x.price)} · costs {formatPrice(x.costPrice ?? 0)}</small></li>)}</ul>
    </section>}

    <TrendChart title={r.monthly ? "Revenue and net profit by month" : "Revenue and net profit by day"} points={r.trend} monthly={r.monthly} showProfit />

    <div className="report-two">
      <BarList title="Units sold (most to least)" bars={byUnits.map(x => ({ label: x.name, sub: x.section, value: x.sold, display: fmtCount(x.sold) }))} />
      <BarList title="Profit by product (most to least)" bars={byProfit.map(x => ({ label: x.name, sub: x.margin === null ? x.section : `${x.margin}% margin`, value: x.profit, display: formatPrice(x.profit), tone: "gold" }))} />
    </div>
    <BarList title="Profit by section" bars={r.bySection.filter(s => s.revenue).sort((a, b) => b.profit - a.profit).map(s => ({ label: s.name, sub: `Revenue ${formatPrice(s.revenue)}`, value: s.profit, display: formatPrice(s.profit), tone: "good" }))} />

    <section className="report-panel" aria-labelledby="detail-h">
      <div className="report-panel-head"><h2 id="detail-h">Every product</h2><span>Product profit before courier charges</span></div>
      <div className="table-scroll"><table className="report-table">
        <thead><tr><th scope="col">Product</th><th scope="col" className="num">Sells for</th><th scope="col" className="num">Costs</th><th scope="col" className="num">Sold</th><th scope="col" className="num">Revenue</th><th scope="col" className="num">Profit</th><th scope="col" className="num">Margin</th></tr></thead>
        <tbody>{[...r.rows].sort((a, b) => b.profit - a.profit || a.name.localeCompare(b.name)).map(x => <tr key={x.id} className={x.loss ? "is-loss" : undefined}>
          <th scope="row">{x.name}<small> {x.section}</small></th>
          <td className="num">{formatPrice(x.price)}</td>
          <td className="num">{x.costPrice === null ? <span className="stock-pill is-warn">Not set</span> : formatPrice(x.costPrice)}</td>
          <td className="num">{fmtCount(x.sold)}</td><td className="num">{formatPrice(x.revenue)}</td>
          <td className={`num ${x.profit < 0 ? "is-negative" : ""}`}><strong>{formatPrice(x.profit)}</strong></td>
          <td className="num">{x.margin === null ? "–" : `${x.margin}%`}</td></tr>)}</tbody>
      </table></div>
    </section>
  </main>;
}
