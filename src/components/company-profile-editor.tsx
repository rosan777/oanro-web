"use client";

import { useState } from "react";
import { blankGroup, blankItem, blankSection, profileIcons, sectionKinds, type CompanyProfile, type ProfileGroup, type ProfileItem, type ProfileSection, type SectionKind } from "@/lib/company-profile-data";
import type { Bi } from "@/lib/content";
import { ProfileIcon } from "./profile-icon";

const moved = <T,>(list: T[], from: number, to: number) => { const c = [...list]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c; };
const at = <T,>(list: T[], i: number, v: T) => list.map((x, k) => k === i ? v : x);

function BiInput({ label, value, onChange, long, hint }: { label: string; value: Bi; onChange: (v: Bi) => void; long?: boolean; hint?: string }) {
  const Field = long ? "textarea" : "input";
  return <div className="ce-bi"><span className="ce-label">{label}{hint && <small> · {hint}</small>}</span>
    <label><small>English</small><Field rows={long ? 4 : undefined} value={value.en} onChange={e => onChange({ ...value, en: e.target.value })} /></label>
    <label><small>বাংলা (empty = English is shown)</small><Field rows={long ? 4 : undefined} lang="bn" value={value.bn} onChange={e => onChange({ ...value, bn: e.target.value })} /></label>
  </div>;
}
function Tools({ i, n, move, remove, what }: { i: number; n: number; move: (from: number, to: number) => void; remove: () => void; what: string }) {
  return <div className="ce-tools">
    <button type="button" className="btn btn-neutral btn-sm" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move ${what} up`}>↑</button>
    <button type="button" className="btn btn-neutral btn-sm" disabled={i === n - 1} onClick={() => move(i, i + 1)} aria-label={`Move ${what} down`}>↓</button>
    <button type="button" className="btn btn-neutral btn-sm" onClick={remove}>Remove {what}</button>
  </div>;
}

/** Which item fields each kind of section uses. */
const uses = (k: SectionKind) => ({
  groupTitle: k === "groups" || k === "tech" || k === "notice" || k === "thanks" || k === "split" || k === "cards",
  icon: k !== "tech" && k !== "values" && k !== "thanks" && k !== "split",
  text: k !== "tech" && k !== "split",
  list: k === "cards" || k === "intro",
  logo: k === "tech",
  columns: k === "cards" || k === "groups" || k === "tech",
  textLabel: k === "thanks" ? "Value (contact) — leave empty for terms" : "Short text",
  titleLabel: k === "thanks" ? "Label (contact) or term text" : k === "tech" ? "Technology name" : k === "split" ? "Point" : "Title",
});

function ItemEditor({ it, kind, onChange }: { it: ProfileItem; kind: SectionKind; onChange: (v: ProfileItem) => void }) {
  const u = uses(kind);
  return <div className="cpe-item">
    {u.icon && <label className="cpe-icon">Icon<span className="cpe-icon-row"><span className="cpe-icon-preview"><ProfileIcon name={it.icon} size={18} /></span>
      <select value={it.icon} onChange={e => onChange({ ...it, icon: e.target.value })}><option value="">No icon</option>{profileIcons.map(n => <option key={n} value={n}>{n}</option>)}</select></span></label>}
    {u.logo && <label className="ce-one">Logo name (Simple Icons, e.g. react, nextdotjs, postgresql — empty = 2-letter badge)<input value={it.logo} onChange={e => onChange({ ...it, logo: e.target.value })} placeholder="react" /></label>}
    <BiInput label={u.titleLabel} value={it.title} onChange={v => onChange({ ...it, title: v })} long={kind === "thanks"} />
    {u.text && <BiInput label={u.textLabel} value={it.text} onChange={v => onChange({ ...it, text: v })} long={kind !== "thanks"} />}
    {u.list && <BiInput label="Bullet list" hint="one line per bullet" value={it.list} onChange={v => onChange({ ...it, list: v })} long />}
  </div>;
}

function GroupEditor({ g, kind, onChange }: { g: ProfileGroup; kind: SectionKind; onChange: (v: ProfileGroup) => void }) {
  const u = uses(kind);
  return <div className="cpe-group">
    {u.groupTitle && <BiInput label={kind === "notice" ? "Box heading" : kind === "split" ? "Panel heading" : kind === "cards" ? "Group heading (used for the tags group)" : "Group heading"} value={g.title} onChange={v => onChange({ ...g, title: v })} />}
    {g.items.map((it, i) => <div key={i} className="ce-sub">
      <div className="cpe-row-head"><strong>Item {i + 1}</strong><Tools what="item" i={i} n={g.items.length} move={(a, b) => onChange({ ...g, items: moved(g.items, a, b) })} remove={() => onChange({ ...g, items: g.items.filter((_, k) => k !== i) })} /></div>
      <ItemEditor it={it} kind={kind} onChange={v => onChange({ ...g, items: at(g.items, i, v) })} />
    </div>)}
    <button type="button" className="btn btn-neutral btn-sm" onClick={() => onChange({ ...g, items: [...g.items, { ...blankItem(), icon: u.icon ? "check" : "" }] })}>+ Add item</button>
  </div>;
}

function SectionEditor({ s, onChange }: { s: ProfileSection; onChange: (v: ProfileSection) => void }) {
  const u = uses(s.kind);
  return <div className="cpe-section-body">
    <p className="small-note">{sectionKinds[s.kind].hint}</p>
    <div className="cpe-switches">
      <label className="ce-switch"><input type="checkbox" checked={s.enabled} onChange={e => onChange({ ...s, enabled: e.target.checked })} /> Show this section</label>
      <label className="ce-switch"><input type="checkbox" checked={s.dark} onChange={e => onChange({ ...s, dark: e.target.checked })} /> Dark background</label>
      <label className="ce-switch"><input type="checkbox" checked={s.signature} onChange={e => onChange({ ...s, signature: e.target.checked })} /> Show the Team oanro signature</label>
      {u.columns && <label>Columns<select value={s.columns} onChange={e => onChange({ ...s, columns: Number(e.target.value) })}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
    </div>
    <BiInput label="Small label above the heading" value={s.eyebrow} onChange={v => onChange({ ...s, eyebrow: v })} />
    <BiInput label="Heading" hint={s.kind === "cover" || s.kind === "thanks" ? "use | for a new line" : undefined} value={s.title} onChange={v => onChange({ ...s, title: v })} />
    <BiInput label={s.kind === "cover" ? "Tagline" : "Paragraph"} hint={s.kind === "intro" || s.kind === "notice" ? "blank line = new paragraph" : undefined} value={s.body} onChange={v => onChange({ ...s, body: v })} long />
    <BiInput label="Bottom strip (optional)" value={s.strip} onChange={v => onChange({ ...s, strip: v })} />
    {s.groups.map((g, i) => <fieldset key={i} className="ce-group"><legend>Group {i + 1}</legend>
      <Tools what="group" i={i} n={s.groups.length} move={(a, b) => onChange({ ...s, groups: moved(s.groups, a, b) })} remove={() => onChange({ ...s, groups: s.groups.filter((_, k) => k !== i) })} />
      <GroupEditor g={g} kind={s.kind} onChange={v => onChange({ ...s, groups: at(s.groups, i, v) })} />
    </fieldset>)}
    <button type="button" className="btn btn-neutral btn-sm" onClick={() => onChange({ ...s, groups: [...s.groups, blankGroup()] })}>+ Add group</button>
  </div>;
}

/** Admin → Company profile: add, edit, reorder and switch off sections of /company-profile. */
export function CompanyProfileEditor({ initial }: { initial: CompanyProfile }) {
  const [saved, setSaved] = useState(initial); const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(""); const [newKind, setNewKind] = useState<SectionKind>("cards");
  const [open, setOpen] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const setSections = (sections: ProfileSection[]) => { setDraft({ sections }); setMsg(""); };

  async function save(reset = false) {
    if (reset && !confirm("Put the whole company profile back to the original version? Your changes will be lost.")) return;
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/company-profile", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(reset ? { reset: true } : { value: draft }) }).catch(() => null);
    const data = await res?.json().catch(() => ({})) as { profile?: CompanyProfile } | undefined; setBusy(false);
    if (!data?.profile) { setMsg("Could not save. Please check the fields and try again."); return; }
    setSaved(data.profile); setDraft(data.profile); setMsg(reset ? "Back to the original version. Live now." : "Saved. Live now.");
  }

  return <section className="content-editor cpe">
    <div className="ce-bar cpe-bar">
      <a className="btn btn-neutral btn-sm" href="/company-profile" target="_blank" rel="noreferrer">View page ↗</a>
      <button type="button" className="btn btn-neutral btn-sm" disabled={busy || !dirty} onClick={() => { setDraft(saved); setMsg(""); }}>Discard changes</button>
      <button type="button" className="btn btn-neutral btn-sm" disabled={busy} onClick={() => save(true)}>Reset to default</button>
      <button type="button" className="btn btn-sm" disabled={busy || !dirty} onClick={() => save()}>{busy ? "Saving…" : "Save"}</button>
      {msg && <span className="small-note" role="status">{msg}</span>}
    </div>

    {draft.sections.map((s, i) => <details key={s.id} className="cpe-section" open={open === s.id} onToggle={e => { if ((e.target as HTMLDetailsElement).open) setOpen(s.id); else if (open === s.id) setOpen(null); }}>
      <summary><span className="cpe-index">{String(i + 1).padStart(2, "0")}</span><strong>{s.title.en.replace(/\|/g, " ") || "Untitled section"}</strong>
        <small>{sectionKinds[s.kind].label}</small>{!s.enabled && <span className="cpe-off">Hidden</span>}</summary>
      <Tools what="section" i={i} n={draft.sections.length} move={(a, b) => setSections(moved(draft.sections, a, b))} remove={() => { if (confirm(`Remove the section “${s.title.en || "Untitled"}”?`)) setSections(draft.sections.filter((_, k) => k !== i)); }} />
      <SectionEditor s={s} onChange={v => setSections(at(draft.sections, i, v))} />
    </details>)}

    <div className="ce-group cpe-add">
      <label>New section type<select value={newKind} onChange={e => setNewKind(e.target.value as SectionKind)}>{(Object.keys(sectionKinds) as SectionKind[]).map(k => <option key={k} value={k}>{sectionKinds[k].label}</option>)}</select></label>
      <button type="button" className="btn btn-neutral btn-sm" onClick={() => { const s = blankSection(newKind); setSections([...draft.sections, s]); setOpen(s.id); }}>+ Add section</button>
      <small>New sections are added at the end. Move them with ↑ ↓ and press Save.</small>
    </div>
  </section>;
}
