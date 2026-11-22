"use client";
import { useEffect, useRef, useState } from "react";

// The catalog photo stays intact. Only the small decorative shelf gets a cutout.
function thumbnail(image: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas");
  const scale = 180 / Math.max(image.naturalWidth, image.naturalHeight);
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width < 4 || canvas.height < 4) return null;
  const w = canvas.width, h = canvas.height;
  ctx.drawImage(image, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  const data = pixels.data;
  if ([0, w - 1, (h - 1) * w, w * h - 1].every(i => data[i*4+3] === 0)) return image.src;
  // Only remove a plain studio backdrop. A gradient or lifestyle photo uses
  // the existing shelf artwork rather than guessing the product silhouette.
  const background = data.slice(0, 3);
  const isBackdrop = (i: number) =>
    data[i*4+3] < 8 || [0,1,2].every(c => Math.abs(data[i*4+c] - background[c]) < 20);
  for (let y = 0; y < h; y++) {
    if (!isBackdrop(y*w) || !isBackdrop(y*w+w-1)) return null;
  }
  for (let x = 0; x < w; x++) {
    if (!isBackdrop(x) || !isBackdrop((h-1)*w+x)) return null;
  }
  const queue = [0];
  const seen = new Uint8Array(w*h);
  seen[0] = 1;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    data[i*4+3] = 0;
    const neighbors = [i-w,i+w];
    if (i%w) neighbors.push(i-1);
    if (i%w < w-1) neighbors.push(i+1);
    for (const n of neighbors) {
      if (n < 0 || n >= w*h || seen[n] || !isBackdrop(n)) continue;
      seen[n] = 1;
      queue.push(n);
    }
  }
  if (queue.length > .9*w*h) return null;
  ctx.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

export function StoreObject({source, label, fallback, fallbackLabel}: {
  source?: string | null; label?: string; fallback: string; fallbackLabel: string;
}) {
  const ref = useRef<HTMLImageElement>(null);
  const [photo,setPhoto] = useState<{source:string; url:string} | null>(null);
  useEffect(() => {
    if (!source || !ref.current) return;
    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    const load = () => {
      image.onload = () => {
        try {
          const url = thumbnail(image);
          if (active && url) setPhoto({source,url});
        } catch { /* A remote photo may disallow canvas access. Keep the supplied artwork. */ }
      };
      image.src = source;
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { observer.disconnect(); load(); }
    }, {rootMargin:"200px"});
    observer.observe(ref.current);
    return () => { active = false; observer.disconnect(); image.onload = null; };
  }, [source]);
  const ready = photo && photo.source === source;
  return <img ref={ref} className="object" width={100} height={100} src={ready ? photo.url : fallback} alt={ready ? label || "" : fallbackLabel} />;
}
