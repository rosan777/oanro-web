# Global Pulse reviewed thumbnails

Patch baseline: 72eb3ed on work/global-pulse-thumbnail.

## Included

- Larger thumbnail area: 110x90 desktop, 90x80 mobile; wider glass cards, hover/focus sheen and lift. Existing titles retained; section play/pause/arrow controls removed. Hover pauses; leaving resumes. Keyboard-visible focus pauses; touch and wheel interaction briefly suspend automatic movement. Global motion switch and reduced-motion preference disable effects.
- Owner-only Find thumbnail preview action on the existing pulse API. Article metadata supports Open Graph and Twitter image keys. It fetches metadata; it does not discover or automatically publish news stories.
- Owner must explicitly approve the displayed image. Approval expires after ten minutes and is bound by HMAC to the owner, article URL and exact image bytes. Changing the article URL clears the preview and approval.
- Approved raster snapshots are stored in the existing thumbnail_url text column as bounded data URLs. No migration, new package, cloud storage credential or remote image allowlist required. This is a small editorial-stage storage solution; migrate to object storage before large-volume ingestion.
- Public image endpoint serves only visible, rights-confirmed stories with no-store/nosniff headers. Public cards receive local image endpoint URLs rather than inline image payloads. Hidden images become unavailable on subsequent requests.
- Missing, invalid, too-large or blocked images use OANRO fallback. Existing stories can receive a reviewed image through Find / replace thumbnail; no duplicate publication is required.

## Fetch boundaries

HTTPS domain names only; no credentials, IP literals or alternate ports. DNS answers are checked against non-public IPv4 ranges and the connection is pinned to a checked IP, retaining original TLS servername and Host. IPv6-only sites fall back. Every redirect is revalidated, with at most three redirects per resource. Total preview budget ten seconds, HTML limit 6 MiB, image limit 192 KiB. Only JPEG/PNG/WebP with matching signatures; SVG/GIF/AVIF, compressed HTTP responses and JavaScript-only metadata are not supported. Some publishers will therefore have no preview. No HTML is rendered. No browser requests are made to publisher image URLs.

## Verification

Four targeted unit tests cover URL/IP rejection, metadata extraction, signed approval binding/tampering/expiry, image signatures and actual request body size limits.

Run after applying:

    npm run typecheck
    npm run lint
    node --import tsx --test tests/pulse-thumbnail.test.ts
    npm run test:foundation
    npm run build

Manual: sign in as owner, enter a new article, Find thumbnail preview, inspect and approve, confirm rights, publish. Enable Global Pulse and refresh storefront. Also test publishing without thumbnail approval, changing URL after preview, keyboard controls, image failure fallback, mobile viewport and reduced motion. A shared production database means publishing locally can change live content.

Use Find / replace thumbnail on an existing story, approve and Save approved thumbnail. Hide/Show is reversible. Delete permanently requires confirmation and removes the row and stored snapshot in the same transaction as an audit entry; append-only audit records remain. Scheduled feeds and general story text editing remain separate work.

Rollback code before publishing with images: git apply -R OANRO-global-pulse.patch. After any real publication retain audit records; hide a story through admin rather than deleting records.

## CNN reproduction

The supplied CNN Istanbul Grand Bazaar article returned 4,809,952 bytes of HTML and includes an og:image URL. Its JPEG thumbnail returned 122,260 bytes. The previous 1 MiB HTML cap rejected the page before parsing. The bounded cap is now 6 MiB; the 192 KiB image cap remains. This does not guarantee every publisher or image will be supported.
