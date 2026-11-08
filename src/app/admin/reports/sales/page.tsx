import { adminTextFor } from "@/lib/admin-text-server";
import { requestLocale } from "@/lib/request-locale";
import { Localized } from "@/components/locale";
import { requireAdminPage } from "@/lib/admin-guard";
import { catalogDb } from "@/lib/store-products";
import { parseRange, salesReport } from "@/lib/report-store";
import { formatPrice } from "@/lib/catalog";
import { AdminBack } from "@/components/admin-nav";
import { ActionIcon } from "@/components/action-icon";
import { CsvButton } from "@/components/csv-button";
import {
  BarList,
  RangeTabs,
  SplitBar,
  StatCard,
  TrendChart,
  fmtCount,
} from "@/components/report-charts";
export const dynamic = "force-dynamic";

/** Stock label and colour for a product row. */
const stockText = (stock: number | null, low: number) =>
  stock === null
    ? ["Not counted", "muted"]
    : stock === 0
      ? ["Out of stock", "bad"]
      : stock <= low
        ? [`${stock} left · low`, "warn"]
        : [`${stock} left`, "good"];
export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const tr = adminTextFor((await requestLocale()).locale);
  await requireAdminPage("reports.read");
  const range = parseRange((await searchParams).range);
  const r = await salesReport(catalogDb(), range);

  // Rows for the CSV download (one line per product).

  const all = r.sections.flatMap(s => s.rows.map(row => ({ ...row, section: s.name })));
  const csv: (string | number | null)[][] = [
    [
      "Section",
      "Product",
      "Price (BDT)",
      "Sold",
      "Returned",
      "Reserved (awaiting payment check)",
      "Stock left",
      "Revenue (BDT)",
    ],
    ...all.map(x => [
      x.section,
      x.name,
      x.price,
      x.sold,
      x.returned,
      x.reserved,
      x.stock,
      x.revenue,
    ]),
  ];
  return (
    <main id="main-content" className="container auth-page admin-report">
      <AdminBack />
      <header className="report-head">
        <div>
          <p className="eyebrow">{tr("Report")}</p>
          <h1>
            <Localized en="Sales & stock" bn="বিক্রি ও স্টক" />
          </h1>
          <p>
            What sold, what is waiting for a payment check, and what needs restocking. Counts only
            approved payments; returned orders are excluded from sales.
          </p>
        </div>
        <CsvButton filename={`oanro-sales-${range}.csv`} rows={csv} />
      </header>
      <RangeTabs
        base="/admin/reports/sales"
        current={range}
        locale={(await requestLocale()).locale}
      />

      {/* Summary cards, compared with the previous period. */}
      <section className="stat-grid" aria-label={tr("Summary")}>
        <StatCard
          icon="coin"
          tone="brand"
          label={tr("Revenue (products)")}
          value={formatPrice(r.totals.revenue)}
          now={r.totals.revenue}
          before={r.previous?.revenue}
          hint={`+ ${formatPrice(r.totals.deliveryIncome)} delivery charges`}
        />
        <StatCard
          icon="receipt"
          label={tr("Paid orders")}
          value={fmtCount(r.totals.orders)}
          now={r.totals.orders}
          before={r.previous?.orders}
        />
        <StatCard
          icon="box"
          label={tr("Units sold")}
          value={fmtCount(r.totals.units)}
          now={r.totals.units}
          before={r.previous?.units}
        />
        <StatCard
          icon="wallet"
          label={tr("Cash with courier (COD)")}
          value={formatPrice(r.pendingCod.amount)}
          hint={`${r.pendingCod.orders} order${r.pendingCod.orders === 1 ? "" : "s"} · counts as revenue once received`}
        />
        <StatCard
          icon="alert"
          tone={r.restock.length ? "bad" : "good"}
          label={tr("Need restock")}
          value={fmtCount(r.restock.length)}
          hint={`${fmtCount(r.totals.reservedUnits)} units reserved · ${fmtCount(r.totals.returnedUnits)} returned`}
        />
      </section>

      {/* Products that are out of stock or at their alert level. */}
      {r.restock.length > 0 && (
        <section className="report-panel is-alert" aria-labelledby="restock-h">
          <h2 id="restock-h">
            <ActionIcon name="alert" size={18} />
            {tr("Restock needed")}
          </h2>
          <p>
            These products are at or below their alert level. Set the level per product in its edit
            form (default 5).
          </p>
          <ul className="restock-list">
            {r.restock.map(x => (
              <li key={x.id}>
                <strong>{x.name}</strong>
                <span className={`stock-pill is-${x.stock === 0 ? "bad" : "warn"}`}>
                  {x.stock === 0 ? "Out of stock" : `${x.stock} left`}
                </span>
                <small>
                  alert at {x.lowStockAt}
                  {x.reserved ? ` · ${x.reserved} reserved` : ""}
                </small>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="report-two">
        <TrendChart
          title={r.monthly ? "Revenue by month" : "Revenue by day"}
          points={r.trend}
          monthly={r.monthly}
        />
        <SplitBar
          title={tr("Payments received")}
          parts={r.methods.map(m => ({
            label: m.method === "bkash" ? "bKash" : m.method === "nagad" ? "Nagad" : "COD cash",
            value: m.amount,
            display: `${formatPrice(m.amount)} (${m.orders} order${m.orders === 1 ? "" : "s"})`,
            tone: m.method,
          }))}
        />
      </div>

      <BarList
        title={tr("Units sold by product (best to worst)")}
        bars={[...all]
          .filter(x => !x.archived)
          .sort((a, b) => b.sold - a.sold)
          .slice(0, 12)
          .map(x => ({
            label: x.name,
            sub: x.section,
            value: x.sold,
            display: `${fmtCount(x.sold)} sold`,
          }))}
      />

      {/* One table per section, then the services table. */}
      {r.sections.map(s => (
        <section key={s.id} className="report-panel" aria-labelledby={`sec-${s.id}`}>
          <div className="report-panel-head">
            <h2 id={`sec-${s.id}`}>{s.name}</h2>
            <span>
              {fmtCount(s.sold)} sold · {formatPrice(s.revenue)}
            </span>
          </div>
          <div className="table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">{tr("Product")}</th>
                  <th scope="col" className="num">
                    {tr("Price")}
                  </th>
                  <th scope="col" className="num">
                    {tr("Sold")}
                  </th>
                  <th scope="col" className="num">
                    {tr("Reserved")}
                  </th>
                  <th scope="col" className="num">
                    {tr("Returned")}
                  </th>
                  <th scope="col">{tr("Stock")}</th>
                  <th scope="col" className="num">
                    {tr("Revenue")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {s.rows.map(x => {
                  const [text, tone] = stockText(x.stock, x.lowStockAt);
                  return (
                    <tr key={x.id} className={x.archived ? "is-archived" : undefined}>
                      <th scope="row">
                        {x.name}
                        {x.archived && <small> (archived)</small>}
                        {x.status !== "published" && !x.archived && <small> ({x.status})</small>}
                      </th>
                      <td className="num">{formatPrice(x.price)}</td>
                      <td className="num">
                        <strong>{fmtCount(x.sold)}</strong>
                      </td>
                      <td className="num">{fmtCount(x.reserved)}</td>
                      <td className="num">{fmtCount(x.returned)}</td>
                      <td>
                        <span className={`stock-pill is-${tone}`}>{text}</span>
                      </td>
                      <td className="num">{formatPrice(x.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <section className="report-panel" aria-labelledby="svc-h">
        <div className="report-panel-head">
          <h2 id="svc-h">
            <ActionIcon name="inquiry" size={18} />
            {tr("Services")}
          </h2>
          <span>{tr("Quoted by inquiry, not sold online")}</span>
        </div>
        {!r.services.length ? (
          <p className="report-empty">{tr("No service inquiries in this period.")}</p>
        ) : (
          <div className="table-scroll">
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">{tr("Service")}</th>
                  <th scope="col" className="num">
                    {tr("Inquiries")}
                  </th>
                  <th scope="col" className="num">
                    {tr("Won")}
                  </th>
                  <th scope="col" className="num">
                    {tr("Win rate")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {r.services.map(x => (
                  <tr key={x.slug}>
                    <th scope="row">{x.title}</th>
                    <td className="num">{x.inquiries}</td>
                    <td className="num">{x.won}</td>
                    <td className="num">
                      {x.inquiries ? Math.round((x.won / x.inquiries) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
