/* Duct timeline (v2 frame: a center line through the Decades chapters, Figma "Duct line" 79:843).
   The SVG lives inside .chapters and uses the chapters' own coordinates.
   1440 and up: the SVG keeps Figma's exact geometry.
   Below 1440 it is redrawn from where the chapters actually sit:
     ≥1024 the line runs between the photo and text columns, branches point at the text;
     <1024 the chapters stack, so the line moves to the left gutter, diffusers sit next to each year, no branches.
   Motion (same as v1 / 100-years-v2): the red run draws itself down to 65% of the viewport as you scroll,
   a faint dotted route shows the way ahead, and each diffuser and branch switches on when the line reaches it.
   Reduced motion shows the finished line. Off whenever html.js is off (Playwright diff, ?static). */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('js')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = document.querySelector('.chapters > .duct');
  const run = svg && svg.querySelector('.run');
  if (!run) return;
  const chapters = svg.parentElement;
  const route = svg.querySelector('.route');
  const nodes = [...svg.querySelectorAll('.node')];
  const branches = [...svg.querySelectorAll('.branch')];
  const lit = [...nodes, ...branches];
  const FIGMA_W = 1440;

  // the Figma geometry, to restore when the window grows back to 1440+
  const figma = {
    d: run.getAttribute('d'),
    w: svg.getAttribute('width'), h: svg.getAttribute('height'), vb: svg.getAttribute('viewBox'),
    nodes: nodes.map(n => [n.getAttribute('transform'), n.dataset.y]),
    branches: branches.map(b => [b.getAttribute('d'), b.dataset.y]),
  };

  // positions inside .chapters from offsets, so elements still rising in (data-reveal translate) don't move the line
  const top = el => { let y = 0; for (; el && el !== chapters; el = el.offsetParent) y += el.offsetTop; return y; };
  const left = el => { let x = 0; for (; el && el !== chapters; el = el.offsetParent) x += el.offsetLeft; return x; };

  const useFigma = () => {
    svg.setAttribute('width', figma.w); svg.setAttribute('height', figma.h); svg.setAttribute('viewBox', figma.vb);
    svg.style.left = '';
    for (const p of [run, route]) p.setAttribute('d', figma.d);
    nodes.forEach((n, i) => { n.setAttribute('transform', figma.nodes[i][0]); n.dataset.y = figma.nodes[i][1]; });
    branches.forEach((b, i) => { b.setAttribute('d', figma.branches[i][0]); b.dataset.y = figma.branches[i][1]; b.style.display = ''; });
  };

  const useLayout = () => {
    const W = chapters.offsetWidth, H = chapters.offsetHeight;
    const wide = innerWidth >= 1024;
    const chapterEls = [...chapters.querySelectorAll('.chapter')];
    const s = wide ? 1 : .75;

    let cx, reach = 42;
    if (wide) {
      const [a, b] = chapterEls[0].children;
      const half = (left(b) - left(a) - a.offsetWidth) / 2;
      cx = Math.round(left(a) + a.offsetWidth + half);            // middle of the gap between the columns (580 at 1440)
      reach = Math.max(16, Math.min(42, Math.round(half - 22)));   // Figma: 42px branch, 22px short of the text
    } else {
      cx = -Math.round(chapters.offsetLeft / 2);                   // middle of the left gutter
    }
    // the SVG starts at the chapters' left edge; below 1024 the line sits left of it, so widen the box to the left
    const x0 = Math.min(0, cx - 30);
    svg.style.left = x0 + 'px';
    svg.setAttribute('width', W - x0); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `${x0} 0 ${W - x0} ${H}`);

    const ys = chapterEls.map((ch, i) => {
      const year = ch.querySelector('.era-year');
      const ny = Math.round(top(year) + year.offsetHeight / 2 + (wide ? 5 : 0));   // Figma sits the diffuser ~5px below the year's middle
      if (nodes[i]) {
        nodes[i].setAttribute('transform', `translate(${cx - 15 * s} ${ny - 15 * s}) scale(${s})`);
        nodes[i].dataset.y = ny;
      }
      if (branches[i]) {
        const toRight = left(ch.querySelector('.chapter-text')) > cx;
        branches[i].setAttribute('d', `M${cx} ${ny}H${toRight ? cx + reach : cx - reach}`);
        branches[i].dataset.y = ny;
        branches[i].style.display = wide ? '' : 'none';
      }
      return ny;
    });
    // like Figma: the line starts under the first diffuser and stops just past the last one's middle
    const d = `M${cx} ${ys[0] + 15 * s}V${ys[ys.length - 1] + 6}`;
    for (const p of [run, route]) p.setAttribute('d', d);
  };

  let total = 0, samples = [];
  const build = () => {
    if (root.clientWidth >= FIGMA_W) useFigma(); else useLayout();
    root.classList.add('duct-live');   // responsive.css shows the line below 1440 only once it is placed
    total = run.getTotalLength();
    samples = [];
    for (let l = 0; l <= total; l += 6) samples.push([l, run.getPointAtLength(l).y]);
    samples.push([total, run.getPointAtLength(total).y]);
    if (!reduce) run.style.strokeDasharray = `${total} ${total}`;
    draw();
  };

  // SVG y = distance from the top of .chapters
  const draw = () => {
    if (reduce) return;
    const target = innerHeight * 0.65 - svg.getBoundingClientRect().top;
    let len = 0;
    for (let i = 0; i < samples.length; i++) { if (samples[i][1] <= target) len = samples[i][0]; else break; }
    run.style.strokeDashoffset = total - len;
    lit.forEach(n => n.classList.toggle('is-on', +n.dataset.y <= target));
  };

  if (!reduce) root.classList.add('duct-anim');
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { draw(); ticking = false; });
  }, { passive: true });

  // re-place the line whenever the layout can have moved: resize, fonts, images, the reveals settling
  let rt;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(build, 150); };
  addEventListener('resize', rebuild);
  addEventListener('load', rebuild);
  if (document.fonts) document.fonts.ready.then(rebuild);
  new ResizeObserver(rebuild).observe(chapters);
  build();
})();
