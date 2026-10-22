"use client";

import { useState } from "react";
import { featureFields, socialPlatforms, textFields, type FeatureKey, type SiteContent, type SocialPlatform, type TextKey } from "@/lib/site-content-data";
import { platformName, SocialIcon } from "./social-icon";
import type { Bi } from "@/lib/content";

type Part = "contact" | "text" | "features" | "guides" | "packages" | "faq";
const tabs: [Part, string][] = [["contact", "Contact & social"], ["text", "Texts"], ["features", "Sections on/off"], ["guides", "Guides"], ["packages", "Studio packages"], ["faq", "Service FAQ"]];
const groupBy = <K extends string>(fields: Record<K, { group: string }>) => {
  const out = new Map<string, K[]>();
  (Object.keys(fields) as K[]).forEach(k => out.set(fields[k].group, [...(out.get(fields[k].group) ?? []), k]));
  return [...out];
};
const blank = (): Bi => ({ en: "", bn: "" });

/** One English + Bangla pair of inputs. */
function BiInput({ label, value, onChange, long }: { label: string; value: Bi; onChange: (v: Bi) => void; long?: boolean }) {
  const Field = long ? "textarea" : "input";
  return <div className="ce-bi"><span className="ce-label">{label}</span>
    <label><small>English</small><Field rows={long ? 3 : undefined} value={value.en} onChange={e => onChange({ ...value, en: e.target.value })} /></label>
    <label><small>বাংলা</small><Field rows={long ? 3 : undefined} lang="bn" value={value.bn} onChange={e => onChange({ ...value, bn: e.target.value })} /></label>
  </div>;
}
/** Small list toolbar: move up/down and remove. */
function ItemTools({ i, n, move, remove }: { i: number; n: number; move: (from: number, to: number) => void; remove: () => void }) {
  return <div className="ce-tools">
    <button type="button" className="btn btn-neutral btn-sm" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">↑</button>
    <button type="button" className="btn btn-neutral btn-sm" disabled={i === n - 1} onClick={() => move(i, i + 1)} aria-label="Move down">↓</button>
    <button type="button" className="btn btn-neutral btn-sm" onClick={remove}>Remove</button>
  </div>;
}
const moved = <T,>(list: T[], from: number, to: number) => { const c = [...list]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c; };
const at = <T,>(list: T[], i: number, v: T) => list.map((x, k) => k === i ? v : x);

/** Admin → Website content: texts, section switches, guides, studio packages and service FAQ. */
export function ContentEditor({ initial }: { initial: SiteContent }) {
  const [saved, setSaved] = useState(initial); const [draft, setDraft] = useState(initial);
  const [tab, setTab] = useState<Part>("contact"); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  const dirty = JSON.stringify(draft[tab]) !== JSON.stringify(saved[tab]);
  const set = <P extends Part>(part: P, value: SiteContent[P]) => { setDraft(d => ({ ...d, [part]: value })); setMsg(""); };

  async function save(reset = false) {
    if (reset && !confirm("Put this tab back to the original version?")) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/content", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ part: tab, value: draft[tab], reset }) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { content?: SiteContent } | undefined; setBusy(false);
    if (!data?.content) { setMsg("Could not save. Please check the fields and try again."); return; }
    setSaved(data.content); setDraft(d => ({ ...d, [tab]: data.content![tab] }));
    const dropped = !reset && Array.isArray(draft[tab]) && (data.content[tab] as unknown[]).length < (draft[tab] as unknown[]).length;
    const changed = !reset && tab === "contact" && JSON.stringify(data.content.contact) !== JSON.stringify(draft.contact);
    setMsg(reset ? "Back to default. Live now." : dropped ? "Saved. Items with empty required fields were left out." : changed ? "Saved. Some entries were not valid (links must start with https://, email must be complete) and were cleared or left out — please check." : "Saved. Live now.");
  }

  return <section className="content-editor">
    <div className="ce-tabs" role="tablist">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setMsg(""); }}>{label}</button>)}</div>

    {tab === "contact" && (() => { const c = draft.contact; const setC = (patch: Partial<SiteContent["contact"]>) => set("contact", { ...c, ...patch });
      const setSocial = (i: number, patch: Partial<SiteContent["contact"]["socials"][number]>) => setC({ socials: at(c.socials, i, { ...c.socials[i], ...patch }) });
      const upload = (i: number, file: File | undefined) => { if (!file) return;
        if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type) || file.size > 11_000) { setMsg("Icon must be a PNG, JPG, WebP or SVG under 11 KB (a small square image, e.g. 64×64)."); return; }
        const reader = new FileReader(); reader.onload = () => setSocial(i, { icon: String(reader.result) }); reader.readAsDataURL(file); };
      return <>
      <fieldset className="ce-group"><legend>Contact details</legend>
        <p className="small-note">Shown in the footer, on the Contact page and in Google&rsquo;s business info. Leave a box empty to hide it.</p>
        <label className="ce-one">Email<input type="email" value={c.email} onChange={e => setC({ email: e.target.value })} placeholder="support@oanro.com" /></label>
        <label className="ce-one">Phone (shown as a call link)<input value={c.phone} onChange={e => setC({ phone: e.target.value })} placeholder="+8801XXXXXXXXX" inputMode="tel" /></label>
        <label className="ce-one">WhatsApp number (with country code, digits only)<input value={c.whatsapp} onChange={e => setC({ whatsapp: e.target.value })} placeholder="8801XXXXXXXXX" inputMode="tel" /><small>Turn the WhatsApp buttons on or off in the Sections tab.</small></label>
        <label className="ce-one">Messenger link<input value={c.messenger} onChange={e => setC({ messenger: e.target.value })} placeholder="https://m.me/yourpage" /></label>
        <BiInput label="Address or area (e.g. Mirpur, Dhaka)" value={c.address} onChange={v => setC({ address: v })} />
      </fieldset>
      <fieldset className="ce-group"><legend>Social media icons</legend>
        <p className="small-note">Each link shows as an icon in the footer and on the Contact page. Use the built-in icon or upload your own small icon.</p>
        {c.socials.map((x, i) => <div key={i} className="ce-sub ce-social">
          <span className="ce-social-preview"><SocialIcon social={x} size={26} /></span>
          <label>Platform<select value={x.platform} onChange={e => setSocial(i, { platform: e.target.value as SocialPlatform })}>{socialPlatforms.map(p => <option key={p} value={p}>{platformName[p]}</option>)}</select></label>
          <label className="ce-grow">Link (https://…)<input value={x.url} onChange={e => setSocial(i, { url: e.target.value })} placeholder="https://facebook.com/oanro" /></label>
          <label>Hover text (optional)<input value={x.label} maxLength={40} onChange={e => setSocial(i, { label: e.target.value })} placeholder={`OANRO on ${platformName[x.platform]}`} /></label>
          <div className="ce-tools">
            <label className="btn btn-neutral btn-sm ce-file">{x.icon ? "Change icon" : "Upload icon"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => upload(i, e.target.files?.[0])} /></label>
            {x.icon && <button type="button" className="btn btn-neutral btn-sm" onClick={() => setSocial(i, { icon: "" })}>Use built-in icon</button>}
            <button type="button" className="btn btn-neutral btn-sm" disabled={i === 0} onClick={() => setC({ socials: moved(c.socials, i, i - 1) })} aria-label="Move up">↑</button>
            <button type="button" className="btn btn-neutral btn-sm" onClick={() => setC({ socials: c.socials.filter((_, k) => k !== i) })}>Remove</button>
          </div>
        </div>)}
        <button type="button" className="btn btn-neutral" disabled={c.socials.length >= 12} onClick={() => setC({ socials: [...c.socials, { platform: (["facebook", "instagram", "tiktok"] as SocialPlatform[]).find(p => !c.socials.some(s => s.platform === p)) ?? "website", url: "", label: "", icon: "" }] })}>+ Add social link</button>
      </fieldset>
      <fieldset className="ce-group"><legend>Marketing</legend>
        <label className="ce-one">Meta Pixel ID (numbers only, from Meta Events Manager)<input value={c.pixelId} onChange={e => setC({ pixelId: e.target.value.trim() })} placeholder="123456789012345" inputMode="numeric" /><small>Loads only for visitors who allow Analytics. Turn it on or off in the Sections tab. The server-side token (META_CAPI_TOKEN) is a secret and goes in Vercel, not here.</small></label>
        <p className="small-note">Google Shopping feed address for Merchant Center: <code>https://oanro.com/feed/google.xml</code> (switch in the Sections tab).</p>
      </fieldset>
      <fieldset className="ce-group"><legend>Global Pulse news strip</legend>
        <label className="ce-switch"><input type="radio" name="pulse" checked={c.pulseWhere === "everywhere"} onChange={() => setC({ pulseWhere: "everywhere" })} />Show on every page</label>
        <label className="ce-switch"><input type="radio" name="pulse" checked={c.pulseWhere === "services"} onChange={() => setC({ pulseWhere: "services" })} />Show only on service (Studio) pages</label>
        <small>To hide it everywhere, use Admin → Sections.</small>
      </fieldset>
    </>; })()}

    {tab === "text" && groupBy(textFields).map(([group, keys]) => <fieldset key={group} className="ce-group"><legend>{group}</legend>
      {(keys as TextKey[]).map(k => { const f = textFields[k] as { label: string; long?: boolean; hint?: string };
        return <BiInput key={k} label={f.label + (k === "studio.headline" ? " (use | for a new line)" : "")} long={f.long} value={draft.text[k]} onChange={v => set("text", { ...draft.text, [k]: v })} />; })}
    </fieldset>)}

    {tab === "features" && groupBy(featureFields).map(([group, keys]) => <fieldset key={group} className="ce-group"><legend>{group}</legend>
      {(keys as FeatureKey[]).map(k => <label key={k} className="ce-switch"><input type="checkbox" checked={draft.features[k]} onChange={e => set("features", { ...draft.features, [k]: e.target.checked })} />{featureFields[k].label}</label>)}
    </fieldset>)}

    {tab === "guides" && <>
      {draft.guides.map((g, i) => <fieldset key={i} className="ce-group"><legend>{g.title.en || "New guide"}</legend>
        <ItemTools i={i} n={draft.guides.length} move={(a, b) => set("guides", moved(draft.guides, a, b))} remove={() => set("guides", draft.guides.filter((_, k) => k !== i))} />
        <label className="ce-one">Web address (lowercase-with-dashes)<input value={g.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={e => set("guides", at(draft.guides, i, { ...g, slug: e.target.value }))} /></label>
        <BiInput label="Title" value={g.title} onChange={v => set("guides", at(draft.guides, i, { ...g, title: v }))} />
        <BiInput label="Summary" long value={g.summary} onChange={v => set("guides", at(draft.guides, i, { ...g, summary: v }))} />
        {g.sections.map((s, j) => <div key={j} className="ce-sub">
          <BiInput label={`Section ${j + 1} heading`} value={s.heading} onChange={v => set("guides", at(draft.guides, i, { ...g, sections: at(g.sections, j, { ...s, heading: v }) }))} />
          <BiInput label={`Section ${j + 1} text`} long value={s.body} onChange={v => set("guides", at(draft.guides, i, { ...g, sections: at(g.sections, j, { ...s, body: v }) }))} />
          <button type="button" className="btn btn-neutral btn-sm" onClick={() => set("guides", at(draft.guides, i, { ...g, sections: g.sections.filter((_, k) => k !== j) }))}>Remove section</button>
        </div>)}
        <button type="button" className="btn btn-neutral btn-sm" onClick={() => set("guides", at(draft.guides, i, { ...g, sections: [...g.sections, { heading: blank(), body: blank() }] }))}>+ Add section</button>
      </fieldset>)}
      <button type="button" className="btn btn-neutral" onClick={() => set("guides", [...draft.guides, { slug: "", title: blank(), summary: blank(), updated: new Date().toISOString().slice(0, 10), sections: [{ heading: blank(), body: blank() }] }])}>+ Add guide</button>
    </>}

    {tab === "packages" && <>
      {draft.packages.map((p, i) => <fieldset key={i} className="ce-group"><legend>{p.name.en || "New package"}</legend>
        <ItemTools i={i} n={draft.packages.length} move={(a, b) => set("packages", moved(draft.packages, a, b))} remove={() => set("packages", draft.packages.filter((_, k) => k !== i))} />
        <BiInput label="Name" value={p.name} onChange={v => set("packages", at(draft.packages, i, { ...p, name: v }))} />
        <BiInput label="Best for" value={p.for} onChange={v => set("packages", at(draft.packages, i, { ...p, for: v }))} />
        {p.includes.map((x, j) => <div key={j} className="ce-sub"><BiInput label={`Includes ${j + 1}`} value={x} onChange={v => set("packages", at(draft.packages, i, { ...p, includes: at(p.includes, j, v) }))} />
          <button type="button" className="btn btn-neutral btn-sm" onClick={() => set("packages", at(draft.packages, i, { ...p, includes: p.includes.filter((_, k) => k !== j) }))}>Remove</button></div>)}
        <button type="button" className="btn btn-neutral btn-sm" onClick={() => set("packages", at(draft.packages, i, { ...p, includes: [...p.includes, blank()] }))}>+ Add line</button>
      </fieldset>)}
      <button type="button" className="btn btn-neutral" onClick={() => set("packages", [...draft.packages, { name: blank(), for: blank(), includes: [blank()] }])}>+ Add package</button>
    </>}

    {tab === "faq" && <>
      {draft.faq.map((f, i) => <fieldset key={i} className="ce-group"><legend>{f.q.en || "New question"}</legend>
        <ItemTools i={i} n={draft.faq.length} move={(a, b) => set("faq", moved(draft.faq, a, b))} remove={() => set("faq", draft.faq.filter((_, k) => k !== i))} />
        <BiInput label="Question" value={f.q} onChange={v => set("faq", at(draft.faq, i, { ...f, q: v }))} />
        <BiInput label="Answer" long value={f.a} onChange={v => set("faq", at(draft.faq, i, { ...f, a: v }))} />
      </fieldset>)}
      <button type="button" className="btn btn-neutral" onClick={() => set("faq", [...draft.faq, { q: blank(), a: blank() }])}>+ Add question</button>
    </>}

    <div className="ce-bar">
      <button type="button" className="btn btn-primary" disabled={busy || !dirty} onClick={() => save()}>{busy ? "Saving…" : "Save"}</button>
      <button type="button" className="btn btn-neutral" disabled={busy} onClick={() => setDraft(d => ({ ...d, [tab]: saved[tab] }))} hidden={!dirty}>Undo changes</button>
      <button type="button" className="btn btn-neutral" disabled={busy} onClick={() => save(true)}>Reset to default</button>
      <p className="small-note" role="status">{dirty ? "Unsaved changes" : msg}</p>
    </div>
  </section>;
}
