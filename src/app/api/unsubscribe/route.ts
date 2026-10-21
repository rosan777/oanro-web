import { catalogDb } from "@/lib/store-products";
import { unsubscribe, validUnsubscribe } from "@/lib/customer-mail";
export const runtime = "nodejs";
const page = (title: string, text: string, status = 200) => new Response(
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | OANRO</title></head><body style="font-family:Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 16px;color:#151515"><h1 style="font-size:22px">${title}</h1><p>${text}</p><p><a href="/" style="color:#1f513c">Back to OANRO</a></p></body></html>`,
  { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
/** Link at the bottom of "email everyone" messages. The signed token stops anyone unsubscribing other people. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = (url.searchParams.get("e") ?? "").trim().toLowerCase().slice(0, 200), token = url.searchParams.get("t") ?? "";
  if (!email || !validUnsubscribe(email, token)) return page("Link not valid", "This unsubscribe link is broken or incomplete. Reply to any OANRO email and we'll remove you by hand.", 400);
  await unsubscribe(catalogDb(), email);
  return page("You're unsubscribed", "You won't get OANRO announcement emails any more. Order and account emails (like payment confirmations) still arrive.");
}
