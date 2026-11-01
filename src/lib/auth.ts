// The app's single authentication instance, built from environment variables.
// Sign-in exists only when OANRO_AUTH_ENABLED is "true" and every required variable is set.

import "server-only";
import nodemailer from "nodemailer";
import { createAuth } from "./auth-factory";
import { getDb } from "./db";
import { checkMailDomain } from "./email-domain";

/** True when sign-in is switched on and every variable it needs is present. */
export function authConfigured() {
  return (
    process.env.OANRO_AUTH_ENABLED === "true" &&
    Boolean(
      process.env.DATABASE_URL &&
      process.env.BETTER_AUTH_SECRET &&
      process.env.BETTER_AUTH_URL &&
      process.env.SMTP_URL &&
      process.env.AUTH_EMAIL_FROM,
    )
  );
}

// Created on first use and then reused for the life of the server process.

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!authConfigured()) throw new Error("Authentication is not configured");
  if (instance) return instance;

  // Refuse unsafe setups: production must use HTTPS and the secret must be long enough.

  const baseURL = new URL(process.env.BETTER_AUTH_URL!);
  if (process.env.NODE_ENV === "production" && baseURL.protocol !== "https:")
    throw new Error("HTTPS required");
  if (process.env.BETTER_AUTH_SECRET!.length < 32)
    throw new Error("Auth secret must have at least 32 characters");
  const mail = nodemailer.createTransport(process.env.SMTP_URL!);
  instance = createAuth(getDb(), {
    baseURL: baseURL.origin,
    secret: process.env.BETTER_AUTH_SECRET!,
    google:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
        : undefined,
    checkEmailDomain: domain => checkMailDomain(domain),
    sendMail: async (to, subject, text) => {
      await mail.sendMail({ from: process.env.AUTH_EMAIL_FROM, to, subject, text });
    },
  });
  return instance;
}
