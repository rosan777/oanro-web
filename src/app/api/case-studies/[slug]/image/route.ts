import { publishedCaseStudyImage } from "@/lib/case-study-store";
import { catalogDb } from "@/lib/store-products";
import { imageData } from "@/lib/pulse-thumbnail";
import { slugPattern } from "@/lib/product-input";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Photos of published case studies only. URLs carry ?v=<updatedAt> so caching is safe. */
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  };
  const missing = () =>
    new Response(null, { status: 404, headers: { ...headers, "Cache-Control": "no-store" } });
  if (!slugPattern.test(slug) || slug.length > 60 || !process.env.DATABASE_URL) return missing();
  try {
    const match = (await publishedCaseStudyImage(catalogDb(), slug))?.match(
      /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+=*)$/,
    );
    if (!match) return missing();
    const bytes = Buffer.from(match[2], "base64");
    imageData(bytes, match[1]); // re-check the bytes really are that image type
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": match[1],
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return missing();
  }
}
