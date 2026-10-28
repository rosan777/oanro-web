"use client";
import { useEffect, useState } from "react";

/** The visitor's local time and date (their browser time zone, the same clock the sky follows). The colon blinks and each new minute slides in. */
export function AssistantClock({ bn, timeZone }: { bn: boolean; timeZone: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 10_000); return () => clearInterval(timer); }, []);
  const fmt = (o: Intl.DateTimeFormatOptions, lang = bn ? "bn-BD" : "en-US") => { try { return new Intl.DateTimeFormat(lang, { timeZone, ...o }); } catch { return new Intl.DateTimeFormat(lang, o); } };
  const parts = fmt({ hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value ?? "";
  const hour = part("hour"), minute = part("minute"), period = part("dayPeriod");
  const date = fmt({ day: "numeric", month: "short" }, bn ? "bn-BD" : "en-GB").format(now);
  const label = fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(now);
  return <span className="asst-clock" role="img" aria-label={bn ? `স্থানীয় সময় ${label}, ${date}` : `Local time ${label}, ${date}`}>
    <span className="asst-clock-time" aria-hidden="true">
      <span>{hour}</span><span className="asst-colon">:</span><span key={minute} className="asst-min">{minute}</span>{period && <span className="asst-ampm">{period}</span>}
    </span>
    <span className="asst-clock-place" aria-hidden="true">{date}</span>
  </span>;
}
