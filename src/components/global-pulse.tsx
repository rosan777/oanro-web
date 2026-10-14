"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { useMotion } from "./experience";
import { Localized } from "./locale";

export type PulseStory = { id: string; publisher: string; headline: string; url: string; publishedAt?: string | null; thumbnailUrl?: string | null };
export function GlobalPulse({ stories, autoScroll = true, speed = 28 }: { stories: PulseStory[]; autoScroll?: boolean; speed?: number }) {
  const track = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLDivElement>(null);
  const blocked = useRef(false);
  const { allowed } = useMotion();
  const [playing, setPlaying] = useState(autoScroll);
  useEffect(() => {
    const node = track.current; const group = first.current;
    if (!node || !group || !playing || !allowed || stories.length < 2) return;
    let frame = 0; let previous = 0; let position = node.scrollLeft;
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(node);
    const run = (now: number) => {
      const delta = Math.min(now - previous || 0, 50); previous = now;
      const width = group.getBoundingClientRect().width;
      if (visible && !blocked.current && !node.contains(document.activeElement) && !document.hidden && width > 0) {
        position = (position + delta * Math.min(Math.max(speed, 1), 80) / 1000) % width;
        node.scrollLeft = position;
      } else position = node.scrollLeft;
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [allowed, playing, speed, stories.length]);
  if (!stories.length) return null;
  const render = (copy: boolean) => stories.map(story => <a key={story.id} href={story.url} target="_blank" rel="noopener noreferrer" className="pulse-card" tabIndex={copy ? -1 : undefined}>
    <span className="pulse-thumbnail" aria-hidden="true">OANRO</span>
    <span><strong>{story.publisher}</strong><span className="pulse-headline">{story.headline}</span>{story.publishedAt && <time dateTime={story.publishedAt}>{new Date(story.publishedAt).toLocaleDateString()}</time>}</span><ArrowUpRight size={17} aria-hidden="true" />
  </a>);
  return <section className="pulse-section" aria-labelledby="pulse-title"><div className="container pulse-heading"><div><p className="eyebrow">Global Pulse</p><h2 id="pulse-title"><Localized en="Around the world of technology." bn="প্রযুক্তি জগতের খবর।" /></h2></div><div className="row-controls"><button className="icon-button" type="button" disabled={!allowed || stories.length < 2} aria-label={playing ? "Pause news" : "Play news"} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><button className="icon-button" type="button" aria-label="Previous news" onClick={() => { setPlaying(false); track.current?.scrollBy({ left: -310, behavior: allowed ? "smooth" : "instant" }); }}><ArrowLeft size={17} /></button><button className="icon-button" type="button" aria-label="Next news" onClick={() => { setPlaying(false); track.current?.scrollBy({ left: 310, behavior: allowed ? "smooth" : "instant" }); }}><ArrowRight size={17} /></button></div></div>
    <div className="pulse-track" ref={track} role="region" aria-label="Global Pulse news" tabIndex={0} onMouseEnter={() => { blocked.current = true; }} onMouseLeave={() => { blocked.current = false; }} onPointerDown={() => setPlaying(false)} onFocusCapture={() => setPlaying(false)} onWheel={() => setPlaying(false)}><div className="pulse-group" ref={first}>{render(false)}</div>{stories.length > 1 && <div className="pulse-group" aria-hidden="true">{render(true)}</div>}</div>
  </section>;
}
