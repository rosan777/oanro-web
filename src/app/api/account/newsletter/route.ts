import { eq } from "drizzle-orm";
import { accountError, accountSession } from "@/lib/account-api";
import { noStore } from "@/lib/admin-api";
import { newsletterSubscriber } from "@/lib/db/schema";
import { newsletterUnsubscribe, subscribe } from "@/lib/marketing";
import { readObject } from "@/lib/pulse-thumbnail";
import { catalogDb } from "@/lib/store-products";
export const runtime = "nodejs";

// Account → Preferences: the signed-in customer's own newsletter subscription (their account email only).

export async function GET(request: Request) {
  const auth = await accountSession(request, { write: false });
  if ("response" in auth) return auth.response;
  const [row] = await catalogDb()
    .select({ off: newsletterSubscriber.unsubscribedAt })
    .from(newsletterSubscriber)
    .where(eq(newsletterSubscriber.email, auth.session.user.email.toLowerCase()))
    .limit(1)
    .catch(() => []);
  return Response.json({ subscribed: Boolean(row && !row.off) }, { headers: noStore });
}

export async function POST(request: Request) {
  const auth = await accountSession(request, { write: true });
  if ("response" in auth) return auth.response;
  try {
    const data = await readObject(request, 500);
    const email = auth.session.user.email;
    if (data.subscribe === true)
      await subscribe(catalogDb(), email, data.locale === "bn" ? "bn" : "en", "account");
    else await newsletterUnsubscribe(catalogDb(), email);
    return Response.json({ subscribed: data.subscribe === true }, { headers: noStore });
  } catch (error) {
    return accountError(error);
  }
}
