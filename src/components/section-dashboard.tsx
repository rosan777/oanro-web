"use client";
import { useRef, useState, type FormEvent } from "react";
import { PulseThumbnail } from "./pulse-thumbnail";
import { PulseUpload } from "./pulse-upload";
import type { SectionState, SectionCode } from "@/lib/website-sections";

type Story = { id: string; publisher: string; headline: string; url: string; visible: boolean };
// Caps and Tech Items visibility moved to their collection pages (status Published/Hidden).
const labels: Partial<Record<SectionCode, string>> = { "global-pulse": "Global Pulse news strip" }; // Services has its switch on the admin home page.
export function SectionDashboard({ initial, initialStories, part = "all" }: { initial: SectionState; initialStories: Story[]; part?: "all" | "sections" | "pulse" }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [preview, setPreview] = useState<{ url: string; thumbnailUrl: string; previewToken: string } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [approved, setApproved] = useState(false);
  async function previewImage() {
    const url = String(new FormData(formRef.current!).get("url") ?? "").trim();
    setBusy(true); setNotice(""); setPreview(null); setApproved(false); setImageLoaded(false);
    try {
      const response = await fetch("/api/admin/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", url }) });
      if (!response.ok) throw new Error("preview");
      const result = await response.json() as { thumbnailUrl: string; previewToken: string };
      setPreview({ ...result, url });
      setNotice("Review the image and confirm permission before including it. Preview expires in 10 minutes.");
    } catch { setNotice("No usable image found. The publisher may block previews, or the image may be too large. You can publish with the OANRO fallback."); }
    finally { setBusy(false); }
  }
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
      const body = { publisher: fields.get("publisher"), headline: fields.get("headline"), url: String(fields.get("url") ?? "").trim(), ...(approved && imageLoaded && preview ? { thumbnailApproved: true, previewToken: preview.previewToken } : {}), rightsConfirmed: fields.get("rightsConfirmed") === "on", visible: true };
      const response = await fetch("/api/admin/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("publish");
      const result = await response.json() as { id: string };
      setStories(previous => [{ id: result.id, publisher: String(body.publisher), headline: String(body.headline), url: body.url, visible: true }, ...previous]);
      form.reset(); setPreview(null); setApproved(false); setImageLoaded(false); setNotice("Story published. It appears when Global Pulse is enabled.");
    } catch { setNotice("Could not publish. Check duplicate links and rights; if using a thumbnail, generate a fresh preview and approve it again."); }
    finally { setBusy(false); }
  }
  async function deleteStory(story: Story) {
    if (!window.confirm(`Permanently delete “${story.headline}”?\n\nThe story and saved thumbnail will be removed. This cannot be undone. The audit record will remain.`)) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/pulse", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: story.id, confirmDelete: true }) });
      if (!response.ok) throw new Error("delete");
      setStories(previous => previous.filter(item => item.id !== story.id));
      setNotice("Story permanently deleted. Audit record retained. Refresh the storefront.");
    } catch { setNotice("Could not delete the story. Refresh and retry."); }
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
    {part !== "pulse" && <><h2>Website sections</h2><p>These controls change the public presentation without deleting products or news records.</p>
    {Object.entries(labels).map(([code, label]) => <div className="admin-section-row" key={code}><span>{label}</span><button type="button" disabled={busy} onClick={() => toggle(code as SectionCode)} aria-label={`${sections[code as SectionCode] ? "Disable" : "Enable"} ${label}`} aria-pressed={sections[code as SectionCode]}>{sections[code as SectionCode] ? "On" : "Off"}</button></div>)}</>}
    {part !== "sections" && <><h2>Global Pulse editorial</h2><p>Publish only an original publisher link and headline that you checked. Preview an optional article thumbnail, then approve its reuse. Without approval, the story uses the OANRO fallback.</p>
    <form ref={formRef} className="pulse-form" onSubmit={publish}><fieldset disabled={busy}><label>Publisher<input name="publisher" required maxLength={80} /></label><label>Original headline<input name="headline" required maxLength={220} /></label><label>Original HTTPS article URL<input name="url" type="url" onChange={() => { setPreview(null); setApproved(false); setImageLoaded(false); }} required pattern="https://.*" /></label><button type="button" className="button" onClick={previewImage}>Find thumbnail preview</button>
      <PulseUpload disabled={busy} getUrl={() => String(new FormData(formRef.current!).get("url") ?? "").trim()} onStart={() => { setBusy(true); setPreview(null); setApproved(false); setImageLoaded(false); setNotice(""); }} onReady={(result, url) => { setPreview({ ...result, url }); setNotice("Photo ready. Review and approve it before publishing."); }} onError={setNotice} onFinish={() => setBusy(false)} />
      {preview && <div className="pulse-preview"><PulseThumbnail key={preview.previewToken} source={preview.thumbnailUrl} onLoaded={() => setImageLoaded(true)} /><label><input type="checkbox" checked={approved} disabled={!imageLoaded} onChange={event => setApproved(event.target.checked)} /> I reviewed this image and have permission to display it.</label></div>}
      <label><input name="rightsConfirmed" type="checkbox" required /> I verified the source and have permission to display this headline and link.</label><button disabled={busy} className="button brand-button">Publish reviewed story</button></fieldset></form>
    {stories.map(story => <div className="pulse-story-editor" key={story.id}><div className="admin-section-row"><span>{story.publisher}: {story.headline}</span><div className="pulse-story-actions"><button type="button" disabled={busy} onClick={() => toggleStory(story)}>{story.visible ? "Hide" : "Show"}</button><button type="button" className="pulse-delete" disabled={busy} onClick={() => deleteStory(story)}>Delete permanently</button></div></div><StoryThumbnailEditor story={story} /></div>)}
    </>}
    <p role="status">{notice}</p>
  </div>;
}


function StoryThumbnailEditor({ story }: { story: Story }) {
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ thumbnailUrl: string; previewToken: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [approved, setApproved] = useState(false);
  const [notice, setNotice] = useState("");
  async function findImage() {
    setBusy(true); setPreview(null); setLoaded(false); setApproved(false); setNotice("");
    try {
      const response = await fetch("/api/admin/pulse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "preview", url: story.url }) });
      if (!response.ok) throw new Error("preview");
      setPreview(await response.json());
    } catch { setNotice("Could not load an image. Retry later; this publisher may block previews."); }
    finally { setBusy(false); }
  }
  async function saveImage() {
    if (!preview || !approved || !loaded) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/pulse", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "thumbnail", id: story.id, previewToken: preview.previewToken, thumbnailApproved: true }) });
      if (!response.ok) throw new Error("save");
      setPreview(null); setApproved(false); setNotice("Thumbnail saved. Refresh the storefront to see it.");
    } catch { setNotice("Could not save. Find a fresh preview, approve and retry."); }
    finally { setBusy(false); }
  }
  return <div className="pulse-existing-thumbnail">
    <button type="button" className="button" disabled={busy} onClick={findImage}>{busy ? "Please wait…" : "Find / replace thumbnail"}</button>
    <PulseUpload disabled={busy} getUrl={() => story.url} onStart={() => { setBusy(true); setPreview(null); setLoaded(false); setApproved(false); setNotice(""); }} onReady={result => { setPreview(result); setNotice("Photo ready. Review, approve and save it below."); }} onError={setNotice} onFinish={() => setBusy(false)} />
    {preview && <div className="pulse-preview"><PulseThumbnail key={preview.previewToken} source={preview.thumbnailUrl} onLoaded={() => setLoaded(true)} /><label><input type="checkbox" checked={approved} disabled={!loaded || busy} onChange={event => setApproved(event.target.checked)} /> I reviewed this image and have permission to display it.</label><button type="button" className="button brand-button" disabled={busy || !loaded || !approved} onClick={saveImage}>Save approved thumbnail</button></div>}
    <p role="status">{notice}</p>
  </div>;
}
