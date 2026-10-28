"use client";
import type { Condition, Weather } from "@/lib/assistant/weather";

/** Small animated weather icon (sun, moon, clouds, rain, storm, snow, fog) in the site palette. Motion stops with reduced motion. */
export function WeatherIcon({ condition, night }: { condition: Condition; night: boolean }) {
  const cloud = <path className="wx-cloud" d="M7 17h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.6A3.2 3.2 0 0 0 7 17z" />;
  const sun = (x: number, y: number, r: number) => <g className="wx-sun" transform={`translate(${x} ${y})`}><g className="wx-rays">{[0, 45, 90, 135, 180, 225, 270, 315].map(a => <line key={a} transform={`rotate(${a})`} x1="0" y1={-(r + 2)} x2="0" y2={-(r + 4)} />)}</g><circle r={r} /></g>;
  const moon = (x: number, y: number) => <path className="wx-moon" transform={`translate(${x} ${y})`} d="M2.6-4.6A5 5 0 1 0 4.8 2.3 4 4 0 0 1 2.6-4.6z" />;
  return <svg className={`wx-icon is-${condition}`} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    {condition === "clear" && (night ? moon(12, 12) : sun(12, 12, 4.5))}
    {condition === "partly" && <>{night ? moon(9, 9) : sun(9, 9, 3.6)}<g className="wx-drift">{cloud}</g></>}
    {(condition === "cloudy" || condition === "rain" || condition === "thunder" || condition === "snow") && <g className="wx-drift">{cloud}</g>}
    {condition === "rain" && <g className="wx-drops">{[9, 13, 17].map((x, i) => <line key={x} x1={x} y1="18.5" x2={x - 1} y2="21" style={{ animationDelay: `${i * -0.3}s` }} />)}</g>}
    {condition === "thunder" && <path className="wx-bolt" d="M12.5 16.5 10 20.5h2.5L11.5 23.5l3.5-4.5h-2.5l1-3z" />}
    {condition === "snow" && <g className="wx-flakes">{[9, 13, 17].map((x, i) => <circle key={x} cx={x} cy="20" r="0.9" style={{ animationDelay: `${i * -0.5}s` }} />)}</g>}
    {condition === "fog" && <g className="wx-fog">{[9, 13, 17].map((y, i) => <line key={y} x1={4 + i} y1={y} x2={20 - i} y2={y} />)}</g>}
  </svg>;
}

const names: Record<Condition, [string, string]> = { clear: ["clear", "পরিষ্কার"], partly: ["partly cloudy", "আংশিক মেঘলা"], cloudy: ["cloudy", "মেঘলা"], fog: ["foggy", "কুয়াশা"], rain: ["rain", "বৃষ্টি"], thunder: ["thunderstorm", "বজ্রঝড়"], snow: ["snow", "তুষার"] };

/** Icon above the temperature; the chance of rain (when MET Norway gives one) in mint beside it. Credit for the data is in the title. */
export function WeatherBadge({ weather, bn }: { weather: Weather; bn: boolean }) {
  const label = `${weather.place ? `${weather.place}, ` : ""}${weather.temp}°${weather.unit}, ${names[weather.condition][bn ? 1 : 0]}${weather.rainChance !== null ? `, ${weather.rainChance}%` : ""}`;
  return <span className="asst-wx" role="img" aria-label={label} title={`${label} · ${bn ? "তথ্য: MET Norway" : "Data from MET Norway"}`}>
    <WeatherIcon condition={weather.condition} night={weather.night} />
    <span className="asst-temp" aria-hidden="true">{weather.temp}°{weather.rainChance !== null && (weather.condition === "rain" || weather.condition === "thunder") && <small>{weather.rainChance}%</small>}</span>
  </span>;
}
