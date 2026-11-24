/* Duct line (same behavior as 100-years-v2).
   1440 and up: the SVG keeps Figma's exact path ("Duct line" 28:2265).
   Below 1440: the path is redrawn from where the sections actually sit (like v2):
     a lane in the left margin from the air handler, then (≥1024) a center trunk between the chapter columns,
     back to the lane under the Decades band, and across into the outlet on the red band.
     Under 1024 there is no center trunk: the diffusers sit on the lane next to each era.
   Motion: the red run draws itself down to 65% of the viewport as you scroll, and each era's diffuser and branch
   switch on when the line reaches them. Reduced motion shows the finished line.
   Off whenever html.js is off (Playwright diff, ?static): then the static SVG shows at 1440 and is hidden below. */
(() => {
  const root = document.documentElement;
  if (!root.classList.contains('js')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const svg = document.querySelector('.duct');
  const run = svg && svg.querySelector('.run');
  if (!run) return;
  const layer = svg.parentElement;
  const route = svg.querySelector('.route');
  const ahu = svg.querySelector('.ahu');
  const nodes = [...svg.querySelectorAll('.node')];
  const branches = [...svg.querySelectorAll('.branch')];
  const lit = [...nodes, ...branches];
  const FIGMA_W = 1440;

  // the Figma geometry, to restore when the window grows back to 1440+
  const figma = {
    d: run.getAttribute('d'), tf: run.getAttribute('transform'),
    w: svg.getAttribute('width'), h: svg.getAttribute('height'), vb: svg.getAttribute('viewBox'),
    nodes: nodes.map(n => [n.getAttribute('transform'), n.dataset.y]),
    branches: branches.map(b => [b.getAttribute('d'), b.dataset.y]),
  };

  // page positions from offsets, so elements still rising in (data-reveal translate) don't shift the line
  const docTop = el => { let y = 0; for (; el; el = el.offsetParent) y += el.offsetTop; return y; };
  const docLeft = el => { let x = 0; for (; el; el = el.offsetParent) x += el.offsetLeft; return x; };

  // orthogonal route with rounded elbows, like a duct run on a plan (from v2)
  const elbow = (pts, r) => {
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
      if (!l1 || !l2) continue;
      const rr = Math.min(r, l1 / 2, l2 / 2);
      const ax = x1 - (x1 - x0) / l1 * rr, ay = y1 - (y1 - y0) / l1 * rr;
      const bx = x1 + (x2 - x1) / l2 * rr, by = y1 + (y2 - y1) / l2 * rr;
      d += ` L${ax} ${ay} Q${x1} ${y1} ${bx} ${by}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${last[0]} ${last[1]}`;
  };

  const useFigma = () => {
    layer.removeAttribute('style');
    svg.setAttribute('width', figma.w); svg.setAttribute('height', figma.h); svg.setAttribute('viewBox', figma.vb);
    for (const p of [run, route]) { p.setAttribute('d', figma.d); p.setAttribute('transform', figma.tf); }
    ahu.removeAttribute('transform');
    nodes.forEach((n, i) => { n.setAttribute('transform', figma.nodes[i][0]); n.dataset.y = figma.nodes[i][1]; });
    branches.forEach((b, i) => { b.setAttribute('d', figma.branches[i][0]); b.dataset.y = figma.branches[i][1]; b.style.display = ''; });
  };

  const useLayout = () => {
    Object.assign(layer.style, { left: '0', marginLeft: '0', width: '0', height: '0' });   // measure the page without the layer
    const W = root.clientWidth, H = root.scrollHeight;
    Object.assign(layer.style, { width: W + 'px', height: H + 'px' });
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const wide = W >= 1024;
    const head = document.querySelector('.decades .heading-row');
    const chapters = document.querySelector('.chapters');
    const chapterEls = [...document.querySelectorAll('.chapter')];
    const decades = document.querySelector('.decades');
    const next = document.querySelector('.next');
    const outlet = document.querySelector('.outlet');

    const gx = Math.round(docLeft(head) / 2);                         // lane in the left margin (70 at 1440)
    const y0 = Math.round(docTop(document.querySelector('.legacy .h2')) + 32);
    const [c1, c2] = chapterEls[0].children;
    const cx = wide ? Math.round((docLeft(c1) + c1.offsetWidth + docLeft(c2)) / 2) : gx;   // center trunk between the columns
    const yIn = Math.round((docTop(head) + head.offsetHeight + docTop(chapters)) / 2);
    const yOut = Math.round((docTop(chapters) + chapters.offsetHeight + docTop(decades) + decades.offsetHeight) / 2);
    const yNext = Math.round(docTop(next) - 60);
    const xOut = Math.round(outlet.getBoundingClientRect().left + scrollX + 48);   // <svg>: no offsetLeft; 96 wide, never transformed
    const yEnd = Math.round(docTop(next) + 2);

    const pts = [[gx, y0]];
    if (wide) pts.push([gx, yIn], [cx, yIn], [cx, yOut], [gx, yOut]);
    pts.push([gx, yNext], [xOut, yNext], [xOut, yEnd]);
    const d = elbow(pts, 28);
    for (const p of [run, route]) { p.setAttribute('d', d); p.removeAttribute('transform'); }
    ahu.setAttribute('transform', `translate(${gx - 70} ${y0 - 1154})`);   // the air handler is drawn around (70, 1154)

    const s = wide ? 1 : .75;
    chapterEls.forEach((ch, i) => {
      if (!nodes[i]) return;
      const ny = Math.round(docTop(ch.querySelector('.era')) + (wide ? 42 : 30));
      nodes[i].setAttribute('transform', `translate(${cx - 15 * s} ${ny - 15 * s}) scale(${s})`);
      nodes[i].dataset.y = ny;
      const toRight = docLeft(ch.querySelector('.chapter-text')) > cx;
      branches[i].setAttribute('d', `M${cx} ${ny}H${toRight ? cx + 42 : cx - 42}`);
      branches[i].dataset.y = ny;
      branches[i].style.display = wide ? '' : 'none';   // on the lane the text is too close for a branch
    });
  };

  let total = 0, samples = [];
  const build = () => {
    if (root.clientWidth >= FIGMA_W) useFigma(); else useLayout();
    root.classList.add('duct-live');   // responsive.css shows the layer below 1440 only once it is placed
    total = run.getTotalLength();
    const oy = run.transform.baseVal.consolidate()?.matrix.f || 0;   // Figma path is drawn with translate(70 1154)
    samples = [];
    for (let l = 0; l <= total; l += 6) samples.push([l, run.getPointAtLength(l).y + oy]);
    samples.push([total, run.getPointAtLength(total).y + oy]);
    if (!reduce) run.style.strokeDasharray = `${total} ${total}`;
    draw();
  };

  // the SVG layer starts at the top of the page, so page y = SVG y
  const draw = () => {
    if (reduce) return;
    const target = scrollY + innerHeight * 0.65 - (svg.getBoundingClientRect().top + scrollY);
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

  // re-place the line whenever the layout can have moved: resize, fonts, images, the menu or the reveals settling
  let rt;
  const rebuild = () => { clearTimeout(rt); rt = setTimeout(build, 150); };
  addEventListener('resize', rebuild);
  addEventListener('load', rebuild);
  if (document.fonts) document.fonts.ready.then(rebuild);
  new ResizeObserver(rebuild).observe(document.querySelector('main'));
  build();
})();
