import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "./db/schema";

type Settings = {
  baseURL: string; secret: string;
  google?: { clientId: string; clientSecret: string };
  sendMail: (to: string, subject: string, text: string) => Promise<void>;
};
export function createAuth(db: Parameters<typeof drizzleAdapter>[0], settings: Settings) {
  return betterAuth({
    appName: "OANRO", baseURL: settings.baseURL, secret: settings.secret,
    trustedOrigins: [settings.baseURL],
    database: drizzleAdapter(db, { provider: "pg", schema, transaction: true }),
    emailAndPassword: {
      enabled: true, requireEmailVerification: true, minPasswordLength: 12, maxPasswordLength: 128,
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
  });
}
