"use client";
import type { ChangeEvent } from "react";

type Preview = { thumbnailUrl: string; previewToken: string };
export function PulseUpload({ disabled, getUrl, onStart, onReady, onError, onFinish }: {
  disabled: boolean; getUrl: () => string; onStart: () => void;
  onReady: (preview: Preview, url: string) => void; onError: (message: string) => void; onFinish: () => void;
}) {
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    onStart();
    try {
      const url = getUrl();
      if (!url.startsWith("https://")) throw new Error("Enter the HTTPS article URL before selecting a photo.");
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WebP photo, up to 5 MB.");
      const bitmap = await createImageBitmap(file);
      let image: string;
      try {
        const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Photo processing is unavailable in this browser.");
        context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        image = canvas.toDataURL("image/jpeg", 0.82);
        if (image.length > 260000) image = canvas.toDataURL("image/jpeg", 0.55);
        if (image.length > 260000) throw new Error("This photo is too detailed. Try a smaller image.");
      } finally { bitmap.close(); }
      const response = await fetch("/api/admin/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "upload", url, image }) });
      if (!response.ok) throw new Error("Upload failed. Check your sign-in and try again.");
      onReady(await response.json() as Preview, url);
    } catch (error) { onError(error instanceof Error ? error.message : "Could not process this photo."); }
    finally { onFinish(); }
  }
  return <label>Upload your own thumbnail<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={select} /><small>JPG, PNG or WebP · up to 5 MB. Resized automatically. Preview and approve before saving.</small></label>;
}
