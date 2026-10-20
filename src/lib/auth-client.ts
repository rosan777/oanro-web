"use client";
import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
// The sign-in form shows the code step itself, so the plugin must not navigate anywhere on its own.
export const authClient = createAuthClient({ plugins: [twoFactorClient({ onTwoFactorRedirect: () => {} })] });
