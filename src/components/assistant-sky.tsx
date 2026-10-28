"use client";
import { useEffect, useId, useState, type CSSProperties } from "react";
import { hashText, skyScene } from "@/lib/assistant/sky";
import type { Condition } from "@/lib/assistant/weather";

/**
 * Decorative scene behind the assistant header: a Tokyo skyline (Skytree, Tokyo Tower, a pagoda, Mount Fuji far behind) under a sky that
 * follows the visitor's local time and the real current weather where they are: sun rays by day, moon and stars at night, drifting clouds,
 * rain, storms with lightning, snow or fog. Without weather data the sky is clear for the time of day.
 */
const W = 400, H = 58;
// A Tokyo skyline: [x, width, height] of each tower block along the bottom edge. Landmarks sit in the gaps; Tokyo Tower and Skytree stand in the open middle, between the clock and the title.
const buildings: [number, number, number][] = [[0, 14, 18], [14, 12, 26], [26, 16, 14], [42, 10, 22], [74, 14, 30], [88, 10, 20], [98, 16, 34], [114, 12, 24], [126, 12, 16], [138, 30, 26], [188, 14, 30], [218, 14, 40], [232, 16, 28], [248, 12, 22], [260, 18, 32], [278, 12, 24], [290, 18, 18], [308, 16, 26], [324, 12, 38], [336, 18, 22], [354, 14, 30], [368, 16, 20], [384, 16, 28]];
// Lit windows (about one in three in the open middle; few behind the header text on both sides), fixed once so the city looks the same every time.
const windows = buildings.flatMap(([x, w, h], b) => {
  const out: { x: number; y: number; flick: boolean; k: number }[] = [];
  for (let y = H - h + 4, r = 0; y < H - 4; y += 5, r++) for (let cx = x + 3, c = 0; cx < x + w - 3; cx += 5, c++) {
    const k = hashText(`w${b}-${r}-${c}`);
    if (k % 100 < (cx < 150 || cx > 232 ? 12 : 34)) out.push({ x: cx, y, flick: k % 7 === 0, k });
  }
  return out;
});
const stars = Array.from({ length: 20 }, (_, i) => ({ x: hashText(`sx${i}`) % W, y: 3 + (hashText(`sy${i}`) % 26), r: i % 5 === 0 ? 1.5 : 0.9, d: 2.4 + (hashText(`sd${i}`) % 20) / 10, l: -((hashText(`sl${i}`) % 30) / 10) }));
const drops = Array.from({ length: 28 }, (_, i) => ({ x: i * 14.5 + (i % 3) * 4, l: -((i * 0.37) % 0.9) }));
const flakes = Array.from({ length: 22 }, (_, i) => ({ x: (hashText(`fx${i}`) % W), r: 0.6 + (i % 3) * 0.3, d: 5 + (hashText(`fd${i}`) % 40) / 10, l: -((hashText(`fl${i}`) % 60) / 10) }));
// Drifting clouds: how many show depends on the weather (none on a clear night, a few when partly cloudy, many when overcast).
const puffs = [{ y: 12, s: 1, d: 70, l: -10 }, { y: 20, s: 0.7, d: 90, l: -55 }, { y: 8, s: 0.85, d: 80, l: -38 }, { y: 16, s: 1.2, d: 100, l: -75 }, { y: 6, s: 1.1, d: 85, l: -20 }, { y: 22, s: 0.9, d: 95, l: -66 }];
const cloudCount: Record<Condition, number> = { clear: 1, partly: 3, cloudy: 6, fog: 2, rain: 0, thunder: 0, snow: 4 };
const phaseGlow = { night: 1, dusk: 0.75, dawn: 0.4, day: 0 } as const;
const phaseStars = { night: 1, dusk: 0.5, dawn: 0.5, day: 0 } as const;
const rays = Array.from({ length: 10 }, (_, i) => i * 36);
// Extra life in the city, calm and occasional: fireworks at night, cherry petals by day, cars on the road below the towers.
const spokes = Array.from({ length: 12 }, (_, i) => i * 30);
const bursts = [{ x: 120, y: 12, c: "#e8c26a", d: 23, l: -4 }, { x: 300, y: 14, c: "#3ddc97", d: 31, l: -17 }, { x: 62, y: 9, c: "#ff5a4f", d: 37, l: -26 }];
const petalList = Array.from({ length: 8 }, (_, i) => ({ x: 20 + (hashText(`px${i}`) % 360), d: 9 + (i % 4) * 2, l: -(i * 1.7) }));
const carsRight = [{ d: 9, l: 0 }, { d: 12, l: -4 }, { d: 10.5, l: -7 }, { d: 14, l: -2 }, { d: 11, l: -9 }];
const carsLeft = [{ d: 10, l: -1 }, { d: 13, l: -6 }, { d: 9.5, l: -3 }, { d: 15, l: -10 }];
const trainCars = [0, 1, 2, 3];

export function AssistantSky({ at, timeZone, condition = "clear" }: { at?: Date; timeZone?: string; condition?: Condition }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [now, setNow] = useState(() => at ?? new Date());
  useEffect(() => { if (at) return; const timer = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(timer); }, [at]);
  const scene = skyScene(now, timeZone);
  const wet = condition === "rain" || condition === "thunder", overcast = wet || condition === "cloudy" || condition === "fog" || condition === "snow";
  const glow = phaseGlow[scene.phase], starsOn = overcast ? 0 : condition === "partly" ? phaseStars[scene.phase] * 0.6 : phaseStars[scene.phase];
  const sun = scene.body === "sun", bright = !overcast && scene.phase === "day";
  const clouds = scene.phase === "night" && condition === "clear" ? 0 : cloudCount[condition];
  // New details respect the real weather: no flying in storms or fog, fireworks and stars need a clear sky, petals need a fair day.
  const flying = !wet && condition !== "fog", fireworks = (scene.phase === "night" || scene.phase === "dusk") && !overcast, petals = (scene.phase === "day" || scene.phase === "dawn") && (condition === "clear" || condition === "partly");
  return <div className={`asst-sky is-${scene.phase} is-wx-${condition}`} aria-hidden="true">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" focusable="false">
      <defs>
        <mask id={`m${id}`}><rect width={W} height={H} fill="#fff" /><circle cx={scene.x + 3} cy={scene.y - 2} r="5" fill="#000" /></mask>
        <radialGradient id={`g${id}`}><stop offset="0" stopColor="#f6f5f0" stopOpacity="0.55" /><stop offset="1" stopColor="#f6f5f0" stopOpacity="0" /></radialGradient>
      </defs>
      <g className="asst-stars" style={{ opacity: starsOn }}>{stars.map((s, i) => <circle key={i} className={i % 4 === 0 ? "asst-star is-mint" : "asst-star"} cx={s.x} cy={s.y} r={s.r} style={{ "--d": `${s.d}s`, "--l": `${s.l}s` } as CSSProperties} />)}</g>
      {scene.phase === "night" && condition === "clear" && <g transform="translate(330 5)"><line className="asst-shoot" x1="0" y1="0" x2="9.5" y2="-3" /></g>}
      {/* Sunlight: a soft glow and slowly turning rays on a clear or partly cloudy day. */}
      {sun && !overcast && <g transform={`translate(${scene.x} ${scene.y})`}>
        <circle r="22" fill={`url(#g${id})`} className="asst-sunglow" />
        {bright && <g className="asst-rays">{rays.map(a => <path key={a} transform={`rotate(${a})`} d="M0 -9 L1.3 -19 L-1.3 -19 Z" />)}</g>}
      </g>}
      {sun
        ? <circle className="asst-sun" cx={scene.x} cy={scene.y} r="6.5" opacity={overcast ? 0.3 : 1} />
        : <><circle cx={scene.x} cy={scene.y} r="12" fill={`url(#g${id})`} opacity={overcast ? 0 : 0.5} /><circle className="asst-moon" cx={scene.x} cy={scene.y} r="6" mask={`url(#m${id})`} opacity={overcast ? 0.3 : 1} /></>}
      {clouds > 0 && <g className="asst-puffs">{puffs.slice(0, clouds).map((p, i) => <g key={i} className="asst-drift" style={{ "--d": `${p.d}s`, "--l": `${p.l}s` } as CSSProperties}><g transform={`translate(0 ${p.y}) scale(${p.s})`}><ellipse rx="14" ry="3.6" /><ellipse cx="-5" cy="-2.4" rx="7" ry="3.6" /><ellipse cx="5" cy="-3" rx="8" ry="4.4" /></g></g>)}</g>}
      {!overcast && (scene.phase === "day" || scene.phase === "dawn") && <g className="asst-birds">{[0, 1].map(i => <g key={i} className="asst-glide" style={{ "--l": `${-i * 11}s` } as CSSProperties}><path transform={`translate(0 ${16 + i * 6})`} d="M0 0q2-2.2 4 0q2-2.2 4 0" /></g>)}</g>}
      {fireworks && <g className="asst-fireworks">{bursts.map((b, i) => <g key={i} transform={`translate(${b.x} ${b.y})`}><g className="asst-burst" style={{ stroke: b.c, color: b.c, "--d": `${b.d}s`, "--l": `${b.l}s` } as CSSProperties}>{spokes.map(a => <line key={a} transform={`rotate(${a})`} x1="2.5" y1="0" x2="8" y2="0" />)}</g></g>)}</g>}
      {petals && <g className="asst-petals">{petalList.map((p, i) => <ellipse key={i} className="asst-petal" cx={p.x} cy="0" rx="1.2" ry="0.65" style={{ "--d": `${p.d}s`, "--l": `${p.l}s` } as CSSProperties} />)}</g>}
      {flying && <g className="asst-fly" style={{ "--d": "46s", "--l": "-3s" } as CSSProperties}>
        <g className="asst-plane" transform="translate(0 15)"><path d="M-6 0Q-6 -1.3 -3 -1.3L5 -1.3Q7.5 -1.3 8 0Q7.5 1.3 5 1.3L-3 1.3Q-6 1.3 -6 0Z" /><path d="M-5.4 -1L-7.6 -4L-4.6 -1Z" /><path d="M-.5 .8L-3.6 3.8L-1 3.8L2.2 .8Z" />
          <circle className="asst-nav is-red" cx="-2.6" cy="3.7" r="0.75" /><circle className="asst-nav is-white" cx="-7.4" cy="-3.8" r="0.7" style={{ "--l": "-0.4s" } as CSSProperties} /><circle className="asst-nav is-green" cx="7.6" cy="0" r="0.6" style={{ "--l": "-0.7s" } as CSSProperties} /></g>
      </g>}
      {flying && <g className="asst-fly-rev" style={{ "--d": "74s", "--l": "-40s" } as CSSProperties}>
        <g transform="translate(0 25)"><g className="asst-hover"><ellipse rx="4.2" ry="2.3" /><path d="M3.6 -.6L10 -1.4L10 -.4L3.6 .9Z" /><path d="M9.2 -3L10.6 -3L10.6 .8L9.2 .8Z" /><line x1="0" y1="-2.2" x2="0" y2="-3.6" /><line className="asst-rotor" x1="-6.5" y1="-3.6" x2="6.5" y2="-3.6" /><line x1="-3.5" y1="3.4" x2="3.5" y2="3.4" />
          <circle className="asst-nav is-red" cx="10.3" cy="-2.6" r="0.7" /></g></g>
      </g>}
      {wet && <g className="asst-clouds"><ellipse className="asst-cloud" cx="80" cy="12" rx="56" ry="8" /><ellipse className="asst-cloud" cx="230" cy="8" rx="70" ry="9" /><ellipse className="asst-cloud" cx="360" cy="16" rx="50" ry="7" /></g>}
      <g className="asst-far"><path d="M-10 58 L38 31 Q48 25 58 31 L112 58 Z" /><path className="asst-snow" d="M38 31 Q48 25 58 31 L53 33 L49 31 L45 34 L42 32 Z" /></g>
      <g className="asst-city">
        {buildings.map(([x, w, h], i) => <rect key={i} x={x} y={H - h} width={w} height={h} />)}
        <rect x="224.6" y="12" width="0.8" height="6" />
        {/* Pagoda */}
        <rect x="56" y="46" width="12" height="12" /><path d="M51 46 Q62 41.5 73 46 Z" /><rect x="58" y="40.5" width="8" height="5.5" /><path d="M53.5 40.5 Q62 36.5 70.5 40.5 Z" /><rect x="59.5" y="35.5" width="5" height="5" /><path d="M55.5 35.5 Q62 32 68.5 35.5 Z" /><rect x="61.7" y="28" width="0.6" height="7.5" />
        {/* Tokyo Tower */}
        <path className="asst-tokyo-tower" d="M168 58 L174.5 41 L176.6 31 L177.5 19 L177.8 9 L178.2 9 L178.5 19 L179.4 31 L181.5 41 L188 58 L184 58 L179.2 42 L176.8 42 L172 58 Z" /><rect x="172.5" y="40" width="11" height="1.6" /><rect x="175.4" y="30" width="5.2" height="1.4" />
        {/* Tokyo Skytree */}
        <path d="M204 58 L209.2 22 L210.8 22 L216 58 Z" /><rect x="207" y="25" width="6" height="2.6" rx="1" /><rect x="207.9" y="17" width="4.2" height="2" rx="0.8" /><rect x="209.4" y="7" width="1.2" height="15" /><rect x="209.75" y="2.5" width="0.5" height="5" />
      </g>
      <path className="asst-tower-glow" d="M168 58 L174.5 41 L176.6 31 L177.5 19 L177.8 9 L178.2 9 L178.5 19 L179.4 31 L181.5 41 L188 58" style={{ opacity: overcast ? Math.max(glow, 0.5) : glow }} />
      <path className="asst-skytree-glow" d="M204 58 L209.2 22 L210.8 22 L216 58" style={{ opacity: overcast ? Math.max(glow, 0.5) : glow }} />
      {/* Aviation lights: red on the tips, blue and white on the decks, each on its own rhythm. */}
      <circle className="asst-beacon is-red" cx="210" cy="2.4" r="1.1" /><circle className="asst-beacon is-red" cx="178" cy="8.4" r="0.9" style={{ "--l": "-1.1s" } as CSSProperties} /><circle className="asst-beacon is-red" cx="225" cy="11.6" r="0.8" style={{ "--l": "-0.5s" } as CSSProperties} />
      <circle className="asst-beacon is-blue" cx="210" cy="26.3" r="0.9" style={{ "--l": "-0.8s" } as CSSProperties} /><circle className="asst-beacon is-white" cx="178" cy="30.7" r="0.8" style={{ "--l": "-1.6s" } as CSSProperties} /><circle className="asst-beacon is-blue" cx="178" cy="40.8" r="0.8" style={{ "--l": "-0.3s" } as CSSProperties} />
      <g className="asst-windows" style={{ opacity: overcast ? Math.max(glow, 0.6) : glow }}>{windows.map((w, i) => <rect key={i} className={`asst-win${w.flick ? " asst-win-tw" : ""}${w.k % 11 === 0 ? " is-red" : w.k % 13 === 0 ? " is-blue" : w.k % 5 === 0 ? " is-gold" : w.k % 3 === 0 ? " is-cream" : ""}`} x={w.x} y={w.y} width="2" height="2.4" style={w.flick ? { "--l": `${-(w.k % 50) / 10}s` } as CSSProperties : undefined} />)}<rect className="asst-win is-gold asst-win-tw" x="60.6" y="42" width="2" height="2.4" /><rect className="asst-win is-gold" x="61.4" y="49" width="2" height="2.4" style={{ "--l": "-2s" } as CSSProperties} /></g>
      <g className="asst-rail"><rect x="0" y="53.6" width="400" height="0.7" /></g>
      <g className="asst-train" style={{ "--d": "52s", "--l": "-20s" } as CSSProperties}>{trainCars.map(i => <g key={i} transform={`translate(${i * 12.4} 50.2)`}><rect className="asst-car" width="11.4" height="3.2" rx="1" /><rect className="asst-stripe" y="1.5" width="11.4" height="0.5" />{[1.2, 4.5, 7.8].map(x => <rect key={x} className="asst-twin" x={x} y="0.5" width="2.4" height="0.9" />)}</g>)}</g>
      <g className="asst-road"><rect x="0" y="56.1" width="400" height="1.9" />
        {carsRight.map((c, i) => <circle key={`r${i}`} className="asst-carlight is-right" cx="0" cy="56.7" r="0.55" style={{ "--d": `${c.d}s`, "--l": `${c.l}s` } as CSSProperties} />)}
        {carsLeft.map((c, i) => <circle key={`l${i}`} className="asst-carlight is-left" cx="0" cy="57.4" r="0.55" style={{ "--d": `${c.d}s`, "--l": `${c.l}s` } as CSSProperties} />)}</g>
      {condition === "fog" && <g className="asst-fog">{[44, 50, 55].map((y, i) => <ellipse key={y} className="asst-drift" cx="0" cy={y} rx="130" ry="3.5" style={{ "--d": `${60 + i * 15}s`, "--l": `${-i * 20}s` } as CSSProperties} />)}</g>}
      {wet && <g className="asst-rain">{drops.map((d, i) => <line key={i} className="asst-drop" x1={d.x} y1="0" x2={d.x - 2} y2="8" style={{ "--l": `${d.l}s` } as CSSProperties} />)}</g>}
      {condition === "snow" && <g className="asst-flakes">{flakes.map((f, i) => <circle key={i} className="asst-flake" cx={f.x} cy="-2" r={f.r} style={{ "--d": `${f.d}s`, "--l": `${f.l}s` } as CSSProperties} />)}</g>}
      {condition === "thunder" && <><rect className="asst-flash" width={W} height={H} /><path className="asst-bolt" d="M182 4 L176 18 L181 18 L175 32 L188 15 L183 15 L188 4 Z" /></>}
    </svg>
  </div>;
}
