/* Menu panel below 1024px (responsive.css). Not motion: runs with or without html.js.
   The button opens and closes the nav, Escape and link clicks close it, and growing past 1023 resets it. */
(() => {
  const header = document.querySelector('.site-header');
  const btn = header && header.querySelector('.menu-btn');
  if (!btn) return;
  const nav = document.getElementById(btn.getAttribute('aria-controls'));

  const set = open => {
    header.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  btn.addEventListener('click', () => set(!header.classList.contains('is-open')));
  nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape' && header.classList.contains('is-open')) { set(false); btn.focus(); }
  });
  matchMedia('(min-width: 1024px)').addEventListener('change', e => { if (e.matches) set(false); });
})();
