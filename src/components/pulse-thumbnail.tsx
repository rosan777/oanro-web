"use client";
import { useState } from "react";

export function PulseThumbnail({ source, onLoaded }: { source?: string | null; onLoaded?: () => void }) {
  const [failed, setFailed] = useState<string | null>(null);
  const allowed = source && (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(source) || /^\/api\/pulse\/[0-9a-f-]{36}\/thumbnail$/.test(source));
  return <span className="pulse-thumbnail" aria-hidden="true">
    {allowed && failed !== source ? (
      // Reviewed, bounded raster snapshot. No third-party request or image optimizer needed.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={source} alt="" width={110} height={90} loading="lazy" decoding="async" onLoad={onLoaded} onError={() => setFailed(source)} />
    ) : "OANRO"}
  </span>;
}
