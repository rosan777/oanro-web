import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins/two-factor";
import { APIError, createAuthMiddleware } from "better-auth/api";
import * as schema from "./db/schema";

type Settings = {
  baseURL: string; secret: string;
  google?: { clientId: string; clientSecret: string };
  sendMail: (to: string, subject: string, text: string) => Promise<void>;
};
/** At least one letter and one number. */
export const passwordMixed = (pw: string) => /\p{L}/u.test(pw) && /\d/.test(pw);
export function createAuth(db: Parameters<typeof drizzleAdapter>[0], settings: Settings) {
  return betterAuth({
    appName: "OANRO", baseURL: settings.baseURL, secret: settings.secret,
    trustedOrigins: [settings.baseURL],
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, minPasswordLength: 8, maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => settings.sendMail(user.email, "Reset your OANRO password", `Reset your password: ${url}\nIf you did not request this, ignore this email.`),
    },
    emailVerification: {
      sendOnSignUp: true, sendOnSignIn: true, autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => settings.sendMail(user.email, "Verify your OANRO email", `Verify your email: ${url}`),
    },
    socialProviders: settings.google ? { google: settings.google } : {},
    account: { accountLinking: { enabled: false } },
    session: { cookieCache: { enabled: false }, expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    // New passwords must mix letters and numbers (length 8–128 is checked above).
    hooks: {
      before: createAuthMiddleware(async ctx => {
        if (!["/sign-up/email", "/reset-password", "/change-password"].includes(ctx.path)) return;
        const body = (ctx.body ?? {}) as { password?: unknown; newPassword?: unknown };
        const pw = ctx.path === "/sign-up/email" ? body.password : body.newPassword;
        if (typeof pw === "string" && !passwordMixed(pw)) throw new APIError("BAD_REQUEST", { message: "PASSWORD_NOT_MIXED" });
      }),
    },
    // Authenticator-app codes (TOTP) for email+password sign-in. Google sign-ins rely on Google's own 2-Step Verification.
    plugins: [twoFactor({ issuer: "OANRO" })],
  });
}
