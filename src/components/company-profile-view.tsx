// Draws the company profile from what is saved in Admin → Company profile. Server component (logos are drawn on the server).
import type { ReactNode } from "react";
import Link from "./locale-link";
import { pickBi, type CompanyProfile, type ProfileItem, type ProfileSection } from "@/lib/company-profile-data";
import { techLogo } from "@/lib/tech-logos";
import { ProfileIcon } from "./profile-icon";
import { Signature } from "./signature";

type T = (v: { en: string; bn: string }) => string;
const lines = (s: string) => s.split("\n").map(x => x.trim()).filter(Boolean);
const paras = (s: string) => s.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
const pad = (n: number) => String(n).padStart(2, "0");

function Head({ s, t, aside }: { s: ProfileSection; t: T; aside?: ReactNode }) {
  const eyebrow = t(s.eyebrow); const title = t(s.title);
  if (!eyebrow && !title && !aside) return null;
  return <header className="cp-head">
    <div>{eyebrow && <p className="cp-eyebrow">{eyebrow}</p>}{title && <h2 className="cp-h2">{title.replace(/\|/g, " ")}</h2>}</div>
    {aside}
  </header>;
}
const Strip = ({ s, t }: { s: ProfileSection; t: T }) => t(s.strip) ? <p className="cp-strip">{t(s.strip)}</p> : null;
const Bullets = ({ it, t }: { it: ProfileItem; t: T }) => { const l = lines(t(it.list)); return l.length ? <ul className="cp-dots">{l.map(x => <li key={x}>{x}</li>)}</ul> : null; };
const Ico = ({ name, size }: { name: string; size?: number }) => name ? <span className="cp-ico"><ProfileIcon name={name} size={size} /></span> : null;

function Section({ s, t, h1, email }: { s: ProfileSection; t: T; h1: boolean; email: string }) {
  const g = (i: number) => s.groups[i]?.items ?? [];
  const cls = `cp-sec cp-k-${s.kind}${s.dark ? " is-dark" : ""}`;
  switch (s.kind) {
    case "cover": {
      const [l1, l2] = t(s.title).split("|"); const Title = h1 ? "h1" : "h2";
      return <section className={cls} id={s.id} aria-label={t(s.title).replace(/\|/g, " ")}>
        <div className="cp-orbit" aria-hidden /><div className="cp-planet" aria-hidden />
        <div className="cp-cover-top"><span className="cp-wordmark">OAN<b>R</b>O</span>{t(s.eyebrow) && <span className="cp-eyebrow">{t(s.eyebrow)}</span>}</div>
        <div className="cp-cover-title"><Title>{l1}{l2 && <><br /><em>{l2}</em></>}</Title>{t(s.body) && <p className="cp-tagline">{t(s.body)}</p>}</div>
        {g(0).length > 0 && <div className="cp-focus">{g(0).map((it, i) => <div key={i}><Ico name={it.icon} /><strong>{t(it.title)}</strong></div>)}</div>}
        <Strip s={s} t={t} />
      </section>;
    }
    case "intro":
      return <section className={cls} id={s.id}><Head s={s} t={t} />
        <div className="cp-intro-grid">
          <div className="cp-prose">{paras(t(s.body)).map((p, i) => <p key={i} className={i === 0 ? "cp-lead" : ""}>{p}</p>)}</div>
          {g(0).length > 0 && <div className="cp-side">{g(0).map((it, i) => <div className="cp-card" key={i}><div className="cp-card-top"><Ico name={it.icon} /><h3>{t(it.title)}</h3></div>{t(it.text) && <p className="cp-muted">{t(it.text)}</p>}<Bullets it={it} t={t} /></div>)}</div>}
        </div>
        {g(1).length > 0 && <dl className="cp-facts">{g(1).map((it, i) => <div key={i}><dt>{t(it.title)}</dt><dd>{t(it.text)}</dd></div>)}</dl>}
        <Strip s={s} t={t} />{s.signature && <Signature />}
      </section>;
    case "cards": {
      const row = s.columns <= 2;
      return <section className={cls} id={s.id}><Head s={s} t={t} aside={t(s.body) ? <p className="cp-aside">{t(s.body)}</p> : undefined} />
        {g(1).length > 0 && <div className="cp-tags">{t(s.groups[1].title) && <p className="cp-eyebrow">{t(s.groups[1].title)}</p>}<ul>{g(1).map((it, i) => <li key={i}>{t(it.title)}</li>)}</ul></div>}
        <div className={`cp-cards${row ? " is-row" : ""}`} style={{ ["--cols" as string]: s.columns }}>{g(0).map((it, i) => <article className="cp-card" key={i}>
          <div className="cp-card-top"><Ico name={it.icon} />{g(0).length > 1 && <span className="cp-num">{pad(i + 1)}</span>}</div>
          <div className="cp-card-body"><h3>{t(it.title)}</h3>{t(it.text) && <p className="cp-muted">{t(it.text)}</p>}<Bullets it={it} t={t} /></div></article>)}</div>
        <Strip s={s} t={t} />{s.signature && <Signature />}
      </section>;
    }
    case "split":
      return <section className={cls} id={s.id}><Head s={s} t={t} />
        <div className="cp-split">
          <div className="cp-panel">{t(s.groups[0]?.title ?? { en: "", bn: "" }) && <h3>{t(s.groups[0].title)}</h3>}
            {paras(t(s.body)).map((p, i) => <p key={i}>{p}</p>)}{s.signature && <Signature className="cp-sign-dark" />}</div>
          <ol className="cp-rules">{g(0).map((it, i) => <li key={i}><span className="cp-num">{pad(i + 1)}</span><span>{t(it.title)}</span></li>)}</ol>
        </div>
        <Strip s={s} t={t} />
      </section>;
    case "groups":
      return <section className={cls} id={s.id}><Head s={s} t={t} aside={t(s.body) ? <p className="cp-aside">{t(s.body)}</p> : undefined} />
        <div className="cp-cols" style={{ ["--cols" as string]: s.columns }}>{s.groups.map((gr, gi) => <div className="cp-col" key={gi}>
          <p className="cp-col-head"><span>{pad(gi + 1)}</span>{t(gr.title)}</p>
          <ul>{gr.items.map((it, i) => <li key={i}><Ico name={it.icon} size={16} /><div><strong>{t(it.title)}</strong>{t(it.text) && <span>{t(it.text)}</span>}</div></li>)}</ul>
        </div>)}</div>
        <Strip s={s} t={t} />{s.signature && <Signature />}
      </section>;
    case "values":
      return <section className={cls} id={s.id}><Head s={s} t={t} />
        <div className="cp-values">{g(0).map((it, i) => <div key={i}><b aria-hidden>{t(it.title).charAt(0)}</b><h3>{t(it.title)}</h3><p className="cp-muted">{t(it.text)}</p></div>)}</div>
        <Strip s={s} t={t} />{s.signature && <Signature />}
      </section>;
    case "tech":
      return <section className={cls} id={s.id}><Head s={s} t={t} aside={t(s.body) ? <p className="cp-aside">{t(s.body)}</p> : undefined} />
        <div className="cp-cards" style={{ ["--cols" as string]: s.columns }}>{s.groups.map((gr, gi) => <div className="cp-card cp-techbox" key={gi}>
          <h3>{t(gr.title)}</h3>
          <ul>{gr.items.map((it, i) => { const logo = techLogo(it.logo); const name = t(it.title);
            return <li key={i}><span className="cp-logo">{logo ? <svg viewBox="0 0 24 24" aria-hidden><path fill={logo.color} d={logo.path} /></svg> : name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2)}</span>{name}</li>; })}</ul>
        </div>)}</div>
        <Strip s={s} t={t} />
      </section>;
    case "notice":
      return <section className={cls} id={s.id}>
        <div className="cp-notice-grid">
          <div className="cp-notice">
            {t(s.eyebrow) && <p className="cp-eyebrow">{t(s.eyebrow)}</p>}{t(s.title) && <h2 className="cp-h2">{t(s.title)}</h2>}
            <div className="cp-notice-box"><span className="cp-ico cp-ico-lg"><ProfileIcon name="lock" size={24} /></span>
              <div>{t(s.groups[0]?.title ?? { en: "", bn: "" }) && <h3>{t(s.groups[0].title)}</h3>}{paras(t(s.body)).map((p, i) => <p key={i} className="cp-muted">{p}</p>)}</div></div>
            {email && <p className="cp-mail"><ProfileIcon name="mail" size={16} /><span>{email}</span></p>}
          </div>
          {g(0).length > 0 && <ol className="cp-steps">{g(0).map((it, i) => <li key={i}><span className="cp-step-dot">{pad(i + 1)}</span><div><strong>{t(it.title)}</strong><span className="cp-muted">{t(it.text)}</span></div></li>)}</ol>}
        </div>
        <Strip s={s} t={t} />{s.signature && <Signature />}
      </section>;
    case "thanks": {
      const [l1, l2] = t(s.title).split("|");
      return <section className={cls} id={s.id}><div className="cp-planet cp-planet-corner" aria-hidden />
        {t(s.eyebrow) && <p className="cp-eyebrow">{t(s.eyebrow)}</p>}
        <h2 className="cp-thanks-title">{l1}{l2 && <><br /><em>{l2}</em></>}</h2>
        {t(s.body) && <p className="cp-lead cp-muted">{t(s.body)}</p>}
        {s.signature && <Signature className="cp-sign-dark" />}
        <div className="cp-cta"><Link href="/contact" className="cp-btn">Send us a message</Link>{email && <a href={`mailto:${email}`} className="cp-btn is-ghost">Email us · {email}</a>}</div>
        {g(0).length > 0 && <dl className="cp-contact">{g(0).map((it, i) => <div key={i}><dt>{t(it.title)}</dt><dd>{t(it.text)}</dd></div>)}</dl>}
        {g(1).length > 0 && <div className="cp-terms"><p className="cp-eyebrow">{t(s.groups[1].title)}</p><ol>{g(1).map((it, i) => <li key={i}>{t(it.title)}</li>)}</ol></div>}
        <Strip s={s} t={t} />
      </section>;
    }
  }
}

export function CompanyProfileView({ profile, locale, email }: { profile: CompanyProfile; locale: string; email: string }) {
  const t: T = v => pickBi(v, locale);
  const shown = profile.sections.filter(s => s.enabled);
  const coverIndex = shown.findIndex(s => s.kind === "cover");
  return <div className="cp">
    {coverIndex === -1 && <h1 className="sr-only">OANRO Company Profile</h1>}
    {shown.map((s, i) => <Section key={s.id} s={s} t={t} h1={i === coverIndex} email={email} />)}
  </div>;
}
