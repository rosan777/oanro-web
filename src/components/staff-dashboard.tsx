"use client";
import { useState } from "react";
import { permissions, permissionInfo, type Permission } from "@/lib/permissions";
import type { StaffOverview } from "@/lib/rbac";
import { useAdminCall } from "./admin-ui";
import { formatDhaka } from "@/lib/dhaka-time";

const fieldLabel: Record<string, string> = { email: "Email", roleId: "Role", name: "Role name", userId: "Staff member" };
const extra: Record<string, string> = { OWNER_ONLY: "Only the owner can do this: edit roles, or give or change “Staff & roles”, report, profit or cost access.", ALREADY_STAFF: "That person is already the owner or a staff member.", INVALID_EMAIL: "Enter a valid email address.", ROLE_NOT_FOUND: "That role no longer exists. Refresh the page.", SELF_CHANGE: "You can't change your own access.", ROLE_IN_USE: "Move staff and pending invites off this role before deleting it.", INVALID_ROLE: "Role name is required (max 40 characters).", INVALID_PERMISSIONS: "Unknown permission selected." };

export function StaffDashboard({ initial, selfId }: { initial: StaffOverview; selfId: string }) {
  const [data, setData] = useState(initial);
  const { busy, notice, setNotice, call } = useAdminCall<StaffOverview>("/api/admin/staff", fieldLabel, setData);
  const [invite, setInvite] = useState({ email: "", roleId: "sales" });
  const [newRole, setNewRole] = useState<{ name: string; description: string; permissions: Permission[] } | null>(null);
  const [edits, setEdits] = useState<Record<string, Permission[]>>({});
  const roleName = (id: string) => data.roles.find(r => r.id === id)?.name ?? id;
  const run = async (method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>, ok: string) => {
    const done = await call(method, body, ok);
    if (!done) setNotice(n => { const code = Object.keys(extra).find(k => n.includes(k)); return code ? extra[code] : n; });
    return done;
  };
  const toggle = (list: Permission[], p: Permission) => list.includes(p) ? list.filter(x => x !== p) : [...list, p];

  return <div className="admin-sections staff-admin">
    <section><h2>People with admin access</h2>
      {data.owner && <div className="admin-section-row"><div><strong>{data.owner.name}</strong><small>{data.owner.email} · System owner — full access, can&apos;t be changed here</small></div></div>}
      {data.staff.length === 0 && <p>No staff yet. Invite someone below.</p>}
      <ul className="admin-product-list">{data.staff.map(s => <li key={s.userId} className="admin-section-row">
        <div><strong>{s.name}</strong><small>{s.email} · {s.status === "active" ? "Active" : <b className="stock-badge">Deactivated</b>}</small></div>
        <div className="admin-product-actions">
          <label className="sr-only" htmlFor={`role-${s.userId}`}>Role for {s.name}</label>
          <select id={`role-${s.userId}`} value={s.roleId} disabled={busy || s.userId === selfId} onChange={e => run("PATCH", { action: "role", userId: s.userId, roleId: e.target.value }, `${s.name} is now ${roleName(e.target.value)}.`)}>{data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          {s.userId !== selfId && <button type="button" disabled={busy} onClick={() => { if (s.status === "active" && !window.confirm(`Deactivate ${s.name}? They lose access and are signed out everywhere immediately.`)) return; void run("PATCH", { action: "active", userId: s.userId, active: s.status !== "active" }, s.status === "active" ? `${s.name} deactivated and signed out.` : `${s.name} reactivated.`); }}>{s.status === "active" ? "Deactivate" : "Reactivate"}</button>}
        </div></li>)}</ul>
    </section>

    <section><h2>Invite staff</h2>
      <form className="pulse-form product-form" onSubmit={async e => { e.preventDefault(); if (await run("POST", { action: "invite", ...invite }, `Invite saved for ${invite.email.trim()}.`)) setInvite(i => ({ ...i, email: "" })); }}>
        <div className="product-form-row"><label>Their email<input type="email" required maxLength={200} value={invite.email} disabled={busy} onChange={e => setInvite(i => ({ ...i, email: e.target.value }))} /></label>
          <label>Role<select value={invite.roleId} disabled={busy} onChange={e => setInvite(i => ({ ...i, roleId: e.target.value }))}>{data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>
        <small>Tell them to sign up at <b>/sign-in</b> with exactly this email. Once their email is verified, they get this role automatically. Invites expire after 14 days.</small>
        <div className="product-form-actions"><button className="button brand-button" disabled={busy}>Save invite</button></div>
      </form>
      {data.invites.length > 0 && <ul className="admin-product-list">{data.invites.map(i => <li key={i.id} className="admin-section-row"><div><strong>{i.email}</strong><small>Pending · {roleName(i.roleId)} · expires {formatDhaka(i.expiresAt, "en", { year: true, time: false })}</small></div><button type="button" disabled={busy} onClick={() => run("DELETE", { action: "invite", id: i.id }, `Invite for ${i.email} revoked.`)}>Revoke</button></li>)}</ul>}
    </section>

    <section><h2>Roles</h2><p>A role is a set of permissions. Changes apply immediately to everyone with that role.</p>
      {data.roles.map(r => { const current = edits[r.id] ?? r.permissions as Permission[]; const dirty = edits[r.id] !== undefined; return <details key={r.id} className="role-card"><summary><strong>{r.name}</strong> <small>{r.members} member{r.members === 1 ? "" : "s"} · {r.permissions.length} permission{r.permissions.length === 1 ? "" : "s"}{r.builtIn ? " · template" : ""}</small></summary>
        <p>{r.description}</p>
        <div className="permission-grid">{permissions.map(p => <label key={p} className={p === "staff.manage" ? "permission-sensitive" : ""}><input type="checkbox" checked={current.includes(p)} disabled={busy} onChange={() => setEdits(e => ({ ...e, [r.id]: toggle(current, p) }))} /><span><b>{permissionInfo[p].label}</b><small>{permissionInfo[p].detail}</small></span></label>)}</div>
        <div className="product-form-actions">
          <button type="button" className="button brand-button" disabled={busy || !dirty} onClick={async () => { if (await run("PATCH", { action: "role-permissions", roleId: r.id, permissions: current }, `${r.name} updated.`)) setEdits(e => { const n = { ...e }; delete n[r.id]; return n; }); }}>Save permissions</button>
          {dirty && <button type="button" className="button" disabled={busy} onClick={() => setEdits(e => { const n = { ...e }; delete n[r.id]; return n; })}>Undo</button>}
          {!r.builtIn && <button type="button" className="button" disabled={busy} onClick={() => { if (window.confirm(`Delete the role “${r.name}”?`)) void run("DELETE", { action: "role", roleId: r.id }, `${r.name} deleted.`); }}>Delete role</button>}
        </div>
      </details>; })}
      {!newRole ? <button type="button" className="button" onClick={() => setNewRole({ name: "", description: "", permissions: [] })}>+ Create a custom role</button>
        : <form className="pulse-form product-form" onSubmit={async e => { e.preventDefault(); if (await run("POST", { action: "role-create", ...newRole }, `Role ${newRole.name} created.`)) setNewRole(null); }}>
          <label>Role name<input required maxLength={40} value={newRole.name} disabled={busy} onChange={e => setNewRole(r => r && ({ ...r, name: e.target.value }))} /></label>
          <label>Description<input maxLength={200} value={newRole.description} disabled={busy} onChange={e => setNewRole(r => r && ({ ...r, description: e.target.value }))} /></label>
          <div className="permission-grid">{permissions.map(p => <label key={p}><input type="checkbox" checked={newRole.permissions.includes(p)} onChange={() => setNewRole(r => r && ({ ...r, permissions: toggle(r.permissions, p) }))} /><span><b>{permissionInfo[p].label}</b><small>{permissionInfo[p].detail}</small></span></label>)}</div>
          <div className="product-form-actions"><button className="button brand-button" disabled={busy}>Create role</button><button type="button" className="button" onClick={() => setNewRole(null)}>Cancel</button></div>
        </form>}
    </section>
    <p role="status" aria-live="polite">{notice}</p>
  </div>;
}
