// drizzle-kit settings: npm run db:generate writes migrations from src/lib/db/schema.ts into drizzle/,
// and npm run db:migrate applies them to the DATABASE_URL in .env.local.

import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
loadEnvConfig(process.cwd());
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: false,
});
