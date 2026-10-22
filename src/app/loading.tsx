/** Shown instantly while a page loads: grey shapes in the page's layout instead of a blank screen. */
export default function Loading() {
  return <main id="main-content" className="container skeleton-page" aria-busy="true" aria-label="Loading">
    <div className="sk sk-title" /><div className="sk sk-line" /><div className="sk sk-line sk-short" />
    <div className="sk-grid">{Array.from({ length: 4 }, (_, i) => <div key={i} className="sk-card"><div className="sk sk-photo" /><div className="sk sk-line" /><div className="sk sk-line sk-short" /></div>)}</div>
  </main>;
}
