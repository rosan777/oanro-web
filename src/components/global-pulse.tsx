"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useMotion } from "./experience";
import { PulseThumbnail } from "./pulse-thumbnail";
import { Localized } from "./locale";
import { formatDhaka } from "@/lib/dhaka-time";

export type PulseStory = { id: string; publisher: string; headline: string; url: string; publishedAt?: string | null; thumbnailUrl?: string | null };
export function GlobalPulse({ stories, autoScroll = true, speed = 28 }: { stories: PulseStory[]; autoScroll?: boolean; speed?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const blocked = useRef(false);
  const { allowed } = useMotion();
  const idleUntil = useRef(0);
  const touching = useRef(false);
  useEffect(() => {
    const node = track.current; const group = first.current;
    if (!node || !group || !autoScroll || !allowed || stories.length < 2) return;
    let frame = 0; let previous = 0; let position = node.scrollLeft;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(node);
    const run = (now: number) => {
      const delta = Math.min(now - previous || 0, 50); previous = now;
      const width = group.getBoundingClientRect().width;
      if (visible && !blocked.current && !touching.current && !node.matches(":focus-visible") && !node.querySelector(":focus-visible") && now > idleUntil.current && !document.hidden && width > 0) {
        position = (position + delta * Math.min(Math.max(speed, 1), 80) / 1000) % width;
        node.scrollLeft = position;
      } else position = node.scrollLeft;
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [allowed, autoScroll, speed, stories.length]);
  if (!stories.length) return null;
  const render = (copy: boolean) => stories.map(story => <a key={story.id} href={story.url} target="_blank" rel="noopener noreferrer" className="pulse-card" tabIndex={copy ? -1 : undefined}>
    <PulseThumbnail source={story.thumbnailUrl} />
    <span><strong>{story.publisher}</strong><span className="pulse-headline">{story.headline}</span>{story.publishedAt && <time dateTime={story.publishedAt}>{formatDhaka(story.publishedAt, "en", { year: true, time: false })}</time>}</span><ArrowUpRight size={17} aria-hidden="true" />
  </a>);
  return <section className="pulse-section" data-pulse-motion={allowed ? "on" : "off"} aria-labelledby="pulse-title"><div className="container pulse-heading"><div><p className="eyebrow"><span className="pulse-live" aria-hidden="true" /><Localized en="Global Pulse · Live" bn="গ্লোবাল পালস · লাইভ" /></p><h2 id="pulse-title"><Localized en="Around the world of technology." bn="প্রযুক্তি জগতের খবর।" /></h2></div></div>
    <div className="pulse-track" ref={track} role="region" aria-label="Global Pulse news" tabIndex={0} onMouseEnter={() => { blocked.current = true; }} onMouseLeave={() => { blocked.current = false; }} onPointerDown={() => { touching.current = true; }} onPointerUp={() => { touching.current = false; idleUntil.current = performance.now() + 1500; }} onPointerCancel={() => { touching.current = false; }} onPointerLeave={() => { touching.current = false; }} onWheel={() => { idleUntil.current = performance.now() + 1500; }}><div className="pulse-group" ref={first}>{render(false)}</div>{stories.length > 1 && <div className="pulse-group" aria-hidden="true">{render(true)}</div>}</div>
  </section>;
}

/** Admin → Website content → Contact & social decides where the news strip shows: every page, or only the services (Studio) pages. */
export function PlacedPulse({ stories, where }: { stories: PulseStory[]; where: "everywhere" | "services" }) {
  const path = usePathname() ?? "/";
  if (!stories.length || (where === "services" && !/^\/(bn\/)?services(\/|$)/.test(path))) return null;
  return <GlobalPulse stories={stories} />;
}
