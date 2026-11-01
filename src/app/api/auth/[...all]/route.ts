import { authConfigured, getAuth } from "@/lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Every Better Auth endpoint (sign-in, sign-up, email links, 2FA…); 503 while sign-in is switched off. */
async function handle(request: Request) {
  if (!authConfigured())
    return Response.json(
      { error: "AUTH_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  return getAuth().handler(request);
}
export { handle as GET, handle as POST };
