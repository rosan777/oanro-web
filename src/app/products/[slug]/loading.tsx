/** Product page placeholder in the same layout: photo on one side, details on the other. */
export default function Loading() {
  return <main id="main-content" className="container skeleton-page" aria-busy="true" aria-label="Loading">
    <div className="sk-product"><div className="sk sk-gallery" />
      <div><div className="sk sk-line sk-short" /><div className="sk sk-title" /><div className="sk sk-line" /><div className="sk sk-line" /><div className="sk sk-line sk-short" /><div className="sk sk-button" /></div>
    </div>
  </main>;
}
