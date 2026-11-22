const root = parent.document.documentElement;
const theme = document.querySelector('#theme');
function syncTheme() {
  const mode = root.dataset.appearance || 'system';
  theme.value = mode[0].toUpperCase() + mode.slice(1);
  theme.dispatchEvent(new Event('change'));
}
syncTheme();
new MutationObserver(syncTheme).observe(root, {attributes:true, attributeFilter:['data-appearance']});
if (root.lang === 'bn') {
  document.querySelectorAll('a[target="_top"]').forEach(link => link.pathname = '/bn' + link.pathname);
}
function fit() {
  if (window.frameElement) window.frameElement.style.height = Math.ceil(document.body.getBoundingClientRect().height) + 'px';
}
new ResizeObserver(fit).observe(document.body);
fit();

function revealStore() {
  const replay = document.getElementById('store-pop');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  replay.focus({preventScroll: true});
  replay.scrollIntoView({block: 'center', behavior: reduced ? 'instant' : 'smooth'});
  replay.click();
}
parent.addEventListener('oanro-show-home-store', revealStore);
window.addEventListener('pagehide', () => parent.removeEventListener('oanro-show-home-store', revealStore), {once: true});
