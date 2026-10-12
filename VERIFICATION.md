# Verification — OANRO v0.2.0

Checked on 12 October 2026 in the development environment.

| Check | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript | Passed |
| Production build using `next build --webpack` | Passed; production BUILD_ID generated |
| Homepage at 320, 390, 768 and 1440 CSS pixels | No horizontal page overflow |
| Search → product page | Passed |
| Add to bag, quantity update, persistence after reload | Passed |
| Product video metadata | Passed with WebM source; MP4 fallback bundled |
| WebGL canvas | Nonblank rendered pixels verified |
| Manual 3D rotation | Changes rendered canvas |
| Product conveyor | Automatic movement and pause verified |
| Mobile menu → product page | Passed |
| Reduced-motion preference | Stops automatic conveyor motion |
| Product API | HTTP 200 |
| Unknown product | HTTP 404 |
| Browser page errors during smoke test | None |

Screenshots were visually inspected for mobile product layout and the interactive model. Full-page screenshots can place sticky navigation at the current scroll position and do not force offscreen lazy-loaded images to load; these are capture limitations, not evidence that images are missing.

The tests identified and corrected fractional-scroll rounding in the automatic conveyor. A second video format was added for browsers without H.264 decoding.

Limitations: Chromium testing is not a substitute for testing real Safari/iOS, Android devices, different GPUs or assistive technology. Turbopack verification was blocked by worker socket restrictions in this environment; the supported webpack production build succeeded. No real transactions, backend admin, database, authentication or payment integration are included or claimed tested.

The test scripts are supplied for reference. They expect a local server at `http://127.0.0.1:3100`, Playwright available to Node, and a Chromium binary via `CHROMIUM_PATH`. Their default browser path belongs to the verification environment; set your own path when rerunning locally.
