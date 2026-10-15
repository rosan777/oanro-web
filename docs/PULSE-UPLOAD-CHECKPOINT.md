# Dashboard photo upload

Adds file selection to new-story and existing-story thumbnail controls, after the follow-up patch. JPG/PNG/WebP inputs up to 5 MB are decoded and resized in the browser to at most 640px, re-encoded as JPEG, and stripped of original metadata. The server validates encoding, raster signature and the existing 192 KiB snapshot limit before signing a preview. Owner session and origin checks precede processing. Explicit image approval and the existing publish/save transaction persist the snapshot and audit event. Selecting another image clears approval. No schema changes, dependencies or storage credentials.

Apply OANRO-photo-upload.patch once after the two previous patches. Test selecting a photo on an existing story, previewing, approving, saving and refreshing the storefront; also test a new story. Browser interaction and real database save still require Mac verification. No production records changed; GitHub writes still need approval.
