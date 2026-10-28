# JUNO visibility fix — 29 October 2026

## Findings against GitHub main (6c404bc)

The assistant was introduced in 15568e2. The older local checkout (5784f4e) had no assistant. Production served the assistant API but returned 403, and the signed-in `/admin/assistant` page crashed. The connected database had migrations through 0017 but none of the seven assistant tables. Migration 0018 has now been applied successfully; it only adds assistant tables, constraints and indexes.

Previously an absent ASSISTANT_ENABLED variable disabled the feature even when the admin checkbox was on. The admin checkbox was also below usage tables, under Insights.

## Current control

- Admin → Website → **JUNO bot · On / Off** → **Show JUNO on the website / বট চালু** → Save settings.
- No hosting variable is needed for ordinary on/off control. An explicitly disabled ASSISTANT_ENABLED value remains an emergency stop and is reported in admin.
- A fresh database starts with the bot off until the owner saves it on. Existing explicitly saved settings are preserved.
- Missing database settings fail closed. The admin page explains an unavailable settings database instead of crashing there.
- Saving invalidates the storefront cache. The new visibility is applied on the next page load; already-open chat panels may remain visible, but requests use the server-side switch.
- Groq/Cloudflare credentials remain server-only. Without a provider key, local FAQ, delivery rules, product search and human-help fallbacks remain available; generated AI replies and Groq transcription require a key.

This supersedes the old environment-only launch instructions in assistant-go-live.md and assistant-setup.md. Their historical test records remain unchanged.

## Validation

Production build, TypeScript and lint passed (three pre-existing lint warnings). Full suite: 72 of 73 passed, including assistant tests and two new regressions for persisted on/off and the optional emergency stop. The existing RBAC role-template mismatch is outside this change and was already recorded in the previous release notes.
