/* Hero photo marquee. Copies the photo set before and after the original, then slides the track
   left by one set width per loop at a steady speed, so the loop has no visible seam.
   Same gate as duct.js: skipped for prefers-reduced-motion and when html.js is off (Playwright diff, ?static).
   Without it the strip is the static Figma layout. */
(() => {
  // same gate as motion-core: html.js is set by the head script (off for Playwright and ?static, on with ?motion)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !document.documentElement.classList.contains('js')) return;

  const track = document.querySelector('.hero-strip .track');
  if (!track) return;
  const SPEED = 40; // px per second

  const originals = [...track.children];
  const copy = () => originals.map(n => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; });
  track.prepend(...copy());
  track.append(...copy());

  const measure = () => {
    const set = originals[0].offsetLeft - track.children[0].offsetLeft; // one set incl. its trailing gap
    track.style.setProperty('--set', set + 'px');
    track.style.setProperty('--dur', (set / SPEED) + 's');
  };
  measure();
  document.documentElement.classList.add('marquee-anim');
  // pause while the strip is off screen: no need to keep a 15,000px layer moving out of view
  new IntersectionObserver(([e]) => { track.style.animationPlayState = e.isIntersecting ? 'running' : 'paused'; })
    .observe(track.parentElement);
  window.addEventListener('load', measure);
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 150); });   // photo size changes below 1440
})();
