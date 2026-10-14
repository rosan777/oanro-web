import "server-only";
import nodemailer from "nodemailer";
import { createAuth } from "./auth-factory";
import { getDb } from "./db";

export function authConfigured() {
  return process.env.OANRO_AUTH_ENABLED === "true" && Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL && process.env.SMTP_URL && process.env.AUTH_EMAIL_FROM);
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!authConfigured()) throw new Error("Authentication is not configured");
  if (instance) return instance;
  const baseURL = new URL(process.env.BETTER_AUTH_URL!);
  if (process.env.NODE_ENV === "production" && baseURL.protocol !== "https:") throw new Error("HTTPS required");
  if (process.env.BETTER_AUTH_SECRET!.length < 32) throw new Error("Auth secret must have at least 32 characters");
  const mail = nodemailer.createTransport(process.env.SMTP_URL!);
  instance = createAuth(getDb(), {
    baseURL: baseURL.origin, secret: process.env.BETTER_AUTH_SECRET!,
    google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET } : undefined,
    sendMail: async (to, subject, text) => { await mail.sendMail({ from: process.env.AUTH_EMAIL_FROM, to, subject, text }); },
  });
  return instance;
}
