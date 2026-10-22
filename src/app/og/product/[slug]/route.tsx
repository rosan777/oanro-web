import { ImageResponse } from "next/og";
import { getStoreProducts } from "@/lib/store-products";
import { absoluteUrl } from "@/lib/seo";
export const runtime = "nodejs";

/** Read a photo for the share card. Only PNG/JPEG can be drawn here; other formats fall back to a text-only card. */
async function photo(src: string) {
  try {
    const res = await fetch(absoluteUrl(src), { signal: AbortSignal.timeout(4000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g)/.test(type)) return null;
    return `data:${type.split(";")[0]};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch { return null; }
}

/** 1200×630 link preview for Facebook, WhatsApp and Messenger: product photo, name, price and the OANRO mark. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await getStoreProducts()).find(x => x.slug === slug);
  if (!p) return new Response("Not found", { status: 404 });
  const img = p.image ? await photo(p.image) : null;
  const sale = p.compareAt && p.compareAt > p.price;
  return new ImageResponse(
    <div style={{ width: 1200, height: 630, display: "flex", background: "#07090a", color: "#f4f6f5", fontFamily: "sans-serif" }}>
      {img && <img src={img} alt="" width={630} height={630} style={{ width: 630, height: 630, objectFit: "cover" }} />}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 700, letterSpacing: 4 }}>
          <svg width="46" height="46" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#3ddc97" strokeWidth="7" /></svg>OANRO</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: img ? 52 : 68, fontWeight: 700, lineHeight: 1.1 }}>{p.name}</div>
          {p.tagline && <div style={{ fontSize: 28, color: "#a9b3ae", lineHeight: 1.3 }}>{p.tagline.slice(0, 90)}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
          <div style={{ fontSize: 56, fontWeight: 700, color: "#3ddc97" }}>{`Tk ${p.price.toLocaleString("en-US")}`}</div>
          {sale && <div style={{ fontSize: 32, color: "#7d8783", textDecoration: "line-through" }}>{`Tk ${p.compareAt!.toLocaleString("en-US")}`}</div>}
          <div style={{ fontSize: 24, color: "#a9b3ae", marginLeft: "auto" }}>oanro.com</div>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=0, s-maxage=86400" } });
}
