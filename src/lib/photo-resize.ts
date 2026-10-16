// Browser-side photo preparation: decode, downscale, flatten onto white and re-encode as JPEG.
// Re-encoding strips original metadata (EXIF/GPS). The server re-validates the result.
export async function resizePhoto(file: File, maxEdge = 800): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Choose a JPG, PNG or WebP photo, up to 5 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Photo processing is unavailable in this browser.");
    context.fillStyle = "#ffffff"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.65, 0.5]) {
      const image = canvas.toDataURL("image/jpeg", quality);
      if (image.length <= 260000) return image;
    }
    throw new Error("This photo is too detailed. Try a smaller image.");
  } finally { bitmap.close(); }
}
