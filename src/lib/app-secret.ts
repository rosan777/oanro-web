/**
 * The server secret used to sign unsubscribe links and the assistant's "verified" cookie, and to salt visitor hashes.
 *
 * Normally this is BETTER_AUTH_SECRET. Only if it is missing do we use the old built-in development value that each
 * caller passes in. That fallback is NOT secret (it is in the source code), so in production we log one warning:
 * set BETTER_AUTH_SECRET before relying on any of those features. It deliberately does not throw, because the contact
 * and newsletter forms work without sign-in being switched on and must keep working.
 */
let warned = false;

export function appSecret(developmentFallback: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production" && !warned) {
    warned = true;
    console.warn("BETTER_AUTH_SECRET is not set: using a built-in development secret. Set it before relying on unsubscribe links or the assistant's bot check.");
  }
  return developmentFallback;
}
