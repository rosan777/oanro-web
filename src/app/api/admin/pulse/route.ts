// Admin API for Global Pulse news stories (needs pulse.manage). Thumbnails are only saved after the
// owner has seen them: preview/upload returns a signed token, and saving must present that token.

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { authorize } from "@/lib/admin-api";
import { getDb } from "@/lib/db";
import { auditEvent, pulseStory } from "@/lib/db/schema";
import { validateUploadedImage } from "@/lib/pulse-upload";
import {
  publicUrl as validPublicUrl,
  discoverThumbnail,
  signPreview,
  readPreview,
  readObject,
} from "@/lib/pulse-thumbnail";
import { storefrontChanged } from "@/lib/storefront-cache";
export const runtime = "nodejs";

/** The caller's user id when they may manage stories, otherwise null. */
async function owner(request: Request) {
  return (await authorize(request, "pulse.manage"))?.userId ?? null;
}

/**
 * Three actions: "upload" (check an uploaded thumbnail), "preview" (fetch the story page's own
 * thumbnail), or, with no action, publish a story after the owner confirmed the rights.
 */
export async function POST(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  let data: Record<string, unknown>;
  try {
    data = await readObject(request);
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (data.action === "upload") {
    if (!validPublicUrl(data.url)) return Response.json({ error: "INVALID_URL" }, { status: 400 });
    try {
      const thumbnailUrl = validateUploadedImage(data.image);
      return Response.json(
        {
          thumbnailUrl,
          previewToken: signPreview(
            ownerId,
            data.url,
            thumbnailUrl,
            process.env.BETTER_AUTH_SECRET!,
          ),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json({ error: "INVALID_IMAGE" }, { status: 400 });
    }
  }
  if (data.action === "preview") {
    if (!validPublicUrl(data.url)) return Response.json({ error: "INVALID_URL" }, { status: 400 });
    try {
      const thumbnailUrl = await discoverThumbnail(data.url);
      if (!thumbnailUrl) return Response.json({ error: "NO_THUMBNAIL" }, { status: 422 });
      return Response.json(
        {
          thumbnailUrl,
          previewToken: signPreview(
            ownerId,
            data.url,
            thumbnailUrl,
            process.env.BETTER_AUTH_SECRET!,
          ),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return Response.json({ error: "PREVIEW_UNAVAILABLE" }, { status: 422 });
    }
  }
  if (
    typeof data.publisher !== "string" ||
    !data.publisher.trim() ||
    data.publisher.length > 80 ||
    typeof data.headline !== "string" ||
    !data.headline.trim() ||
    data.headline.length > 220 ||
    !validPublicUrl(data.url) ||
    data.rightsConfirmed !== true ||
    data.visible !== true ||
    data.thumbnailUrl != null
  )
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Publishing: a thumbnail is only stored when the owner approved it and the signed preview token is valid.

  let thumbnailUrl: string | null = null;
  if (data.thumbnailApproved === true) {
    try {
      thumbnailUrl = readPreview(
        data.previewToken,
        ownerId,
        data.url as string,
        process.env.BETTER_AUTH_SECRET!,
      );
    } catch {
      return Response.json({ error: "PREVIEW_EXPIRED_OR_INVALID" }, { status: 400 });
    }
  } else if (data.previewToken != null)
    return Response.json({ error: "APPROVAL_REQUIRED" }, { status: 400 });
  const id = randomUUID();
  try {
    await getDb().transaction(async tx => {
      await tx.insert(pulseStory).values({
        id,
        publisher: (data.publisher as string).trim(),
        headline: (data.headline as string).trim(),
        url: data.url as string,
        thumbnailUrl,
        approvedBy: ownerId,
        visible: true,
        rightsConfirmed: true,
      });
      await tx.insert(auditEvent).values({
        id: randomUUID(),
        actorId: ownerId,
        action: "pulse.publish",
        targetId: id,
        reason: thumbnailUrl
          ? "Owner reviewed source, rights and thumbnail snapshot"
          : "Manual source and rights reviewed",
      });
    });
    storefrontChanged();
    return Response.json({ id }, { status: 201 });
  } catch {
    return Response.json({ error: "DUPLICATE_OR_UNAVAILABLE" }, { status: 409 });
  }
}

/** Approve a thumbnail for an existing story, archive or restore a story, or show/hide it. */
export async function PATCH(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  let data: Record<string, unknown>;
  try {
    data = await readObject(request);
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (data.action === "thumbnail") {
    if (
      typeof data.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(data.id) ||
      data.thumbnailApproved !== true
    )
      return Response.json({ error: "APPROVAL_REQUIRED" }, { status: 400 });
    try {
      await getDb().transaction(async tx => {
        const [story] = await tx
          .select({ url: pulseStory.url, rightsConfirmed: pulseStory.rightsConfirmed })
          .from(pulseStory)
          .where(eq(pulseStory.id, data.id as string))
          .limit(1);
        if (!story?.rightsConfirmed) throw new Error("NOT_FOUND");
        const thumbnailUrl = readPreview(
          data.previewToken,
          ownerId,
          story.url,
          process.env.BETTER_AUTH_SECRET!,
        );
        await tx
          .update(pulseStory)
          .set({ thumbnailUrl })
          .where(eq(pulseStory.id, data.id as string));
        await tx.insert(auditEvent).values({
          id: randomUUID(),
          actorId: ownerId,
          action: "pulse.thumbnail",
          targetId: data.id as string,
          reason: "Owner reviewed thumbnail snapshot and confirmed image reuse permission",
        });
      });
      storefrontChanged();
      return Response.json({ id: data.id });
    } catch {
      return Response.json({ error: "PREVIEW_EXPIRED_OR_UNAVAILABLE" }, { status: 400 });
    }
  }
  if (
    (data.action === "archive" || data.action === "restore") &&
    typeof data.id === "string" &&
    /^[0-9a-f-]{36}$/.test(data.id)
  ) {
    const archive = data.action === "archive";
    try {
      await getDb().transaction(async tx => {
        // Archiving also hides the story; restoring brings it back hidden, so the owner decides when it shows again.
        const changed = await tx
          .update(pulseStory)
          .set({ archivedAt: archive ? new Date() : null, visible: false })
          .where(eq(pulseStory.id, data.id as string))
          .returning({ headline: pulseStory.headline });
        if (!changed.length) throw new Error("NOT_FOUND");
        await tx.insert(auditEvent).values({
          id: randomUUID(),
          actorId: ownerId,
          action: archive ? "pulse.archive" : "pulse.restore",
          targetId: data.id as string,
          reason: changed[0].headline.slice(0, 200),
        });
      });
      storefrontChanged();
      return Response.json({ id: data.id, archived: archive });
    } catch {
      return Response.json({ error: "NOT_FOUND_OR_UNAVAILABLE" }, { status: 404 });
    }
  }
  if (
    typeof data.id !== "string" ||
    !/^[0-9a-f-]{36}$/.test(data.id) ||
    typeof data.visible !== "boolean"
  )
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  try {
    await getDb().transaction(async tx => {
      const changed = await tx
        .update(pulseStory)
        .set({ visible: data.visible as boolean })
        .where(eq(pulseStory.id, data.id as string))
        .returning({ id: pulseStory.id });
      if (!changed.length) throw new Error("NOT_FOUND");
      await tx.insert(auditEvent).values({
        id: randomUUID(),
        actorId: ownerId,
        action: data.visible ? "pulse.show" : "pulse.hide",
        targetId: data.id as string,
        reason: "Owner editorial decision",
      });
    });
    storefrontChanged();
    return Response.json({ id: data.id, visible: data.visible });
  } catch {
    return Response.json({ error: "NOT_FOUND_OR_UNAVAILABLE" }, { status: 404 });
  }
}

/** Permanently delete a story (needs confirmDelete: true); the activity log keeps the headline. */
export async function DELETE(request: Request) {
  const ownerId = await owner(request);
  if (!ownerId) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  let data: Record<string, unknown>;
  try {
    data = await readObject(request, 8192);
  } catch {
    return Response.json({ error: "INVALID_INPUT" }, { status: 400 });
  }
  if (
    typeof data.id !== "string" ||
    !/^[0-9a-f-]{36}$/.test(data.id) ||
    data.confirmDelete !== true
  )
    return Response.json({ error: "CONFIRMATION_REQUIRED" }, { status: 400 });
  try {
    const deleted = await getDb().transaction(async tx => {
      const [story] = await tx
        .delete(pulseStory)
        .where(eq(pulseStory.id, data.id as string))
        .returning({ id: pulseStory.id, headline: pulseStory.headline });
      if (!story) return false;
      await tx.insert(auditEvent).values({
        id: randomUUID(),
        actorId: ownerId,
        action: "pulse.delete",
        targetId: story.id,
        reason: `Owner confirmed permanent deletion: ${story.headline}`,
      });
      return true;
    });
    if (!deleted) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    storefrontChanged();
    return Response.json({ id: data.id, deleted: true });
  } catch {
    return Response.json({ error: "DELETE_UNAVAILABLE" }, { status: 503 });
  }
}
