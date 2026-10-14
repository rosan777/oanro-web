"use client";
import { useState, type FormEvent } from "react";
import type { SectionState, SectionCode } from "@/lib/website-sections";

type Story = { id: string; publisher: string; headline: string; visible: boolean };
const labels: Record<SectionCode, string> = { caps: "Caps Collection", "tech-items": "Tech Items", "global-pulse": "Global Pulse" };
export function SectionDashboard({ initial, initialStories }: { initial: SectionState; initialStories: Story[] }) {
  const [sections, setSections] = useState(initial);
  const [stories, setStories] = useState(initialStories);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function toggle(code: SectionCode) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/sections", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, enabled: !sections[code] }) });
      if (!response.ok) throw new Error("update");
      setSections(previous => ({ ...previous, [code]: !previous[code] }));
      setNotice("Visibility saved. Refresh the storefront to view it.");
    } catch { setNotice("Could not save. Check the database connection and retry."); }
    finally { setBusy(false); }
  }
  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice("");
    const form = event.currentTarget;
    const fields = new FormData(form);
    try {
      const body = { publisher: fields.get("publisher"), headline: fields.get("headline"), url: fields.get("url"), rightsConfirmed: fields.get("rightsConfirmed") === "on", visible: true };
      const response = await fetch("/api/admin/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("publish");
      const result = await response.json() as { id: string };
      setStories(previous => [{ id: result.id, publisher: String(body.publisher), headline: String(body.headline), visible: true }, ...previous]);
      form.reset(); setNotice("Story published. It appears when Global Pulse is enabled.");
    } catch { setNotice("Could not publish. Check the URL, rights confirmation and duplicate links."); }
    finally { setBusy(false); }
  }
  async function toggleStory(story: Story) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/pulse", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: story.id, visible: !story.visible }) });
      if (!response.ok) throw new Error("update");
      setStories(previous => previous.map(item => item.id === story.id ? { ...item, visible: !story.visible } : item));
      setNotice("Story visibility saved.");
    } catch { setNotice("Story update failed."); }
    finally { setBusy(false); }
  }
  return <div className="admin-sections">
    <h2>Website sections</h2><p>These controls change the public presentation without deleting products or news records.</p>
    {Object.entries(labels).map(([code, label]) => <div className="admin-section-row" key={code}><span>{label}</span><button type="button" disabled={busy} onClick={() => toggle(code as SectionCode)} aria-label={`${sections[code as SectionCode] ? "Disable" : "Enable"} ${label}`} aria-pressed={sections[code as SectionCode]}>{sections[code as SectionCode] ? "On" : "Off"}</button></div>)}
    <h2>Global Pulse editorial</h2><p>Publish only an original publisher link and headline that you checked. Confirm reuse rights; thumbnails and automated feeds are not enabled in this first stage.</p>
    <form className="pulse-form" onSubmit={publish}><label>Publisher<input name="publisher" required maxLength={80} /></label><label>Original headline<input name="headline" required maxLength={220} /></label><label>Original HTTPS article URL<input name="url" type="url" required pattern="https://.*" /></label><label><input name="rightsConfirmed" type="checkbox" required /> I verified the source and have permission to display this headline and link.</label><button disabled={busy} className="button brand-button">Publish reviewed story</button></form>
    {stories.map(story => <div className="admin-section-row" key={story.id}><span>{story.publisher}: {story.headline}</span><button disabled={busy} onClick={() => toggleStory(story)}>{story.visible ? "Hide" : "Show"}</button></div>)}
    <p role="status">{notice}</p>
  </div>;
}
